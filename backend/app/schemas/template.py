from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DiskCategory = Literal["cloud_essd", "cloud_ssd", "cloud_efficiency"]


class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    instance_type: str = Field(min_length=1, max_length=50)
    image_id: str = Field(min_length=1, max_length=100)
    system_disk_category: DiskCategory
    system_disk_size_gb: int = Field(ge=20, le=32768)
    public_ip_enabled: bool = False


class TemplateUpdate(TemplateCreate):
    pass


class TemplateOut(BaseModel):
    id: int
    name: str
    instance_type: str
    image_id: str
    system_disk_category: str
    system_disk_size_gb: int
    public_ip_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
