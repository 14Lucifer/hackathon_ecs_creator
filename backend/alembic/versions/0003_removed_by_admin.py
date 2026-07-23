"""Add removed_by_admin status and remove audit action

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-23

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL 12+ allows ADD VALUE inside a transaction as long as the new
    # value is not used within the same transaction (we only add it here).
    op.execute("ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'removed_by_admin'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'remove'")


def downgrade() -> None:
    # PostgreSQL cannot drop enum values; leaving them in place is harmless.
    pass
