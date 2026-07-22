from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.template import TemplateOut


class RequestCreate(BaseModel):
    template_id: int


class RequestOut(BaseModel):
    """Request as seen by the requesting user.

    Instance details (IPs / password) are only populated for approved or
    delete_pending requests; pending requests expose no details.
    """

    id: int
    status: str
    is_active: bool
    template: TemplateOut
    reject_reason: Optional[str] = None
    instance_name: Optional[str] = None
    public_ip: Optional[str] = None
    private_ip: Optional[str] = None
    password: Optional[str] = None
    submitted_at: datetime
    resolved_at: Optional[datetime] = None


class ActiveResourceOut(BaseModel):
    """Approved (active) resource row for the admin overview."""

    id: int
    user_name: str
    user_email: str
    template_name: str
    instance_name: Optional[str] = None
    instance_id: Optional[str] = None
    public_ip: Optional[str] = None
    private_ip: Optional[str] = None
    password: Optional[str] = None
    submitted_at: datetime
    resolved_at: Optional[datetime] = None
