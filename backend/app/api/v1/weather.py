"""Weather routes with Synoptic Wind Barb & 24h Forecast."""
from uuid import UUID
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from app.database import get_db
from app.models import GpsPoint, Vessel
from app.schemas import WeatherResponse
from app.api.v1.auth import get_current_user
from app.services.wind_barb import calculate_wind_barb

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


@router.get("/vessel/{vessel_id}")
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
    if str(vessel.owner_id) != str(current_user.id):
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
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation&forecast_days=2"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                
                temp = current.get("temperature_2m", 20.0)
                humidity = current.get("relative_humidity_2m", 60.0)
                pressure = current.get("surface_pressure", 1013.0)
                wind_speed_kmh = current.get("wind_speed_10m", 10.0)
                wind_speed_kn = wind_speed_kmh * 0.539957
                wind_dir_deg = current.get("wind_direction_10m", 0.0)
                wind_dir_str = get_wind_direction_cardinal(wind_dir_deg)
                clouds = current.get("cloud_cover", 0.0)
                
                visibility = 10.0
                if humidity > 90:
                    visibility = 5.0
                if humidity > 95:
                    visibility = 2.0
                
                sea_state = get_sea_state_douglas(wind_speed_kn)
                barb_info = calculate_wind_barb(wind_speed_kn, wind_dir_deg)

                # Parse hourly forecast for next 24 hours
                hourly_data = data.get("hourly", {})
                times = hourly_data.get("time", [])
                temps = hourly_data.get("temperature_2m", [])
                winds_kmh = hourly_data.get("wind_speed_10m", [])
                wind_dirs = hourly_data.get("wind_direction_10m", [])
                precip = hourly_data.get("precipitation", [])

                forecast = []
                for i in range(min(24, len(times))):
                    w_kn = (winds_kmh[i] if i < len(winds_kmh) else 10.0) * 0.539957
                    w_deg = wind_dirs[i] if i < len(wind_dirs) else 0.0
                    forecast.append({
                        "time": times[i],
                        "temperature": temps[i] if i < len(temps) else 20.0,
                        "wind_speed": round(w_kn, 1),
                        "wind_direction": get_wind_direction_cardinal(w_deg),
                        "wind_direction_deg": w_deg,
                        "precipitation": precip[i] if i < len(precip) else 0.0,
                        "sea_state": get_sea_state_douglas(w_kn),
                        "wind_barb": calculate_wind_barb(w_kn, w_deg)
                    })

                return {
                    "temperature": temp,
                    "humidity": humidity,
                    "pressure": pressure,
                    "wind_speed": round(wind_speed_kn, 1),
                    "wind_direction": wind_dir_str,
                    "wind_direction_deg": wind_dir_deg,
                    "visibility": visibility,
                    "sea_state": sea_state,
                    "clouds": clouds,
                    "location": {"lat": lat, "lng": lng},
                    "wind_barb": barb_info,
                    "forecast": forecast
                }
    except Exception as e:
        print(f"Open-Meteo API error: {e}")

    # Fallback/Dummy data if API is down
    default_barb = calculate_wind_barb(8.5, 315.0)
    return {
        "temperature": 22.5,
        "humidity": 55.0,
        "pressure": 1015.0,
        "wind_speed": 8.5,
        "wind_direction": "NW",
        "wind_direction_deg": 315.0,
        "visibility": 10.0,
        "sea_state": "2 — Smooth",
        "clouds": 20.0,
        "location": {"lat": lat, "lng": lng},
        "wind_barb": default_barb,
        "forecast": []
    }
