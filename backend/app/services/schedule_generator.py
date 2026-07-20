"""Automated Watch & Galley Duty Scheduler for Logbook Voyages."""
from datetime import datetime, timedelta, time
from typing import List, Dict, Any, Optional
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
    """
    logbook = db.query(Logbook).filter(Logbook.id == str(logbook_id)).first()
    if not logbook:
        raise ValueError("Logbook not found")

    vessel_id = logbook.vessel_id

    # Update logbook started_at and ended_at
    logbook.started_at = started_at
    logbook.ended_at = ended_at

    # Fetch crew members
    crew_list = db.query(CrewMember).filter(CrewMember.vessel_id == str(vessel_id)).all()

    # Filter eligible crew
    watch_crew = [c for c in crew_list if c.include_in_watches is not False]
    galley_crew = [c for c in crew_list if c.include_in_galley is not False]

    if clear_existing:
        # Clear existing schedules for this logbook
        db.execute(delete(WatchSchedule).where(WatchSchedule.logbook_id == str(logbook_id)))
        db.execute(delete(GalleyDuty).where(GalleyDuty.logbook_id == str(logbook_id)))
        db.flush()

    created_groups_count = 0
    created_watches_count = 0
    created_galley_count = 0

    # ── 1. GENERATE WATCH GROUPS & SCHEDULES ─────────────────────────────
    if watch_crew:
        # Group watch_crew into teams of persons_per_watch
        n_per_watch = max(1, persons_per_watch)
        groups_members: List[List[CrewMember]] = []
        for i in range(0, len(watch_crew), n_per_watch):
            chunk = watch_crew[i:i + n_per_watch]
            if len(chunk) < n_per_watch and groups_members:
                # Add remaining to existing group or keep as separate group
                groups_members[-1].extend(chunk)
            else:
                groups_members.append(chunk)

        # Ensure WatchGroup records exist
        group_names = ["Hlídka Alfa", "Hlídka Beta", "Hlídka Gama", "Hlídka Delta", "Hlídka Éta"]
        db_watch_groups: List[WatchGroup] = []

        # Find or create watch groups
        existing_groups = db.query(WatchGroup).filter(WatchGroup.vessel_id == str(vessel_id)).all()
        existing_map = {g.name: g for g in existing_groups}

        for idx, members in enumerate(groups_members):
            name = group_names[idx] if idx < len(group_names) else f"Hlídka {idx + 1}"
            member_names = [m.first_name or m.name for m in members]
            name_with_members = f"{name} ({', '.join(member_names)})"

            if name in existing_map:
                wg = existing_map[name]
                wg.name = name_with_members
            else:
                wg = WatchGroup(vessel_id=str(vessel_id), name=name_with_members)
                db.add(wg)
                db.flush()
                created_groups_count += 1
            db_watch_groups.append(wg)

        # Calculate watch start time on Day 1
        day1_watch_start = datetime.combine(
            started_at.date(),
            time(hour=watch_start_hour, minute=watch_start_minute)
        )
        if day1_watch_start < started_at:
            # If 20:00 on day 1 is before voyage start, start at voyage start
            current_watch_time = started_at
        else:
            current_watch_time = day1_watch_start

        group_idx = 0
        step_delta = timedelta(hours=watch_duration_hours)

        while current_watch_time < ended_at:
            watch_end = current_watch_time + step_delta
            if watch_end > ended_at:
                watch_end = ended_at

            assigned_group = db_watch_groups[group_idx % len(db_watch_groups)]

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
            group_idx += 1

    # ── 2. GENERATE GALLEY DUTIES (24h MIDNIGHT TO MIDNIGHT) ──────────────
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

            current_date += timedelta(days=1)
            cook_idx += 1

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
