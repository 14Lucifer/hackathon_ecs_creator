"""ECS template management (admin CRUD, user read-only listing)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user, require_admin
from app.models import EcsTemplate, RequestStatus, ResourceRequest
from app.models.template import MAX_TEMPLATES
from app.schemas import TemplateCreate, TemplateOut, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateOut], dependencies=[Depends(get_current_user)])
def list_templates(db: Session = Depends(get_db)):
    """Visible to every authenticated user (needed for the request form)."""
    return db.scalars(select(EcsTemplate).order_by(EcsTemplate.id)).all()


@router.post(
    "", response_model=TemplateOut, status_code=201, dependencies=[Depends(require_admin)]
)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(EcsTemplate)) or 0
    if count >= MAX_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Delete a template to create a new one (max {MAX_TEMPLATES}).",
        )
    template = EcsTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/{template_id}", response_model=TemplateOut, dependencies=[Depends(require_admin)])
def update_template(template_id: int, payload: TemplateUpdate, db: Session = Depends(get_db)):
    template = db.get(EcsTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in payload.model_dump().items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_template(template_id: int, db: Session = Depends(get_db)):
    template = db.get(EcsTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found")
    in_use = db.scalar(
        select(func.count())
        .select_from(ResourceRequest)
        .where(
            ResourceRequest.template_id == template_id,
            ResourceRequest.status.in_(
                [RequestStatus.pending, RequestStatus.approved, RequestStatus.delete_pending]
            ),
        )
    )
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="This template is referenced by active requests and cannot be deleted.",
        )
    db.delete(template)
    db.commit()
