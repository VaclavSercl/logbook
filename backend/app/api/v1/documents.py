"""API Endpoints for Voyage Documents, Attachments, and AI Information Extraction."""
import os
import shutil
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from app.database import get_db
from app.models import VoyageDocument, Logbook, Vessel
from app.api.v1.auth import get_current_user
from app.services.document_ai import process_voyage_document_ai

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "voyages")


class PathRequest(BaseModel):
    logbook_id: Optional[str] = None
    vessel_id: Optional[str] = None
    file_path: str
    title: Optional[str] = None


class UrlRequest(BaseModel):
    logbook_id: Optional[str] = None
    vessel_id: Optional[str] = None
    url: str
    title: Optional[str] = None


class VoyageDocumentResponse(BaseModel):
    id: str
    logbook_id: Optional[str]
    vessel_id: Optional[str]
    doc_type: str
    title: str
    file_path: Optional[str]
    url: Optional[str]
    file_size: Optional[int]
    file_type: Optional[str]
    ai_status: str
    ai_summary: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("/upload", response_model=VoyageDocumentResponse)
async def upload_document(
    logbook_id: Optional[str] = Form(None),
    vessel_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not logbook_id and not vessel_id:
        raise HTTPException(status_code=400, detail="Must provide logbook_id or vessel_id")

    v_id = vessel_id
    if logbook_id:
        logbook = db.query(Logbook).filter(Logbook.id == str(logbook_id)).first()
        if logbook:
            v_id = logbook.vessel_id

    target_dir = os.path.join(UPLOAD_DIR, logbook_id or v_id or "general")
    os.makedirs(target_dir, exist_ok=True)

    file_path = os.path.join(target_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    doc = VoyageDocument(
        logbook_id=logbook_id,
        vessel_id=v_id,
        doc_type="file",
        title=file.filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file.content_type,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process AI extraction automatically
    process_voyage_document_ai(db, doc.id)
    db.refresh(doc)
    return doc


@router.post("/add-path", response_model=VoyageDocumentResponse)
async def add_path_document(
    data: PathRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = data.title or os.path.basename(data.file_path.rstrip("/\\")) or data.file_path
    doc_type = "folder" if os.path.isdir(data.file_path) else "file"

    doc = VoyageDocument(
        logbook_id=data.logbook_id,
        vessel_id=data.vessel_id,
        doc_type=doc_type,
        title=title,
        file_path=data.file_path,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    process_voyage_document_ai(db, doc.id)
    db.refresh(doc)
    return doc


@router.post("/add-url", response_model=VoyageDocumentResponse)
async def add_url_document(
    data: UrlRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title = data.title or data.url

    doc = VoyageDocument(
        logbook_id=data.logbook_id,
        vessel_id=data.vessel_id,
        doc_type="url",
        title=title,
        url=data.url,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    process_voyage_document_ai(db, doc.id)
    db.refresh(doc)
    return doc


@router.get("/list/{logbook_id}")
async def list_voyage_documents(
    logbook_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = db.query(VoyageDocument).filter(
        (VoyageDocument.logbook_id == str(logbook_id)) | (VoyageDocument.vessel_id == str(logbook_id))
    ).order_by(VoyageDocument.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "logbook_id": d.logbook_id,
            "vessel_id": d.vessel_id,
            "doc_type": d.doc_type,
            "title": d.title,
            "file_path": d.file_path,
            "url": d.url,
            "file_size": d.file_size,
            "file_type": d.file_type,
            "ai_status": d.ai_status,
            "ai_summary": d.ai_summary,
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in docs
    ]


@router.post("/{doc_id}/analyze")
async def retrigger_ai_analysis(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = process_voyage_document_ai(db, doc_id)
    return res


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voyage_document(
    doc_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(VoyageDocument).filter(VoyageDocument.id == str(doc_id)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_path and os.path.exists(doc.file_path) and os.path.isfile(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return
