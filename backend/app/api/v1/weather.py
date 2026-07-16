"""Weather routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from app.database import get_db
from app.models import GpsPoint, Vessel
from app.schemas import WeatherResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


def get_wind_direction_cardinal(degrees: float) -> str:
    """Convert degrees to compass cardinal direction."""
    cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int((degrees + 11.25) / 22.5)
    return cardinals[ix % 16]


def get_sea_state_douglas(wind_speed_knots: float) -> str:
    """Estimate Douglas sea state based on wind speed in knots."""
    if wind_speed_knots < 3:
        return "0 — Calm (glassy)"
    elif wind_speed_knots < 7:
        return "1 — Calm (rippled)"
    elif wind_speed_knots < 11:
        return "2 — Smooth"
    elif wind_speed_knots < 17:
        return "3 — Slight"
    elif wind_speed_knots < 22:
        return "4 — Moderate"
    elif wind_speed_knots < 28:
        return "5 — Rough"
    else:
        return "6 — Very rough"


@router.get("/vessel/{vessel_id}", response_model=WeatherResponse)
async def get_weather(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if vessel exists and user has access
    vessel_result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if vessel.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this vessel's weather")

    # Get latest GPS point
    gps_result = db.execute(
        select(GpsPoint)
        .where(GpsPoint.vessel_id == str(vessel_id))
        .order_by(GpsPoint.timestamp.desc())
        .limit(1)
    )
    latest_point = gps_result.scalar_one_or_none()

    # Use latest coordinates or default to Split, Croatia
    lat = latest_point.latitude if latest_point else 43.5081
    lng = latest_point.longitude if latest_point else 16.4402

    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                
                temp = current.get("temperature_2m", 20.0)
                humidity = current.get("relative_humidity_2m", 60.0)
                pressure = current.get("surface_pressure", 1013.0)
                # Open-Meteo gives wind speed in km/h, convert to knots (1 km/h = 0.539957 knots)
                wind_speed_kmh = current.get("wind_speed_10m", 10.0)
                wind_speed_kn = wind_speed_kmh * 0.539957
                wind_dir_deg = current.get("wind_direction_10m", 0.0)
                wind_dir_str = get_wind_direction_cardinal(wind_dir_deg)
                clouds = current.get("cloud_cover", 0.0)
                
                # Estimate visibility (very simple estimation based on humidity/clouds)
                visibility = 10.0
                if humidity > 90:
                    visibility = 5.0
                if humidity > 95:
                    visibility = 2.0
                
                sea_state = get_sea_state_douglas(wind_speed_kn)

                return WeatherResponse(
                    temperature=temp,
                    humidity=humidity,
                    pressure=pressure,
                    wind_speed=round(wind_speed_kn, 1),
                    wind_direction=wind_dir_str,
                    visibility=visibility,
                    sea_state=sea_state,
                    clouds=clouds,
                )
    except Exception as e:
        print(f"Open-Meteo API error: {e}")

    # Fallback/Dummy data if API is down
    return WeatherResponse(
        temperature=22.5,
        humidity=55.0,
        pressure=1015.0,
        wind_speed=8.5,
        wind_direction="NW",
        visibility=10.0,
        sea_state="2 — Smooth",
        clouds=20.0,
    )
