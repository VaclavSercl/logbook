"""GPS tracking routes."""
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.database import get_db
from app.models import GpsPoint
from app.schemas import GpsPointCreate, GpsPointResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.post("", response_model=GpsPointResponse, status_code=201)
async def add_gps_point(
    data: GpsPointCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    point = GpsPoint(**data.model_dump())
    db.add(point)
    db.flush()
    return point


@router.get("/vessel/{vessel_id}", response_model=list[GpsPointResponse])
async def get_gps_track(
    vessel_id: UUID,
    start: datetime = None,
    end: datetime = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(GpsPoint).where(GpsPoint.vessel_id == str(vessel_id))
    if start:
        query = query.where(GpsPoint.timestamp >= start)
    if end:
        query = query.where(GpsPoint.timestamp <= end)
    query = query.order_by(GpsPoint.timestamp)
    result = db.execute(query)
    return result.scalars().all()


@router.get("/vessel/{vessel_id}/latest", response_model=GpsPointResponse)
async def get_latest_position(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(GpsPoint)
        .where(GpsPoint.vessel_id == str(vessel_id))
        .order_by(GpsPoint.timestamp.desc())
        .limit(1)
    )
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="No GPS data")
    return point


from pydantic import BaseModel

class NmeaImportRequest(BaseModel):
    vessel_id: UUID
    nmea_data: str


def parse_rmc(sentence: str):
    parts = sentence.split(',')
    if len(parts) < 10 or not parts[0].endswith('RMC'):
        return None
    if parts[2] != 'A':  # Void position
        return None
    
    try:
        # Latitude
        lat_val = parts[3]
        lat_dir = parts[4]
        lat_deg = float(lat_val[:2])
        lat_min = float(lat_val[2:])
        latitude = lat_deg + (lat_min / 60.0)
        if lat_dir == 'S':
            latitude = -latitude
            
        # Longitude
        lng_val = parts[5]
        lng_dir = parts[6]
        lng_deg = float(lng_val[:3])
        lng_min = float(lng_val[3:])
        longitude = lng_deg + (lng_min / 60.0)
        if lng_dir == 'W':
            longitude = -longitude
            
        # Speed & Course
        speed = float(parts[7]) if parts[7] else 0.0
        course = float(parts[8]) if parts[8] else 0.0
        
        return {
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "course": course
        }
    except Exception:
        return None


@router.post("/nmea", response_model=list[GpsPointResponse], status_code=201)
async def import_nmea_data(
    data: NmeaImportRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    points = []
    for line in data.nmea_data.split('\n'):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = None
            if 'RMC' in line:
                parsed = parse_rmc(line)
            
            if parsed:
                point = GpsPoint(
                    vessel_id=str(data.vessel_id),
                    timestamp=datetime.utcnow(),
                    latitude=parsed["latitude"],
                    longitude=parsed["longitude"],
                    speed=parsed["speed"],
                    course=parsed["course"],
                    raw_nmea=line,
                    source="nmea"
                )
                db.add(point)
                points.append(point)
        except Exception:
            continue
            
    if not points:
        raise HTTPException(status_code=400, detail="No valid NMEA RMC sentences found or parsed")
        
    db.commit()
    # Ensure they have IDs assigned
    for p in points:
        db.refresh(p)
    return points

