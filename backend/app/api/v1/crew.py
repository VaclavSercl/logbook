"""Crew management routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import CrewMember, Vessel
from app.schemas import CrewMemberCreate, CrewMemberResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/vessel/{vessel_id}", response_model=list[CrewMemberResponse])
async def list_crew(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if vessel exists and user has access
    vessel_result = db.execute(select(Vessel).where(Vessel.id == str(vessel_id)))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this vessel's crew")

    result = db.execute(
        select(CrewMember).where(CrewMember.vessel_id == str(vessel_id))
    )
    return result.scalars().all()


@router.post("", response_model=CrewMemberResponse, status_code=201)
async def create_crew_member(
    data: CrewMemberCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if vessel exists and user is owner
    vessel_result = db.execute(select(Vessel).where(Vessel.id == str(data.vessel_id)))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to add crew to this vessel")

    crew_member = CrewMember(
        vessel_id=str(data.vessel_id),
        name=data.name,
        role=data.role,
        nationality=data.nationality,
        passport_number=data.passport_number,
        date_of_birth=data.date_of_birth,
    )
    db.add(crew_member)
    db.flush()
    return crew_member


@router.delete("/{crew_member_id}")
async def delete_crew_member(
    crew_member_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = db.execute(select(CrewMember).where(CrewMember.id == str(crew_member_id)))
    crew_member = result.scalar_one_or_none()
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")

    # Check if vessel owner matches current user
    vessel_result = db.execute(select(Vessel).where(Vessel.id == crew_member.vessel_id))
    vessel = vessel_result.scalar_one_or_none()
    if not vessel or str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this crew member")

    db.delete(crew_member)
    db.flush()
    return {"status": "deleted"}
