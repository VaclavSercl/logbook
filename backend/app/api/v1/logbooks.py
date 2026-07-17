"""Logbook routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import Logbook, Vessel
from app.schemas import LogbookCreate, LogbookResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("", response_model=list[LogbookResponse])
async def list_logbooks(
    vessel_id: UUID = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Logbook).join(Vessel).where(Vessel.owner_id == current_user.id)
    if vessel_id:
        query = query.where(Logbook.vessel_id == vessel_id)
    result = db.execute(query)
    return result.scalars().all()


@router.post("", response_model=LogbookResponse, status_code=201)
async def create_logbook(
    data: LogbookCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = Logbook(**data.model_dump())
    db.add(logbook)
    db.flush()
    return logbook


@router.get("/{logbook_id}", response_model=LogbookResponse)
async def get_logbook(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Logbook).where(Logbook.id == logbook_id))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    return logbook


@router.post("/{logbook_id}/close")
async def close_logbook(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime
    result = db.execute(select(Logbook).where(Logbook.id == logbook_id))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    logbook.status = "closed"
    logbook.closed_at = datetime.utcnow()
    return {"status": "closed"}
