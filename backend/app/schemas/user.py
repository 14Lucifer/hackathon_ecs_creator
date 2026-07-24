from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    # Running instances (approved or pending deletion) owned by this user
    active_resources: int = 0

    class Config:
        from_attributes = True


class BatchUploadResult(BaseModel):
    created: int
    updated: int
    errors: list[str]


class UserBatchStatus(BaseModel):
    user_ids: list[int] = Field(min_length=1)
    is_active: bool


class UserBatchStatusResult(BaseModel):
    updated: int
    not_found: int


class UserBatchDelete(BaseModel):
    user_ids: list[int] = Field(min_length=1)


class UserBatchDeleteResult(BaseModel):
    deleted: int
    skipped: list[str]  # human-readable reasons, e.g. "bob@x.com: has active resources"
