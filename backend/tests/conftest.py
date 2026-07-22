import os

# Must be set before app.database is imported (engine is created at import time)
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "admin123")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app, seed_admin
from app.models import User, UserRole
from app.services.password import hash_password

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database(monkeypatch):
    Base.metadata.create_all(bind=engine)
    # seed_admin in app.main uses the app SessionLocal; point it at the test DB
    monkeypatch.setattr("app.main.SessionLocal", TestingSessionLocal)
    seed_admin()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_client(client):
    resp = client.post(
        "/api/auth/login", json={"email": "admin@system.local", "password": "admin123"}
    )
    assert resp.status_code == 200, resp.text
    return client


def make_user(db, email="user@example.com", name="Alice", password="secret123"):
    user = User(
        email=email, name=name, password_hash=hash_password(password), role=UserRole.user
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_client(db):
    make_user(db)
    c = TestClient(app)
    resp = c.post("/api/auth/login", json={"email": "user@example.com", "password": "secret123"})
    assert resp.status_code == 200, resp.text
    return c
