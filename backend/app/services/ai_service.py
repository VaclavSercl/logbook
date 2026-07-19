import base64
import httpx
from app.config import settings

async def call_llm(prompt: str) -> str:
    """Call Google Gemini API directly, falling back to OpenRouter API."""
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

    raise RuntimeError("No LLM API keys configured or call failed.")


async def generate_hourly_log_entry(
    vessel_name: str,
    current_time_str: str,
    lat: float,
    lng: float,
    location_info: dict,
    avg_speed: float,
    weather: dict,
    last_entries: list = None
) -> str:
    """Generate professional captain's log for the hourly automatic entry."""
    memory_context = ""
    if last_entries:
        memory_context = "\n=== PAMĚŤ: PŘEDCHOZÍ ZÁPISY DENÍKU ===\n"
        for entry in reversed(last_entries):
            # Support both object attributes and dict keys
            entry_time = entry.timestamp.strftime('%d. %m. %Y %H:%M') if hasattr(entry, 'timestamp') and hasattr(entry.timestamp, 'strftime') else (entry.get('timestamp') if isinstance(entry, dict) else entry)
            entry_notes = entry.notes if hasattr(entry, 'notes') else (entry.get('notes') if isinstance(entry, dict) else entry)
            memory_context += f"- [{entry_time}] {entry_notes}\n"
        memory_context += "=======================================\n"

    prompt = f"""
Jsi Njoror, AI vládce projektu lodního deníku na lodi {vessel_name}.
Sestav profesionální námořní zápis do lodního deníku pro aktuální hodinu plavby v češtině.
{memory_context}
Telemetrická data a kontext pro tento zápis:
- Aktuální čas: {current_time_str}
- Pozice: {lat:.5f}°N, {lng:.5f}°E
- Lokalita (reverzní geokódování): {location_info.get('display_name', 'otevřené moře')}
- Typ místa: {location_info.get('place_type', 'open_sea')} {f'({location_info.get("place_name")})' if location_info.get("place_name") else ''}
- Průměrná rychlost od vyplutí / zahájení pohybu: {avg_speed:.1f} uzlů
- Aktuální vítr: {weather.get('wind_speed', 0.0):.1f} uzlů, směr {weather.get('wind_direction', 'N')}
- Tlak vzduchu: {weather.get('pressure', 1013.0):.1f} hPa
- Teplota vzduchu: {weather.get('temperature', 20.0):.1f} °C
- Stav moře (Douglasova stupnice): {weather.get('sea_state', '0 — Calm')}
- Oblačnost: {weather.get('clouds', 0.0)}%

Pokyny pro styl a kontinuitu:
- Zápis musí znít jako od velmi zkušeného, stručného a věcného kapitána námořní plavby.
- Navazuj plynule na předchozí zápisy (pokud jsou k dispozici). Zkontroluj, zda loď změnila polohu, zda se mění počasí (např. zesílení větru, pokles tlaku) a napiš to jako plynulé pokračování cesty.
- Udržuj naprosto stejnou strukturu, terminologii a formát vyjadřování jako v předchozích zápisech pro zachování jednotného stylu celého deníku.
- Nepoužívej žádný úvodní ani závěrečný doprovodný text (např. "Zde je váš zápis"). Začni ihned samotným textem zápisu.
- Zápis by měl mít délku 2 až 4 věty. Nepoužívej zbytečné fráze.
"""
    try:
        return await call_llm(prompt)
    except Exception as e:
        print(f"Hourly LLM generation failed, using fallback: {e}")
        return f"Automatický zápis: Pozice {lat:.4f}°N, {lng:.4f}°E. Rychlost {avg_speed:.1f} kn. Vítr {weather.get('wind_speed', 0.0)} kn {weather.get('wind_direction', 'N')}. Tlak {weather.get('pressure', 1013.0)} hPa."


async def generate_narrative_from_gps(
    start_time_str: str,
    end_time_str: str,
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    avg_speed: float,
    max_speed: float,
    gps_points_count: int,
    language: str = "cs"
) -> str:
    """Generate narrative summary from GPS points array/metrics."""
    prompt = f"""
Jsi zkušený kapitán námořní jachty a píšeš lodní deník.
Na základě následujících telemetrických dat o plavbě sestav souvislý, profesionální námořní zápis v češtině/angličtině (podle parametru language).
Zápis by měl mít literární i odbornou hodnotu lodního deníku (časové záznamy, kurz COG, rychlost SOG, průměry a souhrn dne).

Telemetrická data:
- Počáteční čas: {start_time_str}
- Konečný čas: {end_time_str}
- Počáteční pozice: {start_lat:.4f}°N, {start_lng:.4f}°E
- Konečná pozice: {end_lat:.4f}°N, {end_lng:.4f}°E
- Průměrná rychlost: {avg_speed:.1f} uzlů
- Maximální rychlost: {max_speed:.1f} uzlů
- Počet zaznamenaných GPS bodů: {gps_points_count}

Zapiš to jako chronologické hlášení kapitána. Piš přímo výsledek, bez úvodních okecávaček jako "Zde je váš zápis:".
Odpovídej v jazyce: {language}
"""
    try:
        return await call_llm(prompt)
    except Exception as e:
        print(f"Narrative LLM generation failed, using fallback: {e}")
        # Deterministic local fallback
        if language == "cs":
            lines = [
                f"**Automatický zápis deníku**",
                f"",
                f"**Počáteční pozice:** {start_lat:.4f}°N, {start_lng:.4f}°E",
                f"**Konečná pozice:** {end_lat:.4f}°N, {end_lng:.4f}°E",
                f"**Průměrná rychlost:** {avg_speed:.1f} uzlů",
            ]
            if max_speed > 0:
                lines.append(f"**Maximální rychlost:** {max_speed:.1f} uzlů")
            lines.append(f"**Počet GPS bodů:** {gps_points_count}")
            return "\n".join(lines)
        else:
            lines = [
                f"**Auto Log Entry**",
                f"",
                f"**Start position:** {start_lat:.4f}°N, {start_lng:.4f}°E",
                f"**End position:** {end_lat:.4f}°N, {end_lng:.4f}°E",
                f"**Average speed:** {avg_speed:.1f} knots",
            ]
            if max_speed > 0:
                lines.append(f"**Max speed:** {max_speed:.1f} knots")
            lines.append(f"**GPS points:** {gps_points_count}")
            return "\n".join(lines)


async def transcribe_voice_note(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe and format an audio recording using Google Gemini API."""
    google_key = settings.GOOGLE_API_KEY
    if not google_key:
        raise ValueError("GOOGLE_API_KEY is not configured.")
        
    base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    
    prompt = (
        "Jsi Njoror, AI vládce projektu lodního deníku.\n"
        "Tato nahrávka obsahuje hlasový záznam kapitána z paluby plavidla.\n"
        "Přepiš tuto hlasovou nahrávku do spisovné češtiny a zformuj z ní stručný, profesionální a věcný námořní zápis do lodního deníku (délka 1 až 3 věty).\n"
        "Odpověz přímo samotným textem zápisu, nepiš žádné úvody, komentáře ani uvozovky."
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={google_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64_audio
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, timeout=30.0)
        if res.status_code == 200:
            data = res.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError) as e:
                raise RuntimeError(f"Failed to parse Gemini response: {e}")
        else:
            raise RuntimeError(f"Gemini API returned error status {res.status_code}: {res.text}")
