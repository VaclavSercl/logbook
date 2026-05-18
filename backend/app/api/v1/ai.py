"""AI routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import LogEntry, GpsPoint
from app.schemas import AiGenerateRequest, AiGenerateResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.post("/generate-entry", response_model=AiGenerateResponse)
async def generate_entry(
    data: AiGenerateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI log entry from GPS and weather data."""
    # Get GPS points for the time range
    query = select(GpsPoint).where(GpsPoint.vessel_id == data.logbook_id)
    if data.start_time:
        query = query.where(GpsPoint.timestamp >= data.start_time)
    if data.end_time:
        query = query.where(GpsPoint.timestamp <= data.end_time)
    query = query.order_by(GpsPoint.timestamp)

    result = await db.execute(query)
    gps_points = result.scalars().all()

    if not gps_points:
        raise HTTPException(status_code=404, detail="No GPS data for the specified time range")

    # Calculate statistics
    total_distance = 0
    avg_speed = 0
    max_speed = 0
    start_pos = None
    end_pos = None

    if gps_points:
        start_pos = gps_points[0]
        end_pos = gps_points[-1]
        speeds = [p.speed for p in gps_points if p.speed]
        if speeds:
            avg_speed = sum(speeds) / len(speeds)
            max_speed = max(speeds)

    # Generate narrative
    narrative = _generate_narrative(gps_points, avg_speed, max_speed, data.language)

    return AiGenerateResponse(text=narrative)


def _generate_narrative(gps_points, avg_speed, max_speed, language="cs"):
    """Generate a human-readable log entry from GPS data."""
    if not gps_points:
        return "No data available."

    start = gps_points[0]
    end = gps_points[-1]

    if language == "cs":
        lines = [
            f"**Automatický zápis deníku**",
            f"",
            f"**Počáteční pozice:** {start.latitude:.4f}°N, {start.longitude:.4f}°E",
            f"**Konečná pozice:** {end.latitude:.4f}°N, {end.longitude:.4f}°E",
            f"**Průměrná rychlost:** {avg_speed:.1f} uzlů",
        ]
        if max_speed > 0:
            lines.append(f"**Maximální rychlost:** {max_speed:.1f} uzlů")
        lines.append(f"**Počet GPS bodů:** {len(gps_points)}")
        return "\n".join(lines)
    else:
        lines = [
            f"**Auto Log Entry**",
            f"",
            f"**Start position:** {start.latitude:.4f}°N, {start.longitude:.4f}°E",
            f"**End position:** {end.latitude:.4f}°N, {end.longitude:.4f}°E",
            f"**Average speed:** {avg_speed:.1f} knots",
        ]
        if max_speed > 0:
            lines.append(f"**Max speed:** {max_speed:.1f} knots")
        lines.append(f"**GPS points:** {len(gps_points)}")
        return "\n".join(lines)
