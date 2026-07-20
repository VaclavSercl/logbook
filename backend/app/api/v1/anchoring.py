"""Anchoring & Anchor Alarm routes."""
import math
from datetime import datetime, UTC
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import AnchorLog, Vessel, GpsPoint
from app.schemas import AnchorLogCreate, AnchorLogResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


def haversine_distance_meters(lat1, lon1, lat2, lon2):
    R = 6371000.0  # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/vessel/{vessel_id}/status")
async def get_anchor_status(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel = db.execute(select(Vessel).where(Vessel.id == str(vessel_id))).scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get active (dropped) anchor
    anchor = db.execute(
        select(AnchorLog)
        .where(AnchorLog.vessel_id == str(vessel_id))
        .where(AnchorLog.status == "dropped")
        .order_by(AnchorLog.dropped_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if not anchor:
        return {"is_anchored": False, "anchor": None, "current_distance_meters": 0.0, "alarm_triggered": False}

    # Get latest GPS position
    latest_gps = db.execute(
        select(GpsPoint)
        .where(GpsPoint.vessel_id == str(vessel_id))
        .order_by(GpsPoint.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()

    curr_dist = 0.0
    alarm_triggered = False
    if latest_gps:
        curr_dist = haversine_distance_meters(anchor.latitude, anchor.longitude, latest_gps.latitude, latest_gps.longitude)
        if anchor.alarm_radius and curr_dist > anchor.alarm_radius:
            alarm_triggered = True

    return {
        "is_anchored": True,
        "anchor": AnchorLogResponse.model_validate(anchor),
        "latest_gps": {"lat": latest_gps.latitude, "lng": latest_gps.longitude} if latest_gps else None,
        "current_distance_meters": round(curr_dist, 1),
        "alarm_triggered": alarm_triggered
    }


@router.post("/drop", response_model=AnchorLogResponse, status_code=201)
async def drop_anchor(
    data: AnchorLogCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel = db.execute(select(Vessel).where(Vessel.id == str(data.vessel_id))).scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Close any existing active anchor
    active_anchors = db.execute(
        select(AnchorLog).where(AnchorLog.vessel_id == str(data.vessel_id)).where(AnchorLog.status == "dropped")
    ).scalars().all()
    for a in active_anchors:
        a.status = "raised"
        a.raised_at = datetime.now(UTC)

    anchor = AnchorLog(
        vessel_id=str(data.vessel_id),
        status="dropped",
        latitude=data.latitude,
        longitude=data.longitude,
        depth=data.depth,
        chain_length=data.chain_length,
        alarm_radius=data.alarm_radius or 30.0,
        notes=data.notes,
        dropped_at=datetime.now(UTC)
    )
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return anchor


@router.post("/raise/{anchor_id}", status_code=status.HTTP_200_OK)
async def raise_anchor(
    anchor_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    anchor = db.execute(select(AnchorLog).where(AnchorLog.id == str(anchor_id))).scalar_one_or_none()
    if not anchor:
        raise HTTPException(status_code=404, detail="Anchor log not found")

    vessel = db.execute(select(Vessel).where(Vessel.id == anchor.vessel_id)).scalar_one_or_none()
    if not vessel or str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    anchor.status = "raised"
    anchor.raised_at = datetime.now(UTC)
    db.commit()
    return {"status": "raised"}
