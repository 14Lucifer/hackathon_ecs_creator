"""Admin dashboard: aggregated metrics from the database."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_admin
from app.models import (
    AuditAction,
    AuditLog,
    EcsTemplate,
    RequestStatus,
    ResourceRequest,
    User,
    UserRole,
)
from app.models.template import MAX_TEMPLATES

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)])

# Statuses meaning "a running instance exists on the cloud"
_RUNNING = [RequestStatus.approved, RequestStatus.delete_pending]
CHART_DAYS = 14


class UserActiveCount(BaseModel):
    user_name: str
    user_email: str
    count: int


class DailyCount(BaseModel):
    date: str  # YYYY-MM-DD (UTC)
    count: int


class DashboardMetrics(BaseModel):
    active_instances: int
    pending_requests: int
    delete_pending_requests: int
    total_users: int
    active_users: int
    disabled_users: int
    templates_used: int
    max_templates: int
    total_requests: int
    rejected_requests: int
    removed_requests: int
    users_with_active: list[UserActiveCount]
    creations_per_day: list[DailyCount]
    generated_at: datetime


def _count_requests(db: Session, statuses: list[RequestStatus]) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(ResourceRequest)
            .where(ResourceRequest.status.in_(statuses))
        )
        or 0
    )


@router.get("/metrics", response_model=DashboardMetrics)
def dashboard_metrics(db: Session = Depends(get_db)):
    # --- request/instance counters -------------------------------------------
    active_instances = _count_requests(db, _RUNNING)
    pending = _count_requests(db, [RequestStatus.pending])
    delete_pending = _count_requests(db, [RequestStatus.delete_pending])
    rejected = _count_requests(db, [RequestStatus.rejected])
    removed = _count_requests(db, [RequestStatus.removed_by_admin])
    total_requests = (
        db.scalar(select(func.count()).select_from(ResourceRequest)) or 0
    )

    # --- users (normal accounts only) ----------------------------------------
    total_users = (
        db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.user)
        )
        or 0
    )
    active_users = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.role == UserRole.user, User.is_active.is_(True))
        )
        or 0
    )

    templates_used = db.scalar(select(func.count()).select_from(EcsTemplate)) or 0

    # --- users with active instances -----------------------------------------
    rows = db.execute(
        select(User.name, User.email, func.count())
        .join(ResourceRequest, ResourceRequest.user_id == User.id)
        .where(ResourceRequest.status.in_(_RUNNING))
        .group_by(User.id, User.name, User.email)
        .order_by(func.count().desc())
    ).all()
    users_with_active = [
        UserActiveCount(user_name=name, user_email=email, count=count)
        for name, email, count in rows
    ]

    # --- instance creations per day (zero-filled, last CHART_DAYS days) -------
    today = datetime.utcnow().date()
    start = today - timedelta(days=CHART_DAYS - 1)
    start_dt = datetime.combine(start, datetime.min.time())
    # Creation time = the FIRST 'approve' audit entry of a request that got an
    # instance. (resolved_at is overwritten by later deletions/removals, so it
    # cannot be used as the creation timestamp.)
    first_approve = (
        select(
            AuditLog.request_id.label("request_id"),
            func.min(AuditLog.created_at).label("created"),
        )
        .where(AuditLog.action == AuditAction.approve)
        .group_by(AuditLog.request_id)
        .subquery()
    )
    created_times = db.scalars(
        select(first_approve.c.created)
        .join(ResourceRequest, ResourceRequest.id == first_approve.c.request_id)
        .where(
            ResourceRequest.instance_name.is_not(None),
            first_approve.c.created >= start_dt,
        )
    ).all()
    per_day = {start + timedelta(days=i): 0 for i in range(CHART_DAYS)}
    for ts in created_times:
        day = ts.date()
        if day in per_day:
            per_day[day] += 1
    creations = [
        DailyCount(date=day.isoformat(), count=count)
        for day, count in sorted(per_day.items())
    ]

    return DashboardMetrics(
        active_instances=active_instances,
        pending_requests=pending,
        delete_pending_requests=delete_pending,
        total_users=total_users,
        active_users=active_users,
        disabled_users=total_users - active_users,
        templates_used=templates_used,
        max_templates=MAX_TEMPLATES,
        total_requests=total_requests,
        rejected_requests=rejected,
        removed_requests=removed,
        users_with_active=users_with_active,
        creations_per_day=creations,
        generated_at=datetime.utcnow(),
    )
