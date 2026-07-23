"""Approve / reject orchestration for resource and deletion requests."""
import re
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditAction, AuditLog, RequestStatus, ResourceRequest, User
from app.schemas.approval import ApprovalBatchResult, ApprovalItemResult
from app.services import aliyun_dns, aliyun_ecs, crypto
from app.services.password import generate_password
from app.services.settings_service import get_aliyun_config


def _sanitize_name(name: str) -> str:
    """Make a user display name safe for ECS instance names and DNS records.

    Lowercased and restricted to letters, digits and hyphens (runs of invalid
    characters collapse into a single hyphen) so the resulting
    <name>-<seq>.<domain> FQDN is a valid, consistently formatted hostname.
    """
    cleaned = re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-")
    cleaned = re.sub(r"-{2,}", "-", cleaned)
    if not cleaned or not cleaned[0].isalpha():
        cleaned = f"u-{cleaned}" if cleaned else "user"
    return cleaned[:80]


def _next_instance_name(db: Session, user: User) -> str:
    """`<user.name>-<seq>` — per-user sequence starting at 1 (DNS-safe)."""
    count = db.scalar(
        select(func.count())
        .select_from(ResourceRequest)
        .where(
            ResourceRequest.user_id == user.id,
            ResourceRequest.instance_name.is_not(None),
        )
    )
    return f"{_sanitize_name(user.name)}-{(count or 0) + 1}"


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
    domain_name: str,
    admin: User,
) -> ApprovalBatchResult:
    """Approve pending requests sequentially; partial success is allowed.

    Each request is committed independently so that earlier successes are
    preserved when a later ECS creation fails. After instance creation, an
    A record <instance-name>.<domain> is created pointing at the public IP
    (or private IP when the template has no public IP). If the DNS step
    fails, the just-created instance is rolled back (terminated) and the
    request stays pending.
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

            # DNS: public IP when enabled on the template, otherwise private IP
            record_ip = info["public_ip"] if req.template.public_ip_enabled else info["private_ip"]
            try:
                if not record_ip:
                    raise RuntimeError(
                        "Instance has no "
                        + ("public" if req.template.public_ip_enabled else "private")
                        + " IP address for the DNS A record."
                    )
                record_id = aliyun_dns.add_a_record(
                    cfg, domain_name=domain_name, rr=instance_name, ip=record_ip
                )
            except Exception as dns_exc:
                # Roll back the just-created instance; the request stays pending
                _rollback_instance(cfg, info["instance_id"])
                raise RuntimeError(
                    f"DNS A record creation failed ({dns_exc}); "
                    "the created instance was rolled back."
                ) from dns_exc

            req.status = RequestStatus.approved
            req.instance_id = info["instance_id"]
            req.instance_name = instance_name
            req.public_ip = info["public_ip"]
            req.private_ip = info["private_ip"]
            req.password = crypto.encrypt(password)
            req.vpc_id = vpc_id
            req.vswitch_id = vswitch_id
            req.security_group_id = security_group_id
            req.domain_name = domain_name
            req.fqdn = f"{instance_name}.{domain_name}"
            req.dns_record_id = record_id
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


def _rollback_instance(cfg, instance_id: str) -> None:
    """Best-effort termination of an instance whose approval failed mid-way."""
    try:
        aliyun_ecs.delete_instance(cfg, instance_id)
    except Exception:
        # Deletion may need a retry while the instance is still starting;
        # surface nothing here — the approval error already reports the cause.
        pass


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
    """Terminate the ECS instance and its DNS record, then mark the request deleted."""
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
            # Clean up the A record; a failure here must not block the deletion
            # (the instance is already gone) — report it as a warning instead.
            warning = None
            if req.dns_record_id:
                try:
                    aliyun_dns.delete_record(cfg, req.dns_record_id)
                except Exception as dns_exc:
                    warning = (
                        f"Instance terminated, but DNS record deletion failed: {dns_exc}. "
                        f"Remove {req.fqdn} manually in the Alibaba Cloud DNS console."
                    )
            req.status = RequestStatus.deleted
            req.resolved_at = datetime.utcnow()
            _log(db, AuditAction.approve, req, admin)
            db.commit()
            results.append(ApprovalItemResult(request_id=req_id, success=True, error=warning))
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


def remove_resources(
    db: Session, request_ids: list[int], remark: str | None, admin: User
) -> ApprovalBatchResult:
    """Admin-initiated removal of approved resources (no user deletion request).

    Terminates the instance and its DNS record, marks the request as
    removed_by_admin, and stores the optional remark where the user can see it.
    """
    cfg = get_aliyun_config(db)
    results: list[ApprovalItemResult] = []
    for req_id in request_ids:
        req = db.get(ResourceRequest, req_id)
        if req is None or req.status != RequestStatus.approved:
            results.append(
                ApprovalItemResult(
                    request_id=req_id,
                    success=False,
                    error="Request not found or not an active approved resource.",
                )
            )
            continue
        try:
            if req.instance_id:
                aliyun_ecs.delete_instance(cfg, req.instance_id)
            warning = None
            if req.dns_record_id:
                try:
                    aliyun_dns.delete_record(cfg, req.dns_record_id)
                except Exception as dns_exc:
                    warning = (
                        f"Instance terminated, but DNS record deletion failed: {dns_exc}. "
                        f"Remove {req.fqdn} manually in the Alibaba Cloud DNS console."
                    )
            req.status = RequestStatus.removed_by_admin
            req.reject_reason = (remark or "").strip() or None
            req.resolved_at = datetime.utcnow()
            _log(db, AuditAction.remove, req, admin, reason=req.reject_reason)
            db.commit()
            results.append(ApprovalItemResult(request_id=req_id, success=True, error=warning))
        except Exception as exc:
            db.rollback()
            results.append(ApprovalItemResult(request_id=req_id, success=False, error=str(exc)))

    succeeded = sum(1 for r in results if r.success)
    return ApprovalBatchResult(
        succeeded=succeeded, failed=len(results) - succeeded, results=results
    )
