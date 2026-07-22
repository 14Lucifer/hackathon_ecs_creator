"""Admin overview of all active (approved) resources with credentials."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_admin
from app.models import RequestStatus, ResourceRequest
from app.schemas import ActiveResourceOut
from app.services import crypto

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
            password=crypto.decrypt(r.password) if r.password else None,
            submitted_at=r.submitted_at,
            resolved_at=r.resolved_at,
        )
        for r in reqs
    ]
