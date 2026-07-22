"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-23

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

user_role = sa.Enum("admin", "user", name="user_role")
request_status = sa.Enum(
    "pending", "approved", "rejected", "delete_pending", "deleted", name="request_status"
)
audit_action = sa.Enum("approve", "reject", name="audit_action")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "ecs_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("instance_type", sa.String(50), nullable=False),
        sa.Column("image_id", sa.String(100), nullable=False),
        sa.Column("system_disk_category", sa.String(50), nullable=False),
        sa.Column("system_disk_size_gb", sa.Integer(), nullable=False),
        sa.Column("public_ip_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "resource_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column(
            "template_id", sa.Integer(), sa.ForeignKey("ecs_templates.id"), nullable=False
        ),
        sa.Column("status", request_status, nullable=False),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("instance_id", sa.String(50), nullable=True),
        sa.Column("instance_name", sa.String(100), nullable=True),
        sa.Column("public_ip", sa.String(50), nullable=True),
        sa.Column("private_ip", sa.String(50), nullable=True),
        sa.Column("password", sa.String(255), nullable=True),
        sa.Column("vpc_id", sa.String(50), nullable=True),
        sa.Column("vswitch_id", sa.String(50), nullable=True),
        sa.Column("security_group_id", sa.String(50), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("action", audit_action, nullable=False),
        sa.Column(
            "request_id",
            sa.Integer(),
            sa.ForeignKey("resource_requests.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("user_name", sa.String(255), nullable=False),
        sa.Column("template_name", sa.String(100), nullable=False),
        sa.Column("admin_name", sa.String(255), nullable=False),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "sessions",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("sessions")
    op.drop_table("settings")
    op.drop_table("audit_logs")
    op.drop_table("resource_requests")
    op.drop_table("ecs_templates")
    op.drop_table("users")
    bind = op.get_bind()
    audit_action.drop(bind, checkfirst=True)
    request_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
