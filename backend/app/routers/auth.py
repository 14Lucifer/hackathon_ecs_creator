from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import create_session, destroy_session, get_current_user
from app.models import User
from app.schemas import LoginRequest, SessionUser
from app.services.password import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionUser)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")
    create_session(db, user, response)
    return SessionUser(id=user.id, email=user.email, name=user.name, role=user.role.value)


@router.post("/logout")
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if session_token:
        destroy_session(db, session_token, response)
    return {"ok": True}


@router.get("/me", response_model=SessionUser)
def me(user: User = Depends(get_current_user)):
    return SessionUser(id=user.id, email=user.email, name=user.name, role=user.role.value)
