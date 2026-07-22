"""User portal: submit requests, view own requests, request deletion."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models import EcsTemplate, RequestStatus, ResourceRequest, User
from app.models.request import MAX_ACTIVE_REQUESTS_PER_USER
from app.schemas import RequestCreate, RequestOut
from app.services import crypto

router = APIRouter(prefix="/requests", tags=["requests"])

_ACTIVE = [RequestStatus.pending, RequestStatus.approved, RequestStatus.delete_pending]
_DETAIL_VISIBLE = (RequestStatus.approved, RequestStatus.delete_pending)


def _to_out(req: ResourceRequest) -> RequestOut:
    show_details = req.status in _DETAIL_VISIBLE
    return RequestOut(
        id=req.id,
        status=req.status.value,
        is_active=req.is_active,
        template=req.template,
        reject_reason=req.reject_reason if req.status == RequestStatus.rejected else None,
        instance_name=req.instance_name if show_details else None,
        public_ip=req.public_ip if show_details else None,
        private_ip=req.private_ip if show_details else None,
        password=crypto.decrypt(req.password) if (show_details and req.password) else None,
        submitted_at=req.submitted_at,
        resolved_at=req.resolved_at,
    )


def _active_count(db: Session, user_id: int) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(ResourceRequest)
            .where(ResourceRequest.user_id == user_id, ResourceRequest.status.in_(_ACTIVE))
        )
        or 0
    )


@router.get("/mine", response_model=list[RequestOut])
def my_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = db.scalars(
        select(ResourceRequest)
        .where(ResourceRequest.user_id == user.id)
        .order_by(ResourceRequest.submitted_at.desc())
    ).all()
    return [_to_out(r) for r in reqs]


@router.post("", response_model=RequestOut, status_code=201)
def create_request(
    payload: RequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.get(EcsTemplate, payload.template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    if _active_count(db, user.id) >= MAX_ACTIVE_REQUESTS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=(
                f"You have reached the maximum of {MAX_ACTIVE_REQUESTS_PER_USER} active "
                "requests. Delete an existing request to submit a new one."
            ),
        )
    req = ResourceRequest(user_id=user.id, template_id=template.id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return _to_out(req)


@router.post("/{request_id}/request-deletion", response_model=RequestOut)
def request_deletion(
    request_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.get(ResourceRequest, request_id)
    if req is None or req.user_id != user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != RequestStatus.approved:
        raise HTTPException(
            status_code=400, detail="Only approved resources can be requested for deletion"
        )
    req.status = RequestStatus.delete_pending
    db.commit()
    db.refresh(req)
    return _to_out(req)
