"""AI Voyage Document Analyzer and Information Extractor.

Processes uploaded files, local folder paths, and URLs to automatically populate
crew members, voyage parameters, and recalculate watch/galley schedules.
"""
import os
import re
import csv
import json
import urllib.request
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import VoyageDocument, Logbook, Vessel, CrewMember
from app.services.schedule_generator import auto_generate_schedules


def parse_crew_from_text_or_rows(rows_or_text: List[List[str]]) -> List[Dict[str, Any]]:
    """Helper to extract crew members from matrix of text/csv/excel rows."""
    crew_found = []
    if not rows_or_text:
        return crew_found

    # Try to locate header row
    header_idx = -1
    col_map = {}

    for idx, row in enumerate(rows_or_text[:10]):
        row_lower = [str(c).strip().lower() for c in row]
        for c_i, cell in enumerate(row_lower):
            if any(k in cell for k in ["jméno", "jmeno", "first name", "name", "člen", "posádka"]):
                header_idx = idx
                break
        if header_idx != -1:
            break

    if header_idx != -1:
        header_row = [str(c).strip().lower() for c in rows_or_text[header_idx]]
        for c_i, cell in enumerate(header_row):
            if "přezdívka" in cell or "prezdivka" in cell or "nick" in cell:
                col_map["nickname"] = c_i
            elif "příjmení" in cell or "prijmeni" in cell or "last" in cell:
                col_map["last_name"] = c_i
            elif "jméno" in cell or "jmeno" in cell or "first" in cell:
                col_map["first_name"] = c_i
            elif "role" in cell or "funkce" in cell or "pozice" in cell:
                col_map["role"] = c_i

        data_rows = rows_or_text[header_idx + 1:]
    else:
        data_rows = rows_or_text

    for row in data_rows:
        if not row or not any(str(c).strip() for c in row):
            continue

        first_name = ""
        last_name = ""
        nickname = ""
        role = "Člen posádky"

        if "first_name" in col_map and col_map["first_name"] < len(row):
            first_name = str(row[col_map["first_name"]]).strip()
        if "last_name" in col_map and col_map["last_name"] < len(row):
            last_name = str(row[col_map["last_name"]]).strip()
        if "nickname" in col_map and col_map["nickname"] < len(row):
            nickname = str(row[col_map["nickname"]]).strip()
        if "role" in col_map and col_map["role"] < len(row):
            role = str(row[col_map["role"]]).strip() or "Člen posádky"

        # Fallback if no header map found
        if not first_name and not last_name:
            # First cell with non-empty string
            cells = [str(c).strip() for c in row if str(c).strip()]
            if cells:
                parts = cells[0].split()
                if len(parts) >= 2:
                    first_name, last_name = parts[0], parts[1]
                elif len(parts) == 1:
                    first_name = parts[0]

        if first_name or last_name or nickname:
            crew_found.append({
                "first_name": first_name,
                "last_name": last_name,
                "nickname": nickname,
                "role": role,
            })

    return crew_found


