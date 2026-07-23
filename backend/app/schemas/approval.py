from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PendingRequestOut(BaseModel):
    id: int
    user_name: str
    user_email: str
    template_name: str
    status: str
    submitted_at: datetime


class ApproveRequest(BaseModel):
    request_ids: list[int] = Field(min_length=1)
    vpc_id: str = Field(min_length=1)
    vswitch_id: str = Field(min_length=1)
    security_group_id: str = Field(min_length=1)
    domain_name: str = Field(min_length=1)


class RejectRequest(BaseModel):
    request_ids: list[int] = Field(min_length=1)
    reason: str = Field(min_length=1)


class ApprovalItemResult(BaseModel):
    request_id: int
    success: bool
    error: Optional[str] = None
    instance_id: Optional[str] = None


class ApprovalBatchResult(BaseModel):
    succeeded: int
    failed: int
    results: list[ApprovalItemResult]


class DeletionDecision(BaseModel):
    request_ids: list[int] = Field(min_length=1)
