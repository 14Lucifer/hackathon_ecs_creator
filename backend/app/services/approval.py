"""Approve / reject orchestration for resource and deletion requests."""
import re
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditAction, AuditLog, RequestStatus, ResourceRequest, User
from app.schemas.approval import ApprovalBatchResult, ApprovalItemResult
from app.services import aliyun_ecs, crypto
from app.services.password import generate_password
from app.services.settings_service import get_aliyun_config


def _sanitize_name(name: str) -> str:
    """Make a user display name safe for use in an ECS instance name."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "-", name).strip("-.")
    if not cleaned or not cleaned[0].isalpha():
        cleaned = f"u-{cleaned}" if cleaned else "user"
    return cleaned[:80]


def _next_instance_name(db: Session, user: User) -> str:
    """`<user.name>_<seq>` — per-user sequence starting at 1."""
    count = db.scalar(
        select(func.count())
        .select_from(ResourceRequest)
        .where(
            ResourceRequest.user_id == user.id,
            ResourceRequest.instance_name.is_not(None),
        )
    )
    return f"{_sanitize_name(user.name)}_{(count or 0) + 1}"


def _log(db: Session, action: AuditAction, req: ResourceRequest, admin: User, reason=None):
    db.add(
        AuditLog(
            action=action,
            request_id=req.id,
            user_email=req.user.email,
            user_name=req.user.name,
            template_name=req.template.name,
            admin_name=admin.name,
            reject_reason=reason,
        )
    )


def approve_requests(
    db: Session,
    request_ids: list[int],
    vpc_id: str,
    vswitch_id: str,
    security_group_id: str,
    admin: User,
) -> ApprovalBatchResult:
    """Approve pending requests sequentially; partial success is allowed.

    Each request is committed independently so that earlier successes are
    preserved when a later ECS creation fails.
    """
    cfg = get_aliyun_config(db)
    results: list[ApprovalItemResult] = []

    for req_id in request_ids:
        req = db.get(ResourceRequest, req_id)
        if req is None or req.status != RequestStatus.pending:
            results.append(
                ApprovalItemResult(
                    request_id=req_id, success=False, error="Request not found or not pending."
                )
            )
            continue
        try:
            instance_name = _next_instance_name(db, req.user)
            password = generate_password()
            info = aliyun_ecs.create_instance(
                cfg,
                template=req.template,
                instance_name=instance_name,
                password=password,
                vswitch_id=vswitch_id,
                security_group_id=security_group_id,
            )
            req.status = RequestStatus.approved
            req.instance_id = info["instance_id"]
            req.instance_name = instance_name
            req.public_ip = info["public_ip"]
            req.private_ip = info["private_ip"]
            req.password = crypto.encrypt(password)
            req.vpc_id = vpc_id
            req.vswitch_id = vswitch_id
            req.security_group_id = security_group_id
            req.resolved_at = datetime.utcnow()
            _log(db, AuditAction.approve, req, admin)
            db.commit()
            results.append(
                ApprovalItemResult(
                    request_id=req_id, success=True, instance_id=info["instance_id"]
                )
            )
        except Exception as exc:  # keep processing the rest of the batch
            db.rollback()
            results.append(ApprovalItemResult(request_id=req_id, success=False, error=str(exc)))

    succeeded = sum(1 for r in results if r.success)
    return ApprovalBatchResult(
        succeeded=succeeded, failed=len(results) - succeeded, results=results
    )


def reject_requests(
    db: Session, request_ids: list[int], reason: str, admin: User
) -> ApprovalBatchResult:
    results: list[ApprovalItemResult] = []
    for req_id in request_ids:
        req = db.get(ResourceRequest, req_id)
        if req is None or req.status != RequestStatus.pending:
            results.append(
                ApprovalItemResult(
                    request_id=req_id, success=False, error="Request not found or not pending."
                )
            )
            continue
        req.status = RequestStatus.rejected
        req.reject_reason = reason
        req.resolved_at = datetime.utcnow()
        _log(db, AuditAction.reject, req, admin, reason=reason)
        db.commit()
        results.append(ApprovalItemResult(request_id=req_id, success=True))

    succeeded = sum(1 for r in results if r.success)
    return ApprovalBatchResult(
        succeeded=succeeded, failed=len(results) - succeeded, results=results
    )


def approve_deletions(db: Session, request_ids: list[int], admin: User) -> ApprovalBatchResult:
    """Terminate the ECS instance, then mark the request as deleted."""
    cfg = get_aliyun_config(db)
    results: list[ApprovalItemResult] = []
    for req_id in request_ids:
        req = db.get(ResourceRequest, req_id)
        if req is None or req.status != RequestStatus.delete_pending:
            results.append(
                ApprovalItemResult(
                    request_id=req_id,
                    success=False,
                    error="Request not found or not pending deletion.",
                )
            )
            continue
        try:
            if req.instance_id:
                aliyun_ecs.delete_instance(cfg, req.instance_id)
            req.status = RequestStatus.deleted
            req.resolved_at = datetime.utcnow()
            _log(db, AuditAction.approve, req, admin)
            db.commit()
            results.append(ApprovalItemResult(request_id=req_id, success=True))
        except Exception as exc:
            db.rollback()
            results.append(ApprovalItemResult(request_id=req_id, success=False, error=str(exc)))

    succeeded = sum(1 for r in results if r.success)
    return ApprovalBatchResult(
        succeeded=succeeded, failed=len(results) - succeeded, results=results
    )


def reject_deletions(db: Session, request_ids: list[int], admin: User) -> ApprovalBatchResult:
    """Deny the deletion — the request reverts to approved (instance kept)."""
    results: list[ApprovalItemResult] = []
    for req_id in request_ids:
        req = db.get(ResourceRequest, req_id)
        if req is None or req.status != RequestStatus.delete_pending:
            results.append(
                ApprovalItemResult(
                    request_id=req_id,
                    success=False,
                    error="Request not found or not pending deletion.",
                )
            )
            continue
        req.status = RequestStatus.approved
        _log(db, AuditAction.reject, req, admin, reason="Deletion request denied")
        db.commit()
        results.append(ApprovalItemResult(request_id=req_id, success=True))

    succeeded = sum(1 for r in results if r.success)
    return ApprovalBatchResult(
        succeeded=succeeded, failed=len(results) - succeeded, results=results
    )
