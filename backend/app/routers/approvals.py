"""Admin approval management: pending queues, approve/reject, network lookups."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_admin
from app.models import RequestStatus, ResourceRequest, User
from app.models.settings import KEY_REGION_ID
from app.schemas import ApprovalBatchResult, ApproveRequest, DeletionDecision, RejectRequest
from app.schemas.approval import PendingRequestOut
from app.services import approval as approval_service
from app.services import aliyun_vpc
from app.services.settings_service import get_aliyun_config, get_setting

router = APIRouter(
    prefix="/approvals", tags=["approvals"], dependencies=[Depends(require_admin)]
)


def _to_pending(req: ResourceRequest) -> PendingRequestOut:
    return PendingRequestOut(
        id=req.id,
        user_name=req.user.name,
        user_email=req.user.email,
        template_name=req.template.name,
        status=req.status.value,
        submitted_at=req.submitted_at,
    )


def _list_by_status(db: Session, status: RequestStatus) -> list[PendingRequestOut]:
    reqs = db.scalars(
        select(ResourceRequest)
        .where(ResourceRequest.status == status)
        .order_by(ResourceRequest.submitted_at)
    ).all()
    return [_to_pending(r) for r in reqs]


@router.get("/pending", response_model=list[PendingRequestOut])
def pending_requests(db: Session = Depends(get_db)):
    return _list_by_status(db, RequestStatus.pending)


@router.get("/delete-pending", response_model=list[PendingRequestOut])
def delete_pending_requests(db: Session = Depends(get_db)):
    return _list_by_status(db, RequestStatus.delete_pending)


@router.get("/region")
def approval_region(db: Session = Depends(get_db)):
    """Region shown read-only in step 1 of the approval cascade."""
    return {"region_id": get_setting(db, KEY_REGION_ID)}


# --- Network lookups for the cascading approval modal -----------------------

@router.get("/network/vpcs")
def fetch_vpcs(db: Session = Depends(get_db)):
    return _call_aliyun(lambda: aliyun_vpc.list_vpcs(get_aliyun_config(db)))


@router.get("/network/vswitches")
def fetch_vswitches(vpc_id: str, db: Session = Depends(get_db)):
    return _call_aliyun(lambda: aliyun_vpc.list_vswitches(get_aliyun_config(db), vpc_id))


@router.get("/network/security-groups")
def fetch_security_groups(vpc_id: str, db: Session = Depends(get_db)):
    return _call_aliyun(lambda: aliyun_vpc.list_security_groups(get_aliyun_config(db), vpc_id))


def _call_aliyun(fn):
    try:
        return fn()
    except ValueError as exc:  # missing configuration
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # Alibaba Cloud API error
        raise HTTPException(status_code=502, detail=f"Alibaba Cloud API error: {exc}")


# --- Approve / reject --------------------------------------------------------

@router.post("/approve", response_model=ApprovalBatchResult)
def approve(
    payload: ApproveRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return approval_service.approve_requests(
            db,
            request_ids=payload.request_ids,
            vpc_id=payload.vpc_id,
            vswitch_id=payload.vswitch_id,
            security_group_id=payload.security_group_id,
            admin=admin,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/reject", response_model=ApprovalBatchResult)
def reject(
    payload: RejectRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return approval_service.reject_requests(db, payload.request_ids, payload.reason, admin)


@router.post("/deletions/approve", response_model=ApprovalBatchResult)
def approve_deletion(
    payload: DeletionDecision,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        return approval_service.approve_deletions(db, payload.request_ids, admin)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/deletions/reject", response_model=ApprovalBatchResult)
def reject_deletion(
    payload: DeletionDecision,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return approval_service.reject_deletions(db, payload.request_ids, admin)
