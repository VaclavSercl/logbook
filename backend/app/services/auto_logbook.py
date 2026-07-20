"""Automated Logbook Generator Service."""
import os
import sys
import math
import asyncio
from datetime import datetime, UTC
import httpx
from dotenv import load_dotenv

# Set backend root path
backend_root = "/home/wwwenda/workspace/logbook/backend"
sys.path.append(backend_root)

# Load env variables manually to ensure reliability from any working dir
load_dotenv(os.path.join(backend_root, ".env"))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import GpsPoint, Logbook, LogEntry, Vessel
from app.services.ai_service import generate_hourly_log_entry
from app.services.audit_service import register_audit_listeners

# Register SQLAlchemy audit listeners
register_audit_listeners()

# Override relative database URL to absolute path
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./"):
    db_url = f"sqlite:///{os.path.join(backend_root, 'logbook.db')}"

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def calculate_distance_nm(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance_km = R * c
    return distance_km * 0.539957  # convert to NM

def calculate_average_speed(gps_points) -> float:
    if not gps_points:
        return 0.0

    # Ensure chronologically sorted (oldest first)
    points = sorted(gps_points, key=lambda x: x.timestamp)

    # Calculate speed between points if not recorded
    for i in range(len(points)):
        p = points[i]
        if p.speed is None:
            if i > 0:
                prev = points[i-1]
                dt = (p.timestamp - prev.timestamp).total_seconds()
                if dt > 10:  # avoid division by zero or noise
                    dist = calculate_distance_nm(prev.latitude, prev.longitude, p.latitude, p.longitude)
                    p.speed = dist / (dt / 3600.0)
                else:
                    p.speed = 0.0
            else:
                p.speed = 0.0

    # Traverse backwards to find the last point where the vessel started moving (speed > 0.5 kn)
    start_index = 0
    for i in range(len(points) - 1, -1, -1):
        if points[i].speed is not None and points[i].speed < 0.5:
            start_index = i + 1
            break

    moving_points = points[start_index:]
    if not moving_points:
        return 0.0

    speeds = [p.speed for p in moving_points if p.speed is not None]
    if not speeds:
        return 0.0
    return sum(speeds) / len(speeds)

def get_wind_direction_cardinal(degrees: float) -> str:
    cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int((degrees + 11.25) / 22.5)
    return cardinals[ix % 16]

def get_sea_state_douglas(wind_speed_knots: float) -> str:
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

from app.services.wind_barb import calculate_wind_barb

async def fetch_weather(lat, lng):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                temp = current.get("temperature_2m", 20.0)
                pressure = current.get("surface_pressure", 1013.0)
                wind_speed_kmh = current.get("wind_speed_10m", 10.0)
                wind_speed_kn = wind_speed_kmh * 0.539957
                wind_dir_deg = current.get("wind_direction_10m", 0.0)
                wind_dir_str = get_wind_direction_cardinal(wind_dir_deg)
                clouds = current.get("cloud_cover", 0.0)
                sea_state = get_sea_state_douglas(wind_speed_kn)
                barb_info = calculate_wind_barb(wind_speed_kn, wind_dir_deg)

                return {
                    "temperature": temp,
                    "pressure": pressure,
                    "wind_speed": round(wind_speed_kn, 1),
                    "wind_direction": wind_dir_str,
                    "wind_direction_deg": wind_dir_deg,
                    "sea_state": sea_state,
                    "clouds": clouds,
                    "wind_barb": barb_info
                }
    except Exception as e:
        print(f"Weather API error: {e}")
    default_barb = calculate_wind_barb(8.0, 315.0)
    return {
        "temperature": 22.0,
        "pressure": 1015.0,
        "wind_speed": 8.0,
        "wind_direction": "NW",
        "wind_direction_deg": 315.0,
        "sea_state": "2 — Smooth",
        "clouds": 20.0,
        "wind_barb": default_barb
    }

async def get_location_details(lat, lng):
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&accept-language=cs,en&zoom=16"
    headers = {"User-Agent": "MaritimeLogbookAutoGenerator/1.0 (contact: vaclav.sercl@polarita.cz)"}
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                display_name = data.get("display_name", "")
                address = data.get("address", {})
                
                # Check for interesting keys
                interesting_keys = ["marina", "harbour", "port", "bay", "sea", "tourism", "amenity", "castle", "historic"]
                place_type = "open_sea"
                place_name = ""
                
                for key in interesting_keys:
                    if key in address:
                        place_name = address[key]
                        place_type = key
                        break
                        
                return {
                    "display_name": display_name,
                    "place_name": place_name,
                    "place_type": place_type
                }
    except Exception as e:
        print(f"Nominatim geocoding error: {e}")
    return {
        "display_name": "otevřené moře",
        "place_name": "",
        "place_type": "open_sea"
    }

async def generate_log_narrative(vessel_name, current_time_str, lat, lng, location_info, avg_speed, weather, last_entries=None):
    return await generate_hourly_log_entry(
        vessel_name=vessel_name,
        current_time_str=current_time_str,
        lat=lat,
        lng=lng,
        location_info=location_info,
        avg_speed=avg_speed,
        weather=weather,
        last_entries=last_entries
    )

async def main():
    db = SessionLocal()
    try:
        # 1. Get active logbook
        logbook_result = db.execute(select(Logbook).where(Logbook.status == "active").limit(1))
        logbook = logbook_result.scalar_one_or_none()
        if not logbook:
            print("No active logbook found. Exiting.")
            return

        # 2. Get vessel
        vessel_result = db.execute(select(Vessel).where(Vessel.id == logbook.vessel_id))
        vessel = vessel_result.scalar_one_or_none()
        if not vessel:
            print("Vessel not found for active logbook. Exiting.")
            return

        # 3. Get GPS points for this vessel
        gps_result = db.execute(
            select(GpsPoint)
            .where(GpsPoint.vessel_id == vessel.id)
            .order_by(GpsPoint.timestamp.desc())
            .limit(100)
        )
        gps_points = gps_result.scalars().all()
        if not gps_points:
            print("No GPS points found for this vessel. Exiting.")
            return

        latest_gps = gps_points[0]
        lat = latest_gps.latitude
        lng = latest_gps.longitude

        # 4. Calculate average speed
        avg_speed = calculate_average_speed(gps_points)

        # 5. Fetch weather
        weather = await fetch_weather(lat, lng)

        # 6. Fetch reverse-geocoding details
        location_info = await get_location_details(lat, lng)

        # 7. Get last 2 log entries for memory context
        last_entries_result = db.execute(
            select(LogEntry)
            .where(LogEntry.logbook_id == logbook.id)
            .order_by(LogEntry.timestamp.desc())
            .limit(2)
        )
        last_entries = last_entries_result.scalars().all()

        # 8. Generate AI narrative
        current_time_str = datetime.now().strftime("%d. %m. %Y %H:%M")
        narrative = await generate_log_narrative(
            vessel.name, current_time_str, lat, lng, location_info, avg_speed, weather, last_entries
        )

        # Determine category based on place type & speed
        category = "navigation"
        if location_info["place_type"] in ["marina", "harbour", "port"] or avg_speed < 0.5:
            category = "anchor"

        # 9. Create Log Entry in DB
        log_entry = LogEntry(
            logbook_id=logbook.id,
            timestamp=datetime.now(UTC).replace(tzinfo=None),  # SQLite compatible datetime
            latitude=lat,
            longitude=lng,
            course=latest_gps.course,
            speed=avg_speed,
            wind_direction=weather["wind_direction_deg"],
            wind_speed=weather["wind_speed"],
            pressure=weather["pressure"],
            temperature=weather["temperature"],
            sea_state=weather["sea_state"],
            notes=narrative,
            category=category,
            created_at=datetime.now(UTC).replace(tzinfo=None)
        )
        
        db.add(log_entry)
        db.commit()
        
        print("\n=== SUCCESS: Automated Logbook Entry Created ===")
        print(f"Vessel: {vessel.name}")
        print(f"Position: {lat:.5f}°N, {lng:.5f}°E ({location_info['display_name']})")
        print(f"Speed (avg): {avg_speed:.1f} knots")
        print(f"Weather: {weather['temperature']}°C, {weather['wind_speed']} kn {weather['wind_direction']}, {weather['pressure']} hPa")
        print(f"Narrative:\n{narrative}")
        print("================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error generating automated log entry: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
