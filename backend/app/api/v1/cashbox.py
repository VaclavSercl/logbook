"""Cashbox / Finance routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import CashboxExpense, Vessel
from app.schemas import CashboxExpenseCreate, CashboxExpenseResponse
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/vessel/{vessel_id}", response_model=list[CashboxExpenseResponse])
async def list_expenses(
    vessel_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel = db.execute(select(Vessel).where(Vessel.id == str(vessel_id))).scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = db.execute(
        select(CashboxExpense)
        .where(CashboxExpense.vessel_id == str(vessel_id))
        .order_by(CashboxExpense.date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CashboxExpenseResponse, status_code=201)
async def create_expense(
    data: CashboxExpenseCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessel = db.execute(select(Vessel).where(Vessel.id == str(data.vessel_id))).scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    if str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    expense = CashboxExpense(
        vessel_id=str(data.vessel_id),
        payer_name=data.payer_name or "Kapitán",
        category=data.category or "proviant",
        amount=data.amount,
        currency=data.currency or "EUR",
        description=data.description
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.execute(select(CashboxExpense).where(CashboxExpense.id == str(expense_id))).scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense entry not found")

    vessel = db.execute(select(Vessel).where(Vessel.id == expense.vessel_id)).scalar_one_or_none()
    if not vessel or str(vessel.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(expense)
    db.commit()
    return
