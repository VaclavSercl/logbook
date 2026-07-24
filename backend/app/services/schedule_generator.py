"""Automated Watch & Galley Duty Scheduler for Logbook Voyages."""
from datetime import datetime, timedelta, time
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.models import Logbook, Vessel, CrewMember, WatchGroup, WatchSchedule, GalleyDuty


def auto_generate_schedules(
    db: Session,
    logbook_id: str,
    started_at: datetime,
    ended_at: datetime,
    watch_duration_hours: float = 2.0,
    persons_per_watch: int = 2,
    watch_start_hour: int = 20,
    watch_start_minute: int = 0,
    clear_existing: bool = True,
) -> Dict[str, Any]:
    """
    Automatically calculates and creates Watch Schedules and Galley Duties
    for the entire voyage duration, with fair rotation among crew members.
    Enforces STCW fatigue management: crew on Galley Duty on a given day are
    excluded from Navigation Watch on that day.
    Creates a clean, fixed set of Watch Groups for the vessel.
    """
    logbook = db.query(Logbook).filter(Logbook.id == str(logbook_id)).first()
    if not logbook:
        raise ValueError("Logbook not found")

    vessel_id = logbook.vessel_id
    if not vessel_id:
        vessel = db.query(Vessel).first()
        if vessel:
            vessel_id = vessel.id
            logbook.vessel_id = vessel.id
            db.commit()

    # Ensure timezone naive datetimes for SQLite comparison
    if started_at and started_at.tzinfo is not None:
        started_at = started_at.replace(tzinfo=None)
    if ended_at and ended_at.tzinfo is not None:
        ended_at = ended_at.replace(tzinfo=None)

    # Update logbook started_at and ended_at
    logbook.started_at = started_at
    logbook.ended_at = ended_at

    # Fetch crew members
    crew_list = db.query(CrewMember).filter(CrewMember.vessel_id == str(vessel_id)).all()

    # Filter eligible crew
    watch_crew = [c for c in crew_list if c.include_in_watches is not False]
    galley_crew = [c for c in crew_list if c.include_in_galley is not False]

    if clear_existing:
        # Clear existing schedules and watch groups for this logbook & vessel
        db.execute(delete(WatchSchedule).where(WatchSchedule.logbook_id == str(logbook_id)))
        db.execute(delete(GalleyDuty).where(GalleyDuty.logbook_id == str(logbook_id)))
        db.execute(delete(WatchGroup).where(WatchGroup.vessel_id == str(vessel_id)))
        db.flush()

    created_groups_count = 0
    created_watches_count = 0
    created_galley_count = 0

    # ── 1. GENERATE GALLEY DUTIES FIRST (24h MIDNIGHT TO MIDNIGHT) ────────
    galley_busy_by_date: Dict[Any, Set[str]] = {}

    if galley_crew:
        current_date = started_at.date()
        end_date = ended_at.date()

        cook_idx = 0
        n_crew = len(galley_crew)

        while current_date <= end_date:
            duty_datetime = datetime.combine(current_date, time(0, 0, 0))

            cook = galley_crew[cook_idx % n_crew]
            # Helper/Cleaner is next person in rotation
            cleaner_idx = (cook_idx + 1) % n_crew if n_crew > 1 else cook_idx
            cleaner = galley_crew[cleaner_idx]

            duty = GalleyDuty(
                logbook_id=str(logbook_id),
                date=duty_datetime,
                cook_id=str(cook.id),
                cleaner_id=str(cleaner.id),
                notes="Automatická služba v kuchyni (24h od 00:00 do 24:00)"
            )
            db.add(duty)
            created_galley_count += 1

            # Mark cook & cleaner as busy for watch exclusion on current_date
            galley_busy_by_date[current_date] = {str(cook.id), str(cleaner.id)}

            current_date += timedelta(days=1)
            cook_idx += 2

    # ── 2. CREATE FIXED CLEAN WATCH GROUPS FOR VESSEL ─────────────────────
    if watch_crew:
        def get_member_name_str(m: CrewMember) -> str:
            parts = []
            if m.first_name:
                parts.append(m.first_name)
            if m.last_name:
                parts.append(m.last_name)
            m_str = " ".join(parts) if parts else (m.name or "")
            if m.nickname:
                m_str += f' „{m.nickname}“'
            return m_str

        n_per_watch = max(1, persons_per_watch)
        groups_members: List[List[CrewMember]] = []
        for i in range(0, len(watch_crew), n_per_watch):
            chunk = watch_crew[i:i + n_per_watch]
            if len(chunk) < n_per_watch and groups_members:
                groups_members[-1].extend(chunk)
            else:
                groups_members.append(chunk)

        group_names = ["Hlídka Alfa", "Hlídka Beta", "Hlídka Gama", "Hlídka Delta", "Hlídka Éta"]
        db_watch_groups: List[WatchGroup] = []

        for idx, members in enumerate(groups_members):
            base_n = group_names[idx] if idx < len(group_names) else f"Hlídka {idx + 1}"
            member_names = [get_member_name_str(m) for m in members]
            full_wg_name = f"{base_n} ({', '.join(member_names)})"

            wg = WatchGroup(vessel_id=str(vessel_id), name=full_wg_name)
            wg.members = members
            db.add(wg)
            db.flush()
            created_groups_count += 1
            db_watch_groups.append(wg)

        # ── 3. ASSIGN WATCH SCHEDULES ─────────────────────────────────────
        day1_watch_start = datetime.combine(
            started_at.date(),
            time(hour=watch_start_hour, minute=watch_start_minute)
        )
        if day1_watch_start < started_at:
            current_watch_time = started_at
        else:
            current_watch_time = day1_watch_start

        step_delta = timedelta(hours=watch_duration_hours)
        watch_slot_counter: Dict[Any, int] = {}

        while current_watch_time < ended_at:
            watch_end = current_watch_time + step_delta
            if watch_end > ended_at:
                watch_end = ended_at

            watch_date = current_watch_time.date()
            busy_set = galley_busy_by_date.get(watch_date, set())

            # Filter watch groups whose members do NOT have Galley Duty on watch_date
            available_groups = [
                g for g in db_watch_groups
                if not any(str(m.id) in busy_set for m in g.members)
            ]
            if not available_groups:
                available_groups = db_watch_groups

            counter = watch_slot_counter.get(watch_date, 0)
            assigned_group = available_groups[counter % len(available_groups)]
            watch_slot_counter[watch_date] = counter + 1

            sched = WatchSchedule(
                logbook_id=str(logbook_id),
                watch_group_id=assigned_group.id,
                start_time=current_watch_time,
                end_time=watch_end,
                notes=f"Automatická hlídka ({watch_duration_hours:g}h)"
            )
            db.add(sched)
            created_watches_count += 1

            current_watch_time = watch_end

    db.commit()

    return {
        "status": "success",
        "logbook_id": str(logbook_id),
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
        "created_groups": created_groups_count,
        "created_watches": created_watches_count,
        "created_galley_duties": created_galley_count,
    }
