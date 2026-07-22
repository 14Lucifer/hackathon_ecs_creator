from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    action: str
    request_id: int
    user_email: str
    user_name: str
    template_name: str
    admin_name: str
    reject_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
