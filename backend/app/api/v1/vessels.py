"""Vessel routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Vessel
from app.schemas import VesselCreate, VesselResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=list[VesselResponse])
async def list_vessels(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vessel).where(Vessel.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=VesselResponse, status_code=201)
async def create_vessel(
    data: VesselCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    vessel = Vessel(**data.model_dump(), owner_id=current_user.id)
    db.add(vessel)
    await db.flush()
    return vessel


@router.get("/{vessel_id}", response_model=VesselResponse)
async def get_vessel(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vessel).where(Vessel.id == vessel_id))
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel
