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
            
    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
