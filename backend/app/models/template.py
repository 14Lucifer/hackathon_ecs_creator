from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

MAX_TEMPLATES = 6


class EcsTemplate(Base):
    __tablename__ = "ecs_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    instance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    image_id: Mapped[str] = mapped_column(String(100), nullable=False)
    system_disk_category: Mapped[str] = mapped_column(String(50), nullable=False)
    system_disk_size_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    public_ip_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
