"""Telegram Bot Service for AI Logbook connection."""
import asyncio
import os
import uuid
from datetime import datetime
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import User, Vessel, Logbook, LogEntry, GpsPoint, Media


async def run_telegram_bot():
    """Background task to run the Telegram Bot long-polling loop."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        print("Telegram Bot: Configuration missing. Token or Chat ID not set.")
        return

    print(f"Telegram Bot: Starting listener for bot token: {token[:10]}...")
    
    # Verify bot connectivity
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            if res.status_code == 200:
                bot_info = res.json().get("result", {})
                print(f"Telegram Bot: Successfully connected to @{bot_info.get('username')}")
                
                # Send startup notification to owner
                await client.post(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": "⚓ *Njoror (Lodní deník) je připraven k plavbě!* \n\nAhoj kapitáne! Jsem aktivní a připraven naslouchat. Pošli mi jakoukoliv zprávu nebo fotku a já ji zaznamenám do lodního deníku. \n\nNapiš /help pro seznam příkazů.",
                        "parse_mode": "Markdown"
                    }
                )
            else:
                print(f"Telegram Bot: Failed to verify token, status: {res.status_code}")
                return
        except Exception as e:
            print(f"Telegram Bot: Error verifying token: {e}")
            import traceback
            traceback.print_exc()
            return

    offset = 0
    # Long polling loop
    while True:
        try:
            async with httpx.AsyncClient() as client:
                url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=30"
                res = await client.get(url, timeout=35.0)
                
                if res.status_code != 200:
                    await asyncio.sleep(5)
                    continue
                
                updates = res.json().get("result", [])
                for update in updates:
                    offset = update.get("update_id", 0) + 1
                    
                    message = update.get("message")
                    if not message:
                        continue
                    
                    sender_chat_id = message.get("chat", {}).get("id")
                    if sender_chat_id != chat_id:
                        # Ignore unauthorized senders
                        continue
                    
                    # Process message
                    await process_telegram_message(message, token, chat_id)
                    
        except asyncio.CancelledError:
            print("Telegram Bot: Listener task cancelled.")
            break
        except Exception as e:
            print(f"Telegram Bot Loop Error: {e}")
            await asyncio.sleep(5)


async def process_telegram_message(message: dict, token: str, chat_id: int):
    """Process incoming authorized Telegram message."""
    text = message.get("text", "").strip()
    photo = message.get("photo")
    caption = message.get("caption", "").strip()
    
    # Establish DB session
    db: Session = SessionLocal()
    
    try:
        # Get active vessel (first vessel in database)
        vessel_result = db.execute(select(Vessel).limit(1))
        vessel = vessel_result.scalar_one_or_none()
        
        if not vessel:
            await send_telegram_reply(token, chat_id, "⚠️ V databázi nebyla nalezena žádná registrovaná loď.")
            return

        # Get owner
        user = db.query(User).filter(User.id == vessel.owner_id).first()
        if not user:
            await send_telegram_reply(token, chat_id, "⚠️ Vlastník lodi nebyl nalezen.")
            return

        # Get active logbook
        logbook_result = db.execute(
            select(Logbook)
            .where(Logbook.vessel_id == vessel.id, Logbook.status == "active")
            .limit(1)
        )
        logbook = logbook_result.scalar_one_or_none()

        # Handle command: /start or /help
        if text.startswith("/start") or text.startswith("/help"):
            help_msg = (
                "⚓ *Příkazy lodního deníku Njoror:*\n\n"
                "• `/status` - Aktuální stav aktivní plavby\n"
                "• `/vessel` - Informace o lodi\n"
                "• `/gps [lat] [lng]` - Ruční uložení GPS souřadnic\n"
                "• *Textová zpráva* - Cokoliv mi napíšeš, zapíšu jako nový záznam do aktivního deníku.\n"
                "• *Fotka/Obrázek* - Nahraju ji do galerie a spojím s deníkem."
            )
            await send_telegram_reply(token, chat_id, help_msg)
            return

        # Handle command: /vessel
        if text.startswith("/vessel"):
            vessel_msg = (
                f"⛵ *Informace o lodi:*\n\n"
                f"• *Jméno:* {vessel.name}\n"
                f"• *Typ:* {vessel.vessel_type or 'Neuvedeno'}\n"
                f"• *MMSI:* {vessel.mmsi or 'Neuvedeno'}\n"
                f"• *Délka:* {vessel.length or 'Neuvedeno'} m\n"
                f"• *Rejstříkový přístav:* {vessel.port or 'Neuvedeno'}"
            )
            await send_telegram_reply(token, chat_id, vessel_msg)
            return

        # Handle command: /gps
        if text.startswith("/gps"):
            parts = text.split()
            if len(parts) < 3:
                await send_telegram_reply(token, chat_id, "⚠️ Formát: `/gps [latitude] [longitude]`\nNapř. `/gps 43.5081 16.4402`")
                return
            try:
                lat = float(parts[1])
                lng = float(parts[2])
                
                # Save GPS point
                gps_point = GpsPoint(
                    vessel_id=vessel.id,
                    timestamp=datetime.utcnow(),
                    latitude=lat,
                    longitude=lng,
                    source="telegram"
                )
                db.add(gps_point)
                db.commit()
                await send_telegram_reply(token, chat_id, f"📍 Pozice lodi byla uložena: `{lat:.4f}°N`, `{lng:.4f}°E`")
            except ValueError:
                await send_telegram_reply(token, chat_id, "⚠️ Neplatné souřadnice. Zadejte čísla.")
            return

        # Handle command: /status
        if text.startswith("/status"):
            if not logbook:
                await send_telegram_reply(token, chat_id, "⚠️ Nemáte žádný aktivní lodní deník plavby.")
                return
            
            # Fetch latest entry
            latest_entry_result = db.execute(
                select(LogEntry)
                .where(LogEntry.logbook_id == logbook.id)
                .order_by(LogEntry.timestamp.desc())
                .limit(1)
            )
            latest_entry = latest_entry_result.scalar_one_or_none()
            
            status_msg = (
                f"📋 *Aktivní plavba:* {logbook.title}\n"
                f"• *Vyplutí z:* {logbook.voyage_from or 'Neuvedeno'}\n"
                f"• *Cíl plavby:* {logbook.voyage_to or 'Neuvedeno'}\n"
                f"• *Zahájeno:* {logbook.started_at.strftime('%d.%m.%Y %H:%M') if logbook.started_at else 'Neuvedeno'}\n\n"
            )
            if latest_entry:
                status_msg += (
                    f"📍 *Poslední záznam ({latest_entry.timestamp.strftime('%H:%M UTC')}):*\n"
                    f"• *Pozice:* {latest_entry.latitude:.4f}°N, {latest_entry.longitude:.4f}°E\n"
                    f"• *Zápis:* {latest_entry.notes or 'Bez textu'}\n"
                )
            else:
                status_msg += "Zatím nebyly zapsány žádné body."
            await send_telegram_reply(token, chat_id, status_msg)
            return

        # For text / photos, require active logbook
        if not logbook:
            await send_telegram_reply(
                token, 
                chat_id, 
                "⚠️ Nemáte otevřený aktivní lodní deník! Nejprve jej vytvořte v aplikaci na portu 3001."
            )
            return

        # Get latest GPS coordinates for entry position
        latest_gps_result = db.execute(
            select(GpsPoint)
            .where(GpsPoint.vessel_id == vessel.id)
            .order_by(GpsPoint.timestamp.desc())
            .limit(1)
        )
        latest_gps = latest_gps_result.scalar_one_or_none()
        lat = latest_gps.latitude if latest_gps else 43.5081
        lng = latest_gps.longitude if latest_gps else 16.4402

        # Handle Photo Upload
        if photo:
            # Get largest photo
            photo_file = photo[-1]
            file_id = photo_file.get("file_id")
            
            # Request file path from Telegram
            async with httpx.AsyncClient() as client:
                file_res = await client.get(f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}")
                if file_res.status_code == 200:
                    file_path = file_res.json().get("result", {}).get("file_path")
                    
                    # Download actual file
                    download_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
                    file_data_res = await client.get(download_url)
                    
                    if file_data_res.status_code == 200:
                        # Ensure media storage directory exists
                        os.makedirs(f"{settings.STORAGE_PATH}/media", exist_ok=True)
                        
                        filename = f"tg_{uuid.uuid4().hex}.jpg"
                        filepath = f"{settings.STORAGE_PATH}/media/{filename}"
                        with open(filepath, "wb") as f:
                            f.write(file_data_res.content)
                        
                        # Create Log Entry for the media
                        log_entry = LogEntry(
                            logbook_id=logbook.id,
                            timestamp=datetime.utcnow(),
                            latitude=lat,
                            longitude=lng,
                            notes=caption or "Fotka z Telegramu",
                            category="media",
                        )
                        db.add(log_entry)
                        db.flush()

                        # Link photo to media table
                        media_url = f"/static/media/{filename}"
                        media = Media(
                            entry_id=log_entry.id,
                            type="photo",
                            url=media_url,
                            file_size=len(file_data_res.content),
                            gps_latitude=lat,
                            gps_longitude=lng
                        )
                        db.add(media)
                        db.commit()
                        
                        await send_telegram_reply(token, chat_id, "📸 *Fotografie byla úspěšně uložena a připojena k deníku!*")
                        return

            await send_telegram_reply(token, chat_id, "⚠️ Nepodařilo se stáhnout fotografii.")
            return

        # Handle Text message with agy AI agent
        if text:
            await send_telegram_reply(token, chat_id, "⏳ *Njoror přemýšlí...* (Spouštím agy...)")
            
            prompt_context = (
                f"Jsi Njoror, AI vládce projektu Logbook na serveru Čáslav. Uživatel (Václav Šercl) ti posílá zprávu přes Telegram bot a očekává tvou pomoc. Vyřeš jeho požadavek. Pokud chce zapsat zprávu do deníku, zapiš ji do logbook.db (např. pomocí Python skriptu nebo SQL). Pokud chce zkontrolovat status Pirana bot, spusť k tomu určený skript. Odpověz stručně, věcně a přímo.\n\nZpráva od Václava:\n{text}"
            )
            
            try:
                process = await asyncio.create_subprocess_exec(
                    "/home/wwwenda/.local/bin/agy",
                    "--dangerously-skip-permissions",
                    "--print",
                    prompt_context,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await process.communicate()
                
                output = stdout.decode().strip()
                err = stderr.decode().strip()
                
                response_text = ""
                if output:
                    response_text = output
                elif err:
                    response_text = f"⚠️ *Chyba při běhu agy:*\n```\n{err}\n```"
                else:
                    response_text = "🤖 Agent neodpověděl."
                    
                # Telegram has a limit of 4096 characters per message
                if len(response_text) > 4000:
                    response_text = response_text[:3900] + "\n\n...(zkráceno kvůli limitu Telegramu)"
                    
                await send_telegram_reply(token, chat_id, response_text)
                
            except Exception as ex:
                await send_telegram_reply(token, chat_id, f"❌ Chyba při spouštění subprocesu: {str(ex)}")
            return

    except Exception as e:
        print(f"Telegram Bot Processing Error: {e}")
        db.rollback()
        await send_telegram_reply(token, chat_id, f"⚠️ Chyba při ukládání záznamu: {str(e)}")
    finally:
        db.close()


async def send_telegram_reply(token: str, chat_id: int, text: str):
    """Helper to send Markdown reply messages back to Telegram chat."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=10.0)
    except Exception as e:
        print(f"Failed to send Telegram reply: {e}")
