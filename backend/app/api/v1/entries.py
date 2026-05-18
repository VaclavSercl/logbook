"""Log entry routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import LogEntry
from app.schemas import LogEntryCreate, LogEntryResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/logbook/{logbook_id}", response_model=list[LogEntryResponse])
async def list_entries(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
        .order_by(LogEntry.timestamp)
    )
    return result.scalars().all()


@router.post("/logbook/{logbook_id}", response_model=LogEntryResponse, status_code=201)
async def create_entry(
    logbook_id: UUID,
    data: LogEntryCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = LogEntry(**data.model_dump(), logbook_id=logbook_id)
    db.add(entry)
    await db.flush()
    return entry


@router.put("/{entry_id}", response_model=LogEntryResponse)
async def update_entry(
    entry_id: UUID,
    data: LogEntryCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogEntry).where(LogEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    entry.modified_by = current_user.id
    return entry


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LogEntry).where(LogEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if entry.is_locked:
        raise HTTPException(status_code=400, detail="Entry is locked")
    await db.delete(entry)
    return {"status": "deleted"}
