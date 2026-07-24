"""Admin overview of all active (approved) resources with credentials."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_admin
from app.models import RequestStatus, ResourceRequest, User
from app.schemas import ActiveResourceOut
from app.schemas.approval import ApprovalBatchResult
from app.services import crypto
from app.services import approval as approval_service

router = APIRouter(
    prefix="/active-resources", tags=["active-resources"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=list[ActiveResourceOut])
def list_active_resources(db: Session = Depends(get_db)):
    reqs = db.scalars(
        select(ResourceRequest)
        .where(ResourceRequest.status == RequestStatus.approved)
        .order_by(ResourceRequest.resolved_at.desc())
    ).all()
    return [
        ActiveResourceOut(
            id=r.id,
            user_name=r.user.name,
            user_email=r.user.email,
            template_name=r.template.name,
            instance_name=r.instance_name,
            instance_id=r.instance_id,
            public_ip=r.public_ip,
            private_ip=r.private_ip,
            fqdn=r.fqdn,
            password=crypto.decrypt(r.password) if r.password else None,
            submitted_at=r.submitted_at,
            resolved_at=r.resolved_at,
        )
        for r in reqs
    ]


class RemoveResourceIn(BaseModel):
    remark: Optional[str] = None  # optional; shown to the user when provided


class BatchRemoveIn(BaseModel):
    request_ids: list[int] = Field(min_length=1)
    remark: Optional[str] = None  # one shared remark applied to every resource


@router.post("/batch-remove", response_model=ApprovalBatchResult)
def batch_remove_resources(
    payload: BatchRemoveIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Terminate several approved resources sequentially (partial success allowed)."""
    try:
        return approval_service.remove_resources(
            db, payload.request_ids, payload.remark, admin
        )
    except ValueError as exc:  # missing Alibaba Cloud configuration
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{request_id}/remove", response_model=ApprovalBatchResult)
def remove_resource(
    request_id: int,
    payload: RemoveResourceIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Terminate an approved resource directly (status becomes removed_by_admin)."""
    try:
        return approval_service.remove_resources(db, [request_id], payload.remark, admin)
    except ValueError as exc:  # missing Alibaba Cloud configuration
        raise HTTPException(status_code=400, detail=str(exc))
