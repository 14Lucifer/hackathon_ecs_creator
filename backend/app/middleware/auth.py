"""Session-based authentication dependencies and helpers."""
import secrets
from datetime import datetime, timedelta

from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole, UserSession

SESSION_COOKIE = "session_token"


def create_session(db: Session, user: User, response: Response) -> str:
    """Create a server-side session and set the HttpOnly cookie."""
    ttl_hours = get_settings().session_ttl_hours
    token = secrets.token_hex(32)
    db.add(
        UserSession(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        )
    )
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=ttl_hours * 3600,
        path="/",
    )
    return token


def destroy_session(db: Session, token: str, response: Response) -> None:
    db.execute(delete(UserSession).where(UserSession.token == token))
    db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


def invalidate_user_sessions(db: Session, user_id: int) -> None:
    """Drop all sessions for a user (e.g., after a password change)."""
    db.execute(delete(UserSession).where(UserSession.user_id == user_id))


def get_current_user(
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = db.get(UserSession, session_token)
    if session is None or session.expires_at < datetime.utcnow():
        if session is not None:
            db.delete(session)
            db.commit()
        raise HTTPException(status_code=401, detail="Session expired")
    user = session.user
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
