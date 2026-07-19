"""Audit logging service for tracking database changes."""
import datetime
import hashlib
from sqlalchemy import event, inspect, text
from sqlalchemy.orm import Session
from app.models import Logbook, LogEntry, AuditLog

def get_clean_val(val):
    """Serialize datetime and date objects to string for JSON storage."""
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.isoformat()
    return val

def audit_session_changes(session, flush_context, instances):
    """Scan session changes before flushing and create audit log entries."""
    # List to store audit logs generated during this run to avoid infinite loop
    new_audits = []

    # 1. New records (Insert)
    for obj in session.new:
        if isinstance(obj, (Logbook, LogEntry)):
            new_val = {}
            state = inspect(obj)
            for attr in state.mapper.column_attrs:
                val = getattr(obj, attr.key)
                if val is not None:
                    new_val[attr.key] = get_clean_val(val)
            
            audit = AuditLog(
                table_name=obj.__tablename__,
                record_id=str(obj.id),
                action="insert",
                new_value=new_val,
                timestamp=datetime.datetime.utcnow()
            )
            new_audits.append(audit)

    # 2. Modified records (Update)
    for obj in session.dirty:
        if isinstance(obj, (Logbook, LogEntry)):
            state = inspect(obj)
            old_val = {}
            new_val = {}
            for attr in state.mapper.column_attrs:
                # Check history of changes
                history = state.get_history(attr.key, passthrough=False)
                if history.has_changes():
                    if history.deleted:
                        old_val[attr.key] = get_clean_val(history.deleted[0])
                    if history.added:
                        new_val[attr.key] = get_clean_val(history.added[0])
            
            if old_val or new_val:
                audit = AuditLog(
                    table_name=obj.__tablename__,
                    record_id=str(obj.id),
                    action="update",
                    old_value=old_val,
                    new_value=new_val,
                    timestamp=datetime.datetime.utcnow()
                )
                new_audits.append(audit)

    # 3. Deleted records (Delete)
    for obj in session.deleted:
        if isinstance(obj, (Logbook, LogEntry)):
            old_val = {}
            state = inspect(obj)
            for attr in state.mapper.column_attrs:
                val = getattr(obj, attr.key)
                if val is not None:
                    old_val[attr.key] = get_clean_val(val)
            
            audit = AuditLog(
                table_name=obj.__tablename__,
                record_id=str(obj.id),
                action="delete",
                old_value=old_val,
                timestamp=datetime.datetime.utcnow()
            )
            new_audits.append(audit)

    # Add all generated audit logs to session
    for audit in new_audits:
        session.add(audit)

def before_log_entry_insert(mapper, connection, target):
    """Automatically calculate the chain hash for the new log entry before insert."""
    # Query previous entry's hash using text() and dict parameters for SQLAlchemy 2.0 compatibility
    cursor = connection.execute(
        text("SELECT entry_hash FROM log_entries WHERE logbook_id = :logbook_id ORDER BY timestamp DESC LIMIT 1"),
        {"logbook_id": target.logbook_id}
    )
    row = cursor.fetchone()
    prev_hash = row[0] if (row and row[0]) else "0" * 64

    # Build canonical string
    timestamp_str = target.timestamp.isoformat() if hasattr(target.timestamp, 'isoformat') else str(target.timestamp)
    lat_val = target.latitude if target.latitude is not None else 0.0
    lng_val = target.longitude if target.longitude is not None else 0.0
    speed_val = target.speed if target.speed is not None else 0.0
    notes_val = target.notes if target.notes is not None else ""

    data_str = (
        f"logbook:{target.logbook_id}|"
        f"time:{timestamp_str}|"
        f"lat:{lat_val:.6f}|"
        f"lng:{lng_val:.6f}|"
        f"speed:{speed_val:.1f}|"
        f"notes:{notes_val}|"
        f"prev:{prev_hash}"
    )

    target.entry_hash = hashlib.sha256(data_str.encode('utf-8')).hexdigest()

def register_audit_listeners():
    """Register the before_flush session event listener."""
    if not event.contains(Session, "before_flush", audit_session_changes):
        event.listen(Session, "before_flush", audit_session_changes)

    if not event.contains(LogEntry, "before_insert", before_log_entry_insert):
        event.listen(LogEntry, "before_insert", before_log_entry_insert)