def process_voyage_document_ai(db: Session, doc_id: str) -> Dict[str, Any]:
    """Analyzes a voyage document/folder/URL with AI extraction and updates logbook data."""
    doc = db.query(VoyageDocument).filter(VoyageDocument.id == str(doc_id)).first()
    if not doc:
        return {"status": "error", "message": "Document not found"}

    doc.ai_status = "processing"
    db.commit()

    extracted_crew = []
    extracted_notes = []
    extracted_ports = {}
    summary_lines = []

    try:
        if doc.doc_type == "url" and doc.url:
            summary_lines.append(f"🌐 Prozkoumán internetový odkaz: {doc.url}")
            try:
                req = urllib.request.Request(doc.url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                    # Strip tags
                    text_content = re.sub(r'<[^>]+>', ' ', html)
                    lines = [[w.strip() for w in line.split() if w.strip()] for line in text_content.splitlines() if line.strip()]
                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))
            except Exception as e:
                summary_lines.append(f"⚠️ Nepodařilo se stáhnout odkaz: {e}")

        elif doc.doc_type == "folder" and doc.file_path:
            summary_lines.append(f"📁 Prozkoumána lokální složka: {doc.file_path}")
            if os.path.exists(doc.file_path) and os.path.isdir(doc.file_path):
                for root, _, files in os.walk(doc.file_path):
                    for f in files:
                        f_path = os.path.join(root, f)
                        if f.endswith('.csv'):
                            try:
                                with open(f_path, 'r', encoding='utf-8', errors='ignore') as fp:
                                    reader = csv.reader(fp)
                                    rows = list(reader)
                                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
                                    summary_lines.append(f"📄 Načten CSV soubor se složky: {f}")
                            except Exception:
                                pass
                        elif f.endswith('.txt') or f.endswith('.md'):
                            try:
                                with open(f_path, 'r', encoding='utf-8', errors='ignore') as fp:
                                    lines = [line.strip().split() for line in fp if line.strip()]
                                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))
                            except Exception:
                                pass
            else:
                summary_lines.append(f"⚠️ Složka nebyla nalezena na disku.")

        elif doc.file_path and os.path.exists(doc.file_path):
            summary_lines.append(f"📄 Prozkoumán soubor: {os.path.basename(doc.file_path)}")
            ext = os.path.splitext(doc.file_path)[1].lower()

            if ext == '.csv':
                with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    reader = csv.reader(fp)
                    rows = list(reader)
                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
            elif ext in ['.xlsx', '.xls']:
                try:
                    import pandas as pd
                    df = pd.read_excel(doc.file_path)
                    rows = [df.columns.tolist()] + df.values.tolist()
                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
                    summary_lines.append(f"📊 Načten Excel list s {len(df)} řádky.")
                except Exception:
                    # Fallback plain text read
                    with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        lines = [line.strip().split() for line in fp if line.strip()]
                        extracted_crew.extend(parse_crew_from_text_or_rows(lines))
            else:
                with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = [line.strip().split() for line in fp if line.strip()]
                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))

        # Register extracted crew members to Vessel
        vessel_id = doc.vessel_id
        if not vessel_id and doc.logbook_id:
            logbook = db.query(Logbook).filter(Logbook.id == doc.logbook_id).first()
            if logbook:
                vessel_id = logbook.vessel_id

        added_crew_count = 0
        if vessel_id and extracted_crew:
            existing_crew = db.query(CrewMember).filter(CrewMember.vessel_id == vessel_id).all()
            existing_names = {
                f"{c.first_name or ''} {c.last_name or ''}".strip().lower()
                for c in existing_crew
            }

            for c_data in extracted_crew:
                fn = c_data.get("first_name", "").strip()
                ln = c_data.get("last_name", "").strip()
                nick = c_data.get("nickname", "").strip()
                full_key = f"{fn} {ln}".strip().lower()

                if full_key and full_key not in existing_names:
                    full_name = f"{fn} {ln}".strip() or nick or "Člen"
                    new_member = CrewMember(
                        vessel_id=str(vessel_id),
                        first_name=fn,
                        last_name=ln,
                        nickname=nick,
                        name=full_name,
                        role=c_data.get("role", "Člen posádky"),
                        include_in_watches=True,
                        include_in_galley=True
                    )
                    db.add(new_member)
                    existing_names.add(full_key)
                    added_crew_count += 1

            if added_crew_count > 0:
                db.flush()
                summary_lines.append(f"👥 Automaticky zapsáno {added_crew_count} nových členů posádky z podkladů!")

        # If logbook exists and crew was added, trigger auto-generation of schedules
        if doc.logbook_id:
            logbook = db.query(Logbook).filter(Logbook.id == doc.logbook_id).first()
            if logbook and logbook.started_at and logbook.ended_at:
                auto_generate_schedules(
                    db=db,
                    logbook_id=doc.logbook_id,
                    started_at=logbook.started_at,
                    ended_at=logbook.ended_at,
                    clear_existing=True
                )
                summary_lines.append("⚡ Lodní hlídky a služby v kuchyni byly automaticky přegenerovány podle nových podkladů!")

        doc.ai_status = "completed"
        doc.ai_summary = "\n".join(summary_lines) or "Podklady byly úspěšně zanalyzovány bez zjištění nových položek."
        doc.extracted_data = {
            "crew_found": len(extracted_crew),
            "added_crew_count": added_crew_count,
            "summary": doc.ai_summary
        }
        db.commit()

        return {
            "status": "success",
            "doc_id": str(doc.id),
            "ai_status": doc.ai_status,
            "summary": doc.ai_summary,
            "added_crew_count": added_crew_count
        }

    except Exception as err:
        db.rollback()
        doc.ai_status = "error"
        doc.ai_summary = f"Chyba při analýze podkladů: {err}"
        db.commit()
        return {"status": "error", "message": str(err)}
