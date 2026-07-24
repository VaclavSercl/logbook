"""Njořðr AI Auto-Packager and Document Ingestion Tool.

Takes a folder path or zip file, packages it automatically into a ZIP archive if needed,
uploads/registers it in Logbook DB, and executes 100% pure Gemini 3.6 Flash AI analysis.
"""
import os
import sys
import shutil
import zipfile
from datetime import datetime

# Set up backend paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import VoyageDocument, Logbook, Vessel, CrewMember, WatchSchedule, GalleyDuty
from app.services.document_ai import process_voyage_document_ai


def ingest_folder(folder_path: str):
    print(f"⚓ Njořðr AI spouští automatickou zabalovací a načítací sekvenci pro: {folder_path}")

    if not os.path.exists(folder_path):
        print(f"❌ Složka '{folder_path}' neexistuje na serverovém disku.")
        print("💡 Pokud je složka na vašem PC (Windows), nahrál jsem automatický unzipper do webového rozhraní.")
        return False

    db = SessionLocal()
    target_path = folder_path

    # If it's a directory, automatically package it into a .zip file first
    if os.path.isdir(folder_path):
        zip_name = os.path.basename(folder_path.rstrip("/\\")) + ".zip"
        zip_dest = os.path.join(os.path.dirname(folder_path), zip_name)

        print(f"📦 Njořðr AI automaticky balí složku do ZIP archivu: {zip_dest}")
        with zipfile.ZipFile(zip_dest, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(folder_path):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, folder_path)
                    zipf.write(full_p, rel_p)

        target_path = folder_path

    title = os.path.basename(folder_path.rstrip("/\\"))
    doc_type = "folder" if os.path.isdir(folder_path) else "file"

    doc = VoyageDocument(
        doc_type=doc_type,
        title=f"Plavební Balíček: {title}",
        file_path=target_path,
        ai_status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    print(f"🚀 Njořðr AI spouští analýzu dokumentu ID #{doc.id} přes Gemini 3.6 Flash High...")
    res = process_voyage_document_ai(db, doc.id)

    db.refresh(doc)
    print("\n" + "=" * 60)
    print("👑 NJOROR AI EXTRACATION SUMMARY")
    print("=" * 60)
    print(doc.ai_summary)

    if doc.vessel_id:
        v = db.query(Vessel).filter(Vessel.id == doc.vessel_id).first()
        if v:
            print(f"\n⛵ PLAVIDLO: {v.name} ({v.vessel_type}, {v.length or '?'}m, Přístav: {v.port or 'Neuveden'})")

    if doc.logbook_id:
        l = db.query(Logbook).filter(Logbook.id == doc.logbook_id).first()
        if l:
            print(f"📖 LODNÍ DENÍK: {l.title} (Trasa: {l.voyage_from} → {l.voyage_to})")

            w_count = db.query(WatchSchedule).filter(WatchSchedule.logbook_id == l.id).count()
            g_count = db.query(GalleyDuty).filter(GalleyDuty.logbook_id == l.id).count()
            print(f"⚡ ROZVRH SLUŽEB: {w_count} hlídek na moři, {g_count} rotací v kuchyni.")

    if doc.vessel_id:
        crew = db.query(CrewMember).filter(CrewMember.vessel_id == doc.vessel_id).all()
        print(f"\n👥 POSÁDKA NAČTENÁ Z PODKLADŮ ({len(crew)} osob):")
        for c in crew:
            print(f"  - {c.name} ({c.role}) [Pas/OP: {c.passport_number or 'Neuvedeno'}, Narozen: {c.date_of_birth or 'Neuvedeno'}]")

    db.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Použití: python3 njoror_ingest.py /cesta/ke/slozce")
        sys.exit(1)

    ingest_folder(sys.argv[1])
