"""Vessel routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import Vessel, GpsPoint
from app.schemas import VesselCreate, VesselResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("", response_model=list[VesselResponse])
async def list_vessels(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(Vessel).where(Vessel.owner_id == str(current_user.id))
    )
    return result.scalars().all()


@router.post("", response_model=VesselResponse, status_code=201)
async def create_vessel(
    data: VesselCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel = Vessel(**data.model_dump(), owner_id=str(current_user.id))
    db.add(vessel)
    db.flush()
    return vessel


@router.get("/{vessel_id}", response_model=VesselResponse)
async def get_vessel(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel


@router.put("/{vessel_id}", response_model=VesselResponse)
async def update_vessel(
    vessel_id: UUID,
    data: VesselCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if vessel.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this vessel")
    
    for key, value in data.model_dump().items():
        setattr(vessel, key, value)
    
    db.flush()
    return vessel


@router.delete("/{vessel_id}")
async def delete_vessel(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if vessel.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this vessel")
    
    # Preserve all historical logbooks permanently by unlinking vessel_id and saving vessel_name
    from app.models import Logbook
    logbooks = db.query(Logbook).filter(Logbook.vessel_id == str(vessel_id)).all()
    for lb in logbooks:
        if not lb.vessel_name:
            lb.vessel_name = vessel.name
        lb.vessel_id = None

    # Delete GPS points associated with vessel
    db.execute(delete(GpsPoint).where(GpsPoint.vessel_id == str(vessel_id)))
    
    db.delete(vessel)
    db.flush()
    return {"status": "deleted"}
