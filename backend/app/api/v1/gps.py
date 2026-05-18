"""GPS tracking routes."""
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import GpsPoint
from app.schemas import GpsPointCreate, GpsPointResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=GpsPointResponse, status_code=201)
async def add_gps_point(
    data: GpsPointCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    point = GpsPoint(**data.model_dump())
    db.add(point)
    await db.flush()
    return point


@router.get("/vessel/{vessel_id}", response_model=list[GpsPointResponse])
async def get_gps_track(
    vessel_id: UUID,
    start: datetime = None,
    end: datetime = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(GpsPoint).where(GpsPoint.vessel_id == vessel_id)
    if start:
        query = query.where(GpsPoint.timestamp >= start)
    if end:
        query = query.where(GpsPoint.timestamp <= end)
    query = query.order_by(GpsPoint.timestamp)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/vessel/{vessel_id}/latest", response_model=GpsPointResponse)
async def get_latest_position(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GpsPoint)
        .where(GpsPoint.vessel_id == vessel_id)
        .order_by(GpsPoint.timestamp.desc())
        .limit(1)
    )
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="No GPS data")
    return point
