"""Watch management routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import WatchGroup, WatchSchedule, Vessel, CrewMember, Logbook
from app.schemas import (
    WatchGroupCreate, WatchGroupResponse, WatchGroupUpdate,
    WatchScheduleCreate, WatchScheduleResponse, WatchScheduleUpdate,
    AutoScheduleGenerateRequest
)
from app.api.v1.auth import get_current_user
from app.services.schedule_generator import auto_generate_schedules

router = APIRouter()


@router.get("/vessel/{vessel_id}", response_model=list[WatchGroupResponse])
async def list_watch_groups(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check vessel ownership
    vessel_result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this vessel's watch groups")

    result = db.execute(
        select(WatchGroup).where(WatchGroup.vessel_id == str(vessel_id))
    )
    return result.scalars().all()


@router.post("/group", response_model=WatchGroupResponse, status_code=201)
async def create_watch_group(
    data: WatchGroupCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel_result = db.execute(select(Vessel).where(Vessel.id == str(data.vessel_id)))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    group = WatchGroup(
        vessel_id=str(data.vessel_id),
        name=data.name
    )
    
    # Resolve members
    if data.member_ids:
        members_result = db.execute(
            select(CrewMember).where(CrewMember.id.in_([str(mid) for mid in data.member_ids]))
        )
        group.members = list(members_result.scalars().all())

    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.delete("/group/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watch_group(
    group_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = db.query(WatchGroup).filter(WatchGroup.id == str(group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Watch group not found")
        
    vessel = db.query(Vessel).filter(Vessel.id == group.vessel_id).first()
    if not vessel or str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(group)
    db.commit()
    return


@router.get("/schedule/{logbook_id}", response_model=list[WatchScheduleResponse])
async def list_watch_schedules(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = db.query(Logbook).filter(Logbook.id == str(logbook_id)).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    result = db.execute(
        select(WatchSchedule)
        .where(WatchSchedule.logbook_id == str(logbook_id))
        .order_by(WatchSchedule.start_time.asc())
    )
    return result.scalars().all()


@router.post("/schedule", response_model=WatchScheduleResponse, status_code=201)
async def create_watch_schedule(
    data: WatchScheduleCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = db.query(Logbook).filter(Logbook.id == str(data.logbook_id)).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    schedule = WatchSchedule(
        logbook_id=str(data.logbook_id),
        watch_group_id=str(data.watch_group_id),
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.notes
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/group/{group_id}", response_model=WatchGroupResponse)
async def update_watch_group(
    group_id: UUID,
    data: WatchGroupUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = db.query(WatchGroup).filter(WatchGroup.id == str(group_id)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Watch group not found")

    if data.name is not None:
        group.name = data.name

    if data.member_ids is not None:
        members_result = db.execute(
            select(CrewMember).where(CrewMember.id.in_([str(mid) for mid in data.member_ids]))
        )
        group.members = list(members_result.scalars().all())

    db.commit()
    db.refresh(group)
    return group


@router.delete("/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watch_schedule(
    schedule_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = db.query(WatchSchedule).filter(WatchSchedule.id == str(schedule_id)).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    db.delete(schedule)
    db.commit()
    return


@router.put("/schedule/{schedule_id}", response_model=WatchScheduleResponse)
async def update_watch_schedule(
    schedule_id: UUID,
    data: WatchScheduleUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = db.query(WatchSchedule).filter(WatchSchedule.id == str(schedule_id)).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    if data.watch_group_id is not None:
        schedule.watch_group_id = str(data.watch_group_id)
    if data.start_time is not None:
        schedule.start_time = data.start_time
    if data.end_time is not None:
        schedule.end_time = data.end_time
    if data.notes is not None:
        schedule.notes = data.notes

    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/auto-generate")
async def generate_auto_schedules(
    data: AutoScheduleGenerateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logbook = db.query(Logbook).filter(Logbook.id == str(data.logbook_id)).first()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    try:
        result = auto_generate_schedules(
            db=db,
            logbook_id=str(data.logbook_id),
            started_at=data.started_at,
            ended_at=data.ended_at,
            watch_duration_hours=data.watch_duration_hours,
            persons_per_watch=data.persons_per_watch,
            watch_start_hour=data.watch_start_hour,
            watch_start_minute=data.watch_start_minute,
            clear_existing=bool(data.clear_existing),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

