"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import User, UserRole
from app.routers import (
    active_resources,
    approvals,
    audit,
    auth,
    requests,
    settings as settings_router,
    templates,
    users,
)
from app.services.password import hash_password

ADMIN_EMAIL = "admin@system.local"


def seed_admin() -> None:
    """Create the single admin account on first boot."""
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if existing is None:
            db.add(
                User(
                    email=ADMIN_EMAIL,
                    name="Administrator",
                    password_hash=hash_password(get_settings().default_admin_password),
                    role=UserRole.admin,
                )
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_admin()
    yield


app = FastAPI(title="ECS Resource Request & Approval System", lifespan=lifespan)

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(templates.router, prefix=API_PREFIX)
app.include_router(requests.router, prefix=API_PREFIX)
app.include_router(approvals.router, prefix=API_PREFIX)
app.include_router(active_resources.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)
app.include_router(settings_router.router, prefix=API_PREFIX)


@app.get("/api/health")
def health():
    return {"status": "ok"}
