"""Admin settings: Alibaba Cloud credentials, region, admin password change."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import invalidate_user_sessions, require_admin
from app.models import User
from app.models.settings import (
    ENCRYPTED_KEYS,
    KEY_ACCESS_KEY_ID,
    KEY_ACCESS_KEY_SECRET,
    KEY_API_ENDPOINT,
    KEY_REGION_ID,
)
from app.schemas import AdminPasswordChange, SettingsOut, SettingsUpdate
from app.services.password import hash_password, verify_password
from app.services.settings_service import get_setting, set_setting

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_admin)])

MASK = "****"


@router.get("", response_model=SettingsOut)
def get_system_settings(db: Session = Depends(get_db)):
    """AK/SK are never returned in plaintext — masked when set."""
    def masked(key: str) -> str:
        raw = get_setting(db, key, decrypt_value=False)
        return MASK if raw else ""

    return SettingsOut(
        api_endpoint=get_setting(db, KEY_API_ENDPOINT),
        access_key_id=masked(KEY_ACCESS_KEY_ID),
        access_key_secret=masked(KEY_ACCESS_KEY_SECRET),
        region_id=get_setting(db, KEY_REGION_ID),
    )


@router.put("", response_model=SettingsOut)
def update_system_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    updates = {
        KEY_API_ENDPOINT: payload.api_endpoint,
        KEY_ACCESS_KEY_ID: payload.access_key_id,
        KEY_ACCESS_KEY_SECRET: payload.access_key_secret,
        KEY_REGION_ID: payload.region_id,
    }
    for key, value in updates.items():
        if value is None:
            continue
        # Ignore the mask placeholder so an untouched field keeps its secret
        if key in ENCRYPTED_KEYS and value == MASK:
            continue
        set_setting(db, key, value.strip())
    db.commit()
    return get_system_settings(db)


@router.post("/admin-password")
def change_admin_password(
    payload: AdminPasswordChange,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    admin.password_hash = hash_password(payload.new_password)
    # Changing the password invalidates all existing admin sessions
    invalidate_user_sessions(db, admin.id)
    db.commit()
    return {"ok": True, "detail": "Password changed. Please log in again."}
