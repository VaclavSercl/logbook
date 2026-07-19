"""Integrity and cryptographic signature service for immutable logs."""
import hashlib
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Logbook, LogEntry
from app.config import settings

def calculate_canonical_hash(logbook_id: str, timestamp_str: str, lat: float, lng: float, speed: float, notes: str, prev_hash: str) -> str:
    """Calculate the canonical SHA-256 hash for a log entry."""
    lat_val = lat if lat is not None else 0.0
    lng_val = lng if lng is not None else 0.0
    speed_val = speed if speed is not None else 0.0
    notes_val = notes if notes is not None else ""
    
    data_str = (
        f"logbook:{logbook_id}|"
        f"time:{timestamp_str}|"
        f"lat:{lat_val:.6f}|"
        f"lng:{lng_val:.6f}|"
        f"speed:{speed_val:.1f}|"
        f"notes:{notes_val}|"
        f"prev:{prev_hash}"
    )
    return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

def verify_logbook_integrity(logbook_id: str, db: Session) -> dict:
    """
    Verify the cryptographic hash chain of all entries in a logbook.
    Returns a dict with verification status and details.
    """
    result = db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
        .order_by(LogEntry.timestamp.asc())
    )
    entries = result.scalars().all()
    
    if not entries:
        return {"verified": True, "message": "No entries to verify."}
        
    prev_hash = "0" * 64
    for idx, entry in enumerate(entries):
        timestamp_str = entry.timestamp.isoformat() if hasattr(entry.timestamp, 'isoformat') else str(entry.timestamp)
        expected_hash = calculate_canonical_hash(
            logbook_id=entry.logbook_id,
            timestamp_str=timestamp_str,
            lat=entry.latitude,
            lng=entry.longitude,
            speed=entry.speed,
            notes=entry.notes,
            prev_hash=prev_hash
        )
        
        if entry.entry_hash != expected_hash:
            return {
                "verified": False,
                "error_at_entry_id": str(entry.id),
                "error_at_index": idx,
                "expected_hash": expected_hash,
                "actual_hash": entry.entry_hash,
                "message": f"Integrity check failed at entry index {idx}."
            }
        prev_hash = entry.entry_hash
        
    return {"verified": True, "message": "Logbook integrity verified successfully."}

def sign_logbook(logbook_id: str, db: Session) -> str:
    """
    Sign a logbook by generating a signature of the head hash (last entry's hash).
    The signature is created using HMAC-like hashing with settings.SECRET_KEY.
    """
    # 1. Fetch logbook
    logbook_result = db.execute(select(Logbook).where(Logbook.id == logbook_id))
    logbook = logbook_result.scalar_one_or_none()
    if not logbook:
        raise ValueError("Logbook not found")
        
    # 2. Get last entry
    entry_result = db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
        .order_by(LogEntry.timestamp.desc())
        .limit(1)
    )
    last_entry = entry_result.scalar_one_or_none()
    if not last_entry:
        raise ValueError("Cannot sign empty logbook")
        
    # 3. Create digital signature hash from the head hash of the chain
    head_hash = last_entry.entry_hash or ""
    signature_data = f"signed_logbook:{logbook_id}|head:{head_hash}|secret:{settings.SECRET_KEY}"
    signature = hashlib.sha256(signature_data.encode('utf-8')).hexdigest()
    
    logbook.signed_hash = signature
    logbook.status = "closed"
    db.commit()
    
    return signature

def rebuild_logbook_hash_chain(logbook_id: str, db: Session):
    """
    Rebuilds the cryptographic hash chain for all entries in a logbook.
    Useful for retrofitting existing logs or initializing the chain.
    """
    result = db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
        .order_by(LogEntry.timestamp.asc())
    )
    entries = result.scalars().all()
    
    prev_hash = "0" * 64
    for entry in entries:
        timestamp_str = entry.timestamp.isoformat() if hasattr(entry.timestamp, 'isoformat') else str(entry.timestamp)
        entry.entry_hash = calculate_canonical_hash(
            logbook_id=entry.logbook_id,
            timestamp_str=timestamp_str,
            lat=entry.latitude,
            lng=entry.longitude,
            speed=entry.speed,
            notes=entry.notes,
            prev_hash=prev_hash
        )
        prev_hash = entry.entry_hash
    db.commit()
