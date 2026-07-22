from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Well-known settings keys
KEY_API_ENDPOINT = "api_endpoint"
KEY_ACCESS_KEY_ID = "access_key_id"          # encrypted at rest
KEY_ACCESS_KEY_SECRET = "access_key_secret"  # encrypted at rest
KEY_REGION_ID = "region_id"

ENCRYPTED_KEYS = {KEY_ACCESS_KEY_ID, KEY_ACCESS_KEY_SECRET}
SETTING_KEYS = [KEY_API_ENDPOINT, KEY_ACCESS_KEY_ID, KEY_ACCESS_KEY_SECRET, KEY_REGION_ID]


class SystemSetting(Base):
    """Key/value store for global system settings."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
