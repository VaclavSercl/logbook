"""Logbook routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import Logbook, Vessel, WatchSchedule, GalleyDuty
from app.schemas import LogbookCreate, LogbookResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("", response_model=list[LogbookResponse])
async def list_logbooks(
    vessel_id: UUID = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_vessel_ids = [v.id for v in db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).all()]

    if vessel_id:
        query = select(Logbook).where(Logbook.vessel_id == str(vessel_id))
    else:
        query = select(Logbook).where(
            (Logbook.vessel_id.in_(user_vessel_ids)) | (Logbook.vessel_id == None)
        )
    result = db.execute(query)
    return result.scalars().all()


@router.post("", response_model=LogbookResponse, status_code=201)
async def create_logbook(
    data: LogbookCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dump = data.model_dump()
    vessel_id = dump.get("vessel_id")

    if vessel_id:
        v_id_str = str(vessel_id)
        dump["vessel_id"] = v_id_str
        vessel = db.query(Vessel).filter(Vessel.id == v_id_str).first()
        if vessel:
            dump["vessel_name"] = vessel.name
    else:
        # Check if user has an active vessel
        first_vessel = db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).first()
        if first_vessel:
            dump["vessel_id"] = first_vessel.id
            dump["vessel_name"] = first_vessel.name
        else:
            dump["vessel_id"] = None
            dump["vessel_name"] = "Archivní plavba"

    logbook = Logbook(**dump)
    db.add(logbook)
    db.commit()
    db.refresh(logbook)
    return logbook


@router.get("/{logbook_id}", response_model=LogbookResponse)
async def get_logbook(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
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
    from app.services.integrity_service import sign_logbook
    
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    
    try:
        signature = sign_logbook(str(logbook_id), db)
        logbook.closed_at = datetime.utcnow()
        return {"status": "closed", "signature": signature}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{logbook_id}/verify")
async def verify_logbook(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.integrity_service import verify_logbook_integrity
    
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
        
    verification = verify_logbook_integrity(str(logbook_id), db)
    return verification


@router.delete("/{logbook_id}")
async def delete_logbook(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    if logbook.vessel.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this logbook")

    db.execute(delete(WatchSchedule).where(WatchSchedule.logbook_id == str(logbook_id)))
    db.execute(delete(GalleyDuty).where(GalleyDuty.logbook_id == str(logbook_id)))
    db.delete(logbook)
    db.flush()
    return {"status": "deleted"}


@router.get("/public/list", response_model=list[dict])
async def list_public_logbooks(db: Session = Depends(get_db)):
    """List all active logbooks for public viewing (anonymous access)."""
    query = (
        select(Logbook, Vessel.name.label("vessel_name"))
        .join(Vessel)
        .where(Logbook.status == "active", Logbook.is_public == True)
        .order_by(Logbook.created_at.desc())
    )
    result = db.execute(query)
    logbooks_list = []
    for row in result:
        logbook = row[0]
        vessel_name = row[1]
        logbooks_list.append({
            "id": logbook.id,
            "vessel_id": logbook.vessel_id,
            "vessel_name": vessel_name,
            "title": logbook.title,
            "voyage_from": logbook.voyage_from,
            "voyage_to": logbook.voyage_to,
            "status": logbook.status,
            "is_public": logbook.is_public,
            "created_at": logbook.created_at.isoformat() if logbook.created_at else None
        })
    return logbooks_list


@router.get("/public/{logbook_id}", response_model=dict)
async def get_public_logbook(logbook_id: UUID, db: Session = Depends(get_db)):
    """Get single logbook details for public viewing."""
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")
    if not logbook.is_public:
        raise HTTPException(status_code=403, detail="This logbook is private")
    return {
        "id": logbook.id,
        "vessel_id": logbook.vessel_id,
        "vessel_name": logbook.vessel.name,
        "title": logbook.title,
        "voyage_from": logbook.voyage_from,
        "voyage_to": logbook.voyage_to,
        "status": logbook.status,
        "is_public": logbook.is_public
    }
