"""Dashboard routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models import Vessel, Logbook, LogEntry, Module
from app.schemas import DashboardStatsResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_str = str(current_user.id)

    # Count vessels
    v_query = select(func.count()).select_from(Vessel).where(Vessel.owner_id == user_id_str)
    vessels_count = db.execute(v_query).scalar() or 0

    # Count logbooks
    l_query = (
        select(func.count())
        .select_from(Logbook)
        .join(Vessel)
        .where(Vessel.owner_id == user_id_str)
    )
    logbooks_count = db.execute(l_query).scalar() or 0

    # Count log entries
    e_query = (
        select(func.count())
        .select_from(LogEntry)
        .join(Logbook)
        .join(Vessel)
        .where(Vessel.owner_id == user_id_str)
    )
    entries_count = db.execute(e_query).scalar() or 0

    # Count active modules
    m_query = select(func.count()).select_from(Module).where(Module.is_active == True)
    active_modules_count = db.execute(m_query).scalar() or 0

    return {
        "vessels": vessels_count,
        "logbooks": logbooks_count,
        "entries": entries_count,
        "activeModules": active_modules_count,
    }
