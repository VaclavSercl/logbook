"""AI routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from app.config import settings
from app.database import get_db
from app.models import LogEntry, GpsPoint, Logbook
from app.schemas import AiGenerateRequest, AiGenerateResponse
from app.api.v1.auth import get_current_user

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

    # Generate narrative (with LLM or fallback)
    narrative = await _generate_narrative_with_llm(gps_points, avg_speed, max_speed, data.language)

    return AiGenerateResponse(text=narrative)


async def _generate_narrative_with_llm(gps_points, avg_speed, max_speed, language="cs"):
    """Generate narrative using Google Gemini or OpenRouter with local fallback."""
    if not gps_points:
        return "No data."

    start = gps_points[0]
    end = gps_points[-1]

    prompt = f"""
Jsi zkušený kapitán námořní jachty a píšeš lodní deník.
Na základě následujících telemetrických dat o plavbě sestav souvislý, profesionální námořní zápis v češtině/angličtině (podle parametru language).
Zápis by měl mít literární i odbornou hodnotu lodního deníku (časové záznamy, kurz COG, rychlost SOG, průměry a souhrn dne).

Telemetrická data:
- Počáteční čas: {start.timestamp.isoformat() if hasattr(start.timestamp, 'isoformat') else start.timestamp}
- Konečný čas: {end.timestamp.isoformat() if hasattr(end.timestamp, 'isoformat') else end.timestamp}
- Počáteční pozice: {start.latitude:.4f}°N, {start.longitude:.4f}°E
- Konečná pozice: {end.latitude:.4f}°N, {end.longitude:.4f}°E
- Průměrná rychlost: {avg_speed:.1f} uzlů
- Maximální rychlost: {max_speed:.1f} uzlů
- Počet zaznamenaných GPS bodů: {len(gps_points)}

Zapiš to jako chronologické hlášení kapitána. Piš přímo výsledek, bez úvodních okecávaček jako "Zde je váš zápis:".
Odpovídej v jazyce: {language}
"""

    # 1. Try Google Gemini API directly
    if settings.GOOGLE_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={settings.GOOGLE_API_KEY}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, timeout=20.0)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print(f"Gemini API failed: {e}")

    # 2. Try OpenRouter API
    if settings.OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Logbook",
            }
            payload = {
                "model": "google/gemini-3.5-flash",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=headers, timeout=20.0)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"OpenRouter API failed: {e}")

    # 3. Fallback to local deterministic generator
    return _generate_narrative(gps_points, avg_speed, max_speed, language)


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
