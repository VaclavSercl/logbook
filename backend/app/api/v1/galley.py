"""Galley management routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import GalleyDuty, Logbook
from app.schemas import GalleyDutyCreate, GalleyDutyResponse, GalleyDutyUpdate
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/schedule/{logbook_id}", response_model=list[GalleyDutyResponse])
async def list_galley_duties(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = db.query(Logbook).filter(Logbook.id == str(logbook_id)).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    result = db.execute(
        select(GalleyDuty)
        .where(GalleyDuty.logbook_id == str(logbook_id))
        .order_by(GalleyDuty.date.asc())
    )
    return result.scalars().all()


@router.post("/duty", response_model=GalleyDutyResponse, status_code=201)
async def create_galley_duty(
    data: GalleyDutyCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = db.query(Logbook).filter(Logbook.id == str(data.logbook_id)).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    duty = GalleyDuty(
        logbook_id=str(data.logbook_id),
        date=data.date,
        cook_id=str(data.cook_id),
        cleaner_id=str(data.cleaner_id),
        notes=data.notes
    )
    db.add(duty)
    db.commit()
    db.refresh(duty)
    return duty


@router.put("/duty/{duty_id}", response_model=GalleyDutyResponse)
async def update_galley_duty(
    duty_id: UUID,
    data: GalleyDutyUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    duty = db.query(GalleyDuty).filter(GalleyDuty.id == str(duty_id)).first()
    if not duty:
        raise HTTPException(status_code=404, detail="Galley duty not found")

    if data.date is not None:
        duty.date = data.date
    if data.cook_id is not None:
        duty.cook_id = str(data.cook_id)
    if data.cleaner_id is not None:
        duty.cleaner_id = str(data.cleaner_id)
    if data.notes is not None:
        duty.notes = data.notes

    db.commit()
    db.refresh(duty)
    return duty


@router.delete("/duty/{duty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_galley_duty(
    duty_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    duty = db.query(GalleyDuty).filter(GalleyDuty.id == str(duty_id)).first()
    if not duty:
        raise HTTPException(status_code=404, detail="Galley duty not found")

    logbook = db.query(Logbook).filter(Logbook.id == duty.logbook_id).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    vessel = db.query(Vessel).filter(Vessel.id == logbook.vessel_id).first()
    if not vessel or str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(duty)
    db.commit()
    return
