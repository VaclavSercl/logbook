"""Module management routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Module
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[dict])
async def list_modules(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module))
    modules = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "name": m.name,
            "slug": m.slug,
            "version": m.version,
            "description": m.description,
            "icon": m.icon,
            "is_active": m.is_active,
            "is_installed": m.is_installed,
            "config": m.config,
        }
        for m in modules
    ]


@router.post("/{module_id}/install")
async def install_module(
    module_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    module.is_installed = True
    return {"status": "installed"}


@router.post("/{module_id}/activate")
async def activate_module(
    module_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    module.is_active = True
    return {"status": "activated"}


@router.post("/{module_id}/deactivate")
async def deactivate_module(
    module_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    module.is_active = False
    return {"status": "deactivated"}
