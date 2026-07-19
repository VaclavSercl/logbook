#!/usr/bin/env python3
"""Watchdog service to monitor vessel GPS tracking status."""
import os
import json
import httpx
import math
from datetime import datetime, timedelta
from sqlalchemy import select

# Set up database path relative to backend root
from pathlib import Path
import sys
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from app.database import SessionLocal
from app.models import Logbook, Vessel, GpsPoint
from app.config import settings

STATE_FILE = backend_dir / "watchdog_state.json"

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in nautical miles between two coordinates."""
    R = 3440.065  # Earth radius in nautical miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def send_telegram_alert(message: str):
    """Send alert message to Telegram chat."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID
    if not token or not chat_id:
        print("Telegram configuration missing.")
        return False
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown"
        }
        res = httpx.post(url, json=payload, timeout=10.0)
        return res.status_code == 200
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")
        return False

def main():
    db = SessionLocal()
    try:
        # 1. Get active logbook
        logbook_result = db.execute(select(Logbook).where(Logbook.status == "active").limit(1))
        logbook = logbook_result.scalar_one_or_none()
        if not logbook:
            print("No active logbook found. Skipping check.")
            return

        # 2. Get vessel
        vessel_result = db.execute(select(Vessel).where(Vessel.id == logbook.vessel_id))
        vessel = vessel_result.scalar_one_or_none()
        if not vessel:
            print("No vessel found for active logbook. Skipping.")
            return

        # 3. Get latest 2 GPS points
        gps_result = db.execute(
            select(GpsPoint)
            .where(GpsPoint.vessel_id == vessel.id)
            .order_by(GpsPoint.timestamp.desc())
            .limit(2)
        )
        gps_points = gps_result.scalars().all()
        if not gps_points:
            print("No GPS points found for vessel. Skipping.")
            return

        latest_point = gps_points[0]
        now_utc = datetime.utcnow()
        time_diff = now_utc - latest_point.timestamp

        print(f"Latest GPS point timestamp: {latest_point.timestamp} (Age: {time_diff.total_seconds() / 60:.1f} mins)")

        # 4. Check if latest point is older than 30 minutes
        if time_diff.total_seconds() > 1800:  # 30 minutes
            # 5. Determine if the vessel was moving on the last received points
            was_moving = False
            last_speed = 0.0
            
            if latest_point.speed is not None:
                last_speed = latest_point.speed
                was_moving = latest_point.speed > 0.8
            elif len(gps_points) == 2:
                # Calculate speed between last two points
                pt1, pt2 = gps_points[1], gps_points[0]  # pt1 is older, pt2 is newer (latest)
                dist = haversine_distance(pt1.latitude, pt1.longitude, pt2.latitude, pt2.longitude)
                time_hrs = (pt2.timestamp - pt1.timestamp).total_seconds() / 3600.0
                if time_hrs > 0:
                    last_speed = dist / time_hrs
                    was_moving = last_speed > 0.8

            if was_moving:
                print(f"Vessel was moving (last speed: {last_speed:.1f} kn), but tracking stopped!")
                
                # Check rate limit for alerts (max once per hour)
                last_alert_time = None
                if os.path.exists(STATE_FILE):
                    try:
                        with open(STATE_FILE, "r") as f:
                            state = json.load(f)
                            last_alert_str = state.get("last_alert_time")
                            if last_alert_str:
                                last_alert_time = datetime.fromisoformat(last_alert_str)
                    except Exception as e:
                        print(f"Error reading state file: {e}")

                if last_alert_time and (now_utc - last_alert_time).total_seconds() < 3600:
                    print("Alert sent recently. Rate limiting.")
                    return

                # Send alert!
                local_time = latest_point.timestamp + timedelta(hours=2) # CEST (UTC+2)
                local_time_str = local_time.strftime("%d.%m.%Y %H:%M")
                
                alert_msg = (
                    f"⚠️ *VAROVÁNÍ STRÁŽCE POLOHY (WATCHDOG)* ⚠️\n\n"
                    f"Poloha plavidla *{vessel.name}* nebyla aktualizována již více než *30 minut*!\n\n"
                    f"• *Poslední poloha:* `{latest_point.latitude:.5f}°N`, `{latest_point.longitude:.5f}°E`\n"
                    f"• *Čas posledního bodu:* `{local_time_str}` LT (místní čas)\n"
                    f"• *Rychlost v daném momentu:* `{last_speed:.1f} uzlů`\n\n"
                    f"Zkontrolujte prosím, zda v telefonu nevypadlo internetové připojení nebo sdílení Live Location v Telegramu."
                )
                
                if send_telegram_alert(alert_msg):
                    print("Telegram alert sent successfully.")
                    # Update state
                    try:
                        with open(STATE_FILE, "w") as f:
                            json.dump({"last_alert_time": now_utc.isoformat()}, f)
                    except Exception as e:
                        print(f"Failed to write state file: {e}")
            else:
                print(f"Vessel was not moving (speed: {last_speed:.1f} kn). No alert needed.")
        else:
            print("Vessel tracking is active and fresh.")

    except Exception as e:
        print(f"Watchdog error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
