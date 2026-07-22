import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# A request counts toward the per-user active limit while in one of these states
ACTIVE_STATUSES = ("pending", "approved", "delete_pending")
MAX_ACTIVE_REQUESTS_PER_USER = 2


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    delete_pending = "delete_pending"
    deleted = "deleted"


class ResourceRequest(Base):
    __tablename__ = "resource_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("ecs_templates.id"), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status"), nullable=False, default=RequestStatus.pending
    )
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instance_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instance_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    public_ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    private_ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # AES-256 encrypted at rest; decrypted only when returned to authorized viewers
    password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vswitch_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    security_group_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user = relationship("User", lazy="joined")
    template = relationship("EcsTemplate", lazy="joined")

    @property
    def is_active(self) -> bool:
        return self.status.value in ACTIVE_STATUSES
