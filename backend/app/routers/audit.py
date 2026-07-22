"""Read-only audit log of all approval/rejection actions."""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_admin
from app.models import AuditAction, AuditLog
from app.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    action: Optional[AuditAction] = None,
    order: str = "desc",
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(
        AuditLog.created_at.asc() if order == "asc" else AuditLog.created_at.desc()
    )
    return db.scalars(stmt).all()
