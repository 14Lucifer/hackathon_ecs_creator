"""Read/write helpers for the global settings table.

AK/SK values are stored encrypted (AES-256); this module transparently
encrypts on write and decrypts on read for internal consumers.
"""
from sqlalchemy.orm import Session

from app.models.settings import ENCRYPTED_KEYS, SystemSetting
from app.services import crypto


def get_setting(db: Session, key: str, decrypt_value: bool = True) -> str:
    row = db.get(SystemSetting, key)
    if row is None or not row.value:
        return ""
    if decrypt_value and key in ENCRYPTED_KEYS:
        return crypto.decrypt(row.value)
    return row.value


def set_setting(db: Session, key: str, value: str) -> None:
    stored = crypto.encrypt(value) if (value and key in ENCRYPTED_KEYS) else (value or "")
    row = db.get(SystemSetting, key)
    if row is None:
        row = SystemSetting(key=key, value=stored)
        db.add(row)
    else:
        row.value = stored


class AliyunConfig:
    def __init__(self, endpoint: str, access_key_id: str, access_key_secret: str, region_id: str):
        self.endpoint = endpoint
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.region_id = region_id


def get_aliyun_config(db: Session) -> AliyunConfig:
    """Load Alibaba Cloud credentials/region from settings; raise if incomplete."""
    cfg = AliyunConfig(
        endpoint=get_setting(db, "api_endpoint"),
        access_key_id=get_setting(db, "access_key_id"),
        access_key_secret=get_setting(db, "access_key_secret"),
        region_id=get_setting(db, "region_id"),
    )
    if not (cfg.access_key_id and cfg.access_key_secret and cfg.region_id):
        raise ValueError(
            "Alibaba Cloud credentials are not configured. "
            "Set Access Key ID, Access Key Secret and Region ID in Settings."
        )
    return cfg
