"""Geofencing management and boundary alerts API."""
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import GeofenceZone, Logbook
from app.schemas import GeofenceZoneCreate, GeofenceZoneResponse
from app.api.v1.auth import get_current_user
from app.services.geofence_service import evaluate_active_geofences

router = APIRouter()


@router.post("/zones", response_model=GeofenceZoneResponse, status_code=201)
async def create_geofence_zone(
    data: GeofenceZoneCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new circular or polygonal geofence zone."""
    result = db.execute(select(Logbook).where(Logbook.id == str(data.logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    # Validate inputs based on zone type definition
    if data.polygon_coordinates is None:
        if data.latitude is None or data.longitude is None or data.radius is None:
            raise HTTPException(
                status_code=400,
                detail="Circular zones require latitude, longitude, and radius parameters."
            )
    else:
        if len(data.polygon_coordinates) < 3:
            raise HTTPException(
                status_code=400,
                detail="Polygonal zones require at least 3 coordinates."
            )

    zone_id = str(uuid4())
    zone = GeofenceZone(
        id=zone_id,
        logbook_id=str(data.logbook_id),
        name=data.name,
        zone_type=data.zone_type,
        latitude=data.latitude,
        longitude=data.longitude,
        radius=data.radius,
        polygon_coordinates=data.polygon_coordinates,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(zone)
    db.commit()

    return zone


@router.get("/zones/{logbook_id}", response_model=list[GeofenceZoneResponse])
async def list_geofence_zones(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all geofence perimeters configured for a logbook."""
    result = db.execute(
        select(GeofenceZone)
        .where(GeofenceZone.logbook_id == str(logbook_id))
        .order_by(GeofenceZone.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/zones/{zone_id}")
async def delete_geofence_zone(
    zone_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a geofence perimeter."""
    result = db.execute(select(GeofenceZone).where(GeofenceZone.id == str(zone_id)))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Geofence zone not found")

    db.delete(zone)
    db.commit()
    return {"status": "deleted"}


@router.post("/zones/{zone_id}/toggle", response_model=GeofenceZoneResponse)
async def toggle_geofence_zone(
    zone_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle the activation status of a geofence zone."""
    result = db.execute(select(GeofenceZone).where(GeofenceZone.id == str(zone_id)))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Geofence zone not found")

    zone.is_active = not zone.is_active
    db.commit()
    return zone


@router.get("/verify-position/{logbook_id}")
async def verify_position(
    logbook_id: UUID,
    lat: float,
    lng: float,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluate the given GPS coordinate against all active geofences of the logbook.
    Returns a list of triggered alerts/notifications.
    """
    alerts = evaluate_active_geofences(str(logbook_id), lat, lng, db)
    return {"alerts": alerts}
