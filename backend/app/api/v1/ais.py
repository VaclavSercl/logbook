"""AIS target management and collision warning API."""
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import AisTarget, Logbook, GpsPoint
from app.schemas import AisTargetCreate, AisTargetResponse
from app.api.v1.auth import get_current_user
from app.services.collision_service import calculate_cpa_tcpa

router = APIRouter()


@router.post("/targets", response_model=AisTargetResponse, status_code=201)
async def report_ais_target(
    data: AisTargetCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Report a new AIS target detected by the mobile client.
    Computes CPA/TCPA and determines collision risk before saving.
    """
    # 1. Fetch logbook to find the vessel
    result = db.execute(select(Logbook).where(Logbook.id == str(data.logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    # 2. Get our vessel's latest GPS position
    gps_result = db.execute(
        select(GpsPoint)
        .where(GpsPoint.vessel_id == logbook.vessel_id)
        .order_by(GpsPoint.timestamp.desc())
        .limit(1)
    )
    latest_gps = gps_result.scalar_one_or_none()

    # 3. Calculate CPA/TCPA if our position is available
    cpa = None
    tcpa = None
    is_danger = False

    if latest_gps:
        cpa, tcpa = calculate_cpa_tcpa(
            lat1=latest_gps.latitude,
            lng1=latest_gps.longitude,
            speed1=latest_gps.speed or 0.0,
            course1=latest_gps.course or 0.0,
            lat2=data.latitude,
            lng2=data.longitude,
            speed2=data.speed or 0.0,
            course2=data.course or 0.0
        )
        # Collision warning threshold: CPA < 1.0 Nautical Mile and TCPA under 20 minutes
        if cpa is not None and cpa < 1.0 and tcpa is not None and 0.0 <= tcpa <= 20.0:
            is_danger = True

    # 4. Save to DB
    target_id = str(uuid4())
    ais_target = AisTarget(
        id=target_id,
        logbook_id=str(data.logbook_id),
        mmsi=data.mmsi,
        name=data.name,
        call_sign=data.call_sign,
        ship_type=data.ship_type,
        latitude=data.latitude,
        longitude=data.longitude,
        speed=data.speed,
        course=data.course,
        heading=data.heading,
        cpa=cpa,
        tcpa=tcpa,
        is_danger=is_danger,
        timestamp=datetime.utcnow()
    )
    db.add(ais_target)
    db.commit()

    return ais_target


@router.get("/targets/{logbook_id}", response_model=list[AisTargetResponse])
async def get_ais_targets(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all AIS targets recorded for a given logbook."""
    result = db.execute(
        select(AisTarget)
        .where(AisTarget.logbook_id == str(logbook_id))
        .order_by(AisTarget.timestamp.desc())
    )
    return result.scalars().all()
