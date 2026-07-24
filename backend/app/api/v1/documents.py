"""API Endpoints for Voyage Documents, Attachments, and AI Information Extraction."""
import os
import shutil
from datetime import datetime
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
    logbook_id: Optional[str] = None
    vessel_id: Optional[str] = None
    doc_type: str
    title: str
    file_path: Optional[str] = None
    url: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    ai_status: str = "pending"
    ai_summary: Optional[str] = None
    created_at: Optional[datetime] = None

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
    # Resolve default vessel and active logbook for user if omitted
    v_id = vessel_id
    if not v_id:
        vessel = db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).first()
        if vessel:
            v_id = vessel.id

    l_id = logbook_id
    if not l_id and v_id:
        logbook = db.query(Logbook).filter(Logbook.vessel_id == str(v_id), Logbook.status == "active").first()
        if logbook:
            l_id = logbook.id

    target_dir = os.path.join(UPLOAD_DIR, str(l_id or v_id or "general"))
    os.makedirs(target_dir, exist_ok=True)

    file_path = os.path.join(target_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)
    doc_type = "file"
    final_path = file_path

    # Auto-extract ZIP archives of voyage folders
    if file.filename.lower().endswith('.zip'):
        try:
            import zipfile
            extract_folder = os.path.join(target_dir, os.path.splitext(file.filename)[0])
            os.makedirs(extract_folder, exist_ok=True)
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_folder)
            doc_type = "folder"
            final_path = extract_folder
        except Exception as zip_err:
            print("Zip extract warning:", zip_err)

    doc = VoyageDocument(
        logbook_id=str(l_id) if l_id else None,
        vessel_id=str(v_id) if v_id else None,
        doc_type=doc_type,
        title=file.filename,
        file_path=final_path,
        file_size=file_size,
        file_type=file.content_type,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        process_voyage_document_ai(db, doc.id)
        db.refresh(doc)
    except Exception as err:
        doc.ai_status = "error"
        doc.ai_summary = f"Chyba při zpracování AI: {err}"
        db.commit()
    except Exception as err:
        print("AI extraction background warning:", err)

    return doc


@router.post("/add-path", response_model=VoyageDocumentResponse)
async def add_path_document(
    data: PathRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    v_id = data.vessel_id
    if not v_id:
        vessel = db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).first()
        if vessel:
            v_id = vessel.id

    l_id = data.logbook_id
    if not l_id and v_id:
        logbook = db.query(Logbook).filter(Logbook.vessel_id == str(v_id), Logbook.status == "active").first()
        if logbook:
            l_id = logbook.id

    req_path = data.file_path
    if not os.path.exists(req_path):
        folder_name = os.path.basename(req_path.replace('\\', '/').rstrip('/'))
        candidate_paths = [
            os.path.join(UPLOAD_DIR, folder_name),
            os.path.join(os.getcwd(), "uploads", folder_name),
            os.path.join("/home/wwwenda", folder_name)
        ]
        for cp in candidate_paths:
            if os.path.exists(cp):
                req_path = cp
                break

    title = data.title or os.path.basename(req_path.replace('\\', '/').rstrip('/')) or req_path
    doc_type = "folder" if os.path.isdir(req_path) else "file"

    doc = VoyageDocument(
        logbook_id=str(l_id) if l_id else None,
        vessel_id=str(v_id) if v_id else None,
        doc_type=doc_type,
        title=title,
        file_path=req_path,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        process_voyage_document_ai(db, doc.id)
        db.refresh(doc)
    except Exception as err:
        print("AI extraction background warning:", err)

    return doc


@router.post("/add-url", response_model=VoyageDocumentResponse)
async def add_url_document(
    data: UrlRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    v_id = data.vessel_id
    if not v_id:
        vessel = db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).first()
        if vessel:
            v_id = vessel.id

    l_id = data.logbook_id
    if not l_id and v_id:
        logbook = db.query(Logbook).filter(Logbook.vessel_id == str(v_id), Logbook.status == "active").first()
        if logbook:
            l_id = logbook.id

    title = data.title or data.url

    doc = VoyageDocument(
        logbook_id=str(l_id) if l_id else None,
        vessel_id=str(v_id) if v_id else None,
        doc_type="url",
        title=title,
        url=data.url,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        process_voyage_document_ai(db, doc.id)
        db.refresh(doc)
    except Exception as err:
        print("AI extraction background warning:", err)

    return doc


@router.get("/list/{identifier}")
async def list_voyage_documents(
    identifier: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vessels = db.query(Vessel).filter(Vessel.owner_id == str(current_user.id)).all()
    vessel_ids = [v.id for v in vessels]

    if identifier in ["all", "general", "undefined", "null", ""]:
        docs = db.query(VoyageDocument).filter(
            (VoyageDocument.vessel_id.in_(vessel_ids)) | (VoyageDocument.vessel_id == None)
        ).order_by(VoyageDocument.created_at.desc()).all()
    else:
        docs = db.query(VoyageDocument).filter(
            (VoyageDocument.logbook_id == str(identifier)) |
            (VoyageDocument.vessel_id == str(identifier)) |
            (VoyageDocument.vessel_id.in_(vessel_ids))
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
