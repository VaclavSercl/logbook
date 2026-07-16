"""Seed database with a default vessel and active logbook for all existing users."""
import sqlite3
import uuid
from datetime import datetime

def seed():
    conn = sqlite3.connect('/home/wwwenda/workspace/logbook/backend/logbook.db')
    cursor = conn.cursor()
    
    # 1. Find all users
    cursor.execute("SELECT id, username FROM users")
    rows = cursor.fetchall()
    if not rows:
        print("No users found in database.")
        conn.close()
        return
        
    for user_id, username in rows:
        print(f"Seeding for user '{username}' with ID: {user_id}")
        
        # 2. Check if vessel already exists
        cursor.execute("SELECT id FROM vessels WHERE owner_id = ?", (user_id,))
        vessel_row = cursor.fetchone()
        if vessel_row:
            vessel_id = vessel_row[0]
            print(f"  Vessel already exists with ID: {vessel_id}")
        else:
            vessel_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO vessels (id, owner_id, name, imo, mmsi, call_sign, port, vessel_type, length, beam, draft, year_built, flag_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (vessel_id, user_id, "Wendyho Loď", "9912345", "270123456", "OL1234", "Split", "Sailing Yacht", 14.5, 4.25, 2.10, 2022, "CZ", datetime.utcnow().isoformat())
            )
            print(f"  Created vessel 'Wendyho Loď' with ID: {vessel_id}")
            
        # 3. Check if active logbook already exists
        cursor.execute("SELECT id FROM logbooks WHERE vessel_id = ? AND status = 'active'", (vessel_id,))
        logbook_row = cursor.fetchone()
        if logbook_row:
            logbook_id = logbook_row[0]
            print(f"  Active logbook already exists with ID: {logbook_id}")
        else:
            logbook_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO logbooks (id, vessel_id, title, voyage_from, voyage_to, status, started_at, closed_at, signed_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (logbook_id, vessel_id, "Zkušební plavba Jadran", "Split", "Hvar", "active", datetime.utcnow().isoformat(), None, None, datetime.utcnow().isoformat())
            )
            print(f"  Created active logbook 'Zkušební plavba Jadran' with ID: {logbook_id}")
            
    # 4. Check and seed default modules
    cursor.execute("SELECT COUNT(*) FROM modules")
    modules_count = cursor.fetchone()[0]
    if modules_count == 0:
        default_modules = [
            ("logbook", "Lodní deník (Core)", "1.0.0", "Hlavní jádro lodního deníku splňující legislativní standardy IMO.", "📖", 1, 1),
            ("gps", "GPS Tracker", "1.0.0", "Automatické logování a zpracování GPS souřadnic plavidla.", "🗺️", 1, 1),
            ("ai-copilot", "AI Copilot (Gemini)", "1.0.0", "Hlasové logování a automatická analýza zápisů přes Gemini 3.5.", "🤖", 1, 1),
            ("weather", "Meteostanice (Weather)", "1.0.0", "Proxy modul pro stahování počasí z modelů Open-Meteo.", "🌤️", 1, 1),
            ("export", "Exporty & Podpis", "1.0.0", "Export lodního deníku do podepsaného PDF a GPX trasy.", "📤", 1, 1),
        ]
        for slug, name, version, desc, icon, is_active, is_installed in default_modules:
            m_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO modules (id, name, slug, version, description, icon, is_active, is_installed, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (m_id, name, slug, version, desc, icon, is_active, is_installed, "{}", datetime.utcnow().isoformat())
            )
            print(f"  Created default module '{name}'")
        
    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
