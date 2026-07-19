"""AI routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import GpsPoint, Logbook
from app.schemas import AiGenerateRequest, AiGenerateResponse
from app.api.v1.auth import get_current_user
from app.services.ai_service import generate_narrative_from_gps

router = APIRouter()


@router.post("/generate-entry", response_model=AiGenerateResponse)
async def generate_entry(
    data: AiGenerateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI log entry from GPS and weather data."""
    # Get logbook to obtain vessel_id
    result = db.execute(select(Logbook).where(Logbook.id == str(data.logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    # Get GPS points for the time range using the logbook's vessel_id
    query = select(GpsPoint).where(GpsPoint.vessel_id == logbook.vessel_id)
    if data.start_time:
        query = query.where(GpsPoint.timestamp >= data.start_time)
    if data.end_time:
        query = query.where(GpsPoint.timestamp <= data.end_time)
    query = query.order_by(GpsPoint.timestamp)

    result = db.execute(query)
    gps_points = result.scalars().all()

    if not gps_points:
        raise HTTPException(status_code=404, detail="No GPS data for the specified time range")

    # Calculate statistics
    avg_speed = 0
    max_speed = 0

    if gps_points:
        speeds = [p.speed for p in gps_points if p.speed]
        if speeds:
            avg_speed = sum(speeds) / len(speeds)
            max_speed = max(speeds)

    # Generate narrative using centralized AI service
    start = gps_points[0]
    end = gps_points[-1]
    start_time_str = start.timestamp.isoformat() if hasattr(start.timestamp, 'isoformat') else str(start.timestamp)
    end_time_str = end.timestamp.isoformat() if hasattr(end.timestamp, 'isoformat') else str(end.timestamp)

    narrative = await generate_narrative_from_gps(
        start_time_str=start_time_str,
        end_time_str=end_time_str,
        start_lat=start.latitude,
        start_lng=start.longitude,
        end_lat=end.latitude,
        end_lng=end.longitude,
        avg_speed=avg_speed,
        max_speed=max_speed,
        gps_points_count=len(gps_points),
        language=data.language
    )

    return AiGenerateResponse(text=narrative)
