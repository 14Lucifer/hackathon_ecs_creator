from typing import Optional

from pydantic import BaseModel, Field


class SettingsOut(BaseModel):
    api_endpoint: str = ""
    access_key_id: str = ""      # masked as **** when set
    access_key_secret: str = ""  # masked as **** when set
    region_id: str = ""


class SettingsUpdate(BaseModel):
    api_endpoint: Optional[str] = None
    access_key_id: Optional[str] = None
    access_key_secret: Optional[str] = None
    region_id: Optional[str] = None


class AdminPasswordChange(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)
