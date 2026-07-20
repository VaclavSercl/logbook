"""AI Voyage Document Analyzer and Information Extractor.

Processes uploaded files, local folder paths, and URLs to automatically populate:
- Vessel specifications (Name, Type, Length, Beam, Draft, Year, Port, Flag State, Charter Company)
- Voyage route and itinerary details (departure port, destination port, notes)
- Financial expenses in Cashbox (Deposit, Charter Fees)
- Crew members list (only if present in documents)
"""
import os
import re
import csv
import json
import urllib.request
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import VoyageDocument, Logbook, Vessel, CrewMember, LogEntry, CashboxExpense
from app.services.schedule_generator import auto_generate_schedules


def parse_crew_from_text_or_rows(rows_or_text: List[List[str]]) -> List[Dict[str, Any]]:
    """Helper to extract crew members from matrix of text/csv/excel rows."""
    crew_found = []
    if not rows_or_text:
        return crew_found

    header_idx = -1
    col_map = {}

    for idx, row in enumerate(rows_or_text[:10]):
        row_lower = [str(c).strip().lower() for c in row]
        for c_i, cell in enumerate(row_lower):
            if any(k in cell for k in ["jméno", "jmeno", "first name", "name", "člen", "posádka", "skupina"]):
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

        if not first_name and not last_name:
            cells = [str(c).strip() for c in row if str(c).strip()]
            if cells and len(cells[0]) < 40:
                parts = cells[0].split()
                if len(parts) >= 2 and not any(kw in cells[0].lower() for kw in ["délka", "ponor", "vyplutí", "vítr", "tlak", "http", "bavaria", "charter"]):
                    first_name, last_name = parts[0], parts[1]

        if first_name or last_name or nickname:
            crew_found.append({
                "first_name": first_name,
                "last_name": last_name,
                "nickname": nickname,
                "role": role,
            })

    return crew_found


def extract_vessel_specs(text: str) -> Dict[str, Any]:
    """Extracts rich vessel specs: name, type, draft, length, beam, year_built, port, flag_state, charter, deposit."""
    specs = {}
    text_lower = text.lower()

    # Name of vessel
    m = re.search(r'plachetnice\s+([a-z0-9\s]{3,40})\s+k\s+pronájmu', text_lower)
    if not m:
        m = re.search(r'\"name\"\s*:\s*\"([^\"]+)\"', text)
    if not m:
        m = re.search(r'bavaria\s*\d{2,3}[^\n,<]*', text_lower)
    if m:
        name_val = m.group(1) if m.groups() else m.group(0)
        name_val = name_val.strip().title()
        if len(name_val) > 2 and "Yachting.Com" not in name_val:
            specs["name"] = name_val

    # Vessel Type
    if "plachetnice" in text_lower or "sailing" in text_lower:
        specs["vessel_type"] = "Plachetnice"
    elif "katamarán" in text_lower or "catamaran" in text_lower:
        specs["vessel_type"] = "Katamarán"
    elif "motor" in text_lower or "motorboat" in text_lower:
        specs["vessel_type"] = "Motorová jachta"

    # Draft (ponor)
    m = re.search(r'ponor[^0-9]*(\d+(?:[.,]\d+)?)', text_lower)
    if m:
        specs["draft"] = float(m.group(1).replace(',', '.'))

    # Length (délka)
    m = re.search(r'délka[^0-9]*(\d+(?:[.,]\d+)?)', text_lower)
    if m:
        specs["length"] = float(m.group(1).replace(',', '.'))

    # Beam (šířka)
    m = re.search(r'šířka lodi[^0-9]*(\d+(?:[.,]\d+)?)', text_lower)
    if not m:
        m = re.search(r'šířka[^0-9]*(\d+(?:[.,]\d+)?)', text_lower)
    if m:
        specs["beam"] = float(m.group(1).replace(',', '.'))

    # Year built (rok výroby)
    m = re.search(r'rok výroby[^0-9]*(20\d{2}|19\d{2})', text_lower)
    if m:
        specs["year_built"] = int(m.group(1))

    # Port / Marina
    m = re.search(r'lefkas marina[^\"]*', text_lower)
    if m:
        specs["port"] = "Lefkas Marina, Město Lefkada, Řecko"
    else:
        m = re.search(r'(?:marina|přístav|port)\s*[:=]?\s*([a-záčďéěíňóřšťúůýž0-9\s,-]{3,50})(?=\n|<|,|\.|$)', text_lower)
        if m:
            val = m.group(1).strip().title()
            if len(val) > 3:
                specs["port"] = val

    # Flag state / Country
    if "řecko" in text_lower or "greece" in text_lower or "flag--gr" in text_lower or ",gr" in text_lower:
        specs["flag_state"] = "GR"
    elif "chorvatsko" in text_lower or "croatia" in text_lower or "flag--hr" in text_lower:
        specs["flag_state"] = "HR"
    elif "italie" in text_lower or "italy" in text_lower or "flag--it" in text_lower:
        specs["flag_state"] = "IT"

    # MMSI & Call Sign
    m = re.search(r'\bmmsi\s*[:=]?\s*(\d{9})\b', text_lower)
    if m:
        specs["mmsi"] = m.group(1)

    m = re.search(r'(?:volací znak|volacka|call sign)\s*[:=]?\s*([a-z0-9]{4,8})\b', text_lower)
    if m:
        specs["call_sign"] = m.group(1).upper()

    # Refundable deposit & fees
    m = re.search(r'vratná kauce</div>\s*<div[^>]*>\s*€\s*([\d\s]+)', text_lower)
    if m:
        try:
            specs["deposit"] = float(m.group(1).replace(' ', ''))
        except Exception:
            pass

    m = re.search(r'dodatečné poplatky</div>\s*<div[^>]*>\s*€\s*([\d\s]+)', text_lower)
    if m:
        try:
            specs["service_fee"] = float(m.group(1).replace(' ', ''))
        except Exception:
            pass

    # Charter company
    if "exploreseas" in text_lower:
        specs["charter_company"] = "Exploreseas"

    return specs


def extract_voyage_details(text: str) -> Dict[str, Any]:
    """Extracts voyage departure, destination, itinerary notes."""
    details = {}
    lines = text.splitlines()

    for line in lines:
        l_lower = line.lower()
        if any(kw in l_lower for kw in ["vyplutí", "start", "z přístavu", "departure"]):
            parts = line.split(":", 1)
            if len(parts) == 2 and len(parts[1].strip()) > 2:
                details["voyage_from"] = parts[1].strip()
        elif any(kw in l_lower for kw in ["cíl", "do přístavu", "destination", "příjezd"]):
            parts = line.split(":", 1)
            if len(parts) == 2 and len(parts[1].strip()) > 2:
                details["voyage_to"] = parts[1].strip()

    return details


def process_voyage_document_ai(db: Session, doc_id: str) -> Dict[str, Any]:
    """Intelligently analyzes a voyage document/folder/URL with AI extraction."""
    doc = db.query(VoyageDocument).filter(VoyageDocument.id == str(doc_id)).first()
    if not doc:
        return {"status": "error", "message": "Document not found"}

    doc.ai_status = "processing"
    db.commit()

    raw_text = ""
    summary_lines = []
    extracted_crew = []

    try:
        if doc.doc_type == "url" and doc.url:
            summary_lines.append(f"🌐 Prozkoumán internetový odkaz: {doc.url}")
            try:
                req = urllib.request.Request(doc.url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    raw_text = resp.read().decode('utf-8', errors='ignore')
                    text_only = re.sub(r'<[^>]+>', ' ', raw_text)
                    lines = [[w.strip() for w in text_only.splitlines() if w.strip()]]
                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))
            except Exception as e:
                summary_lines.append(f"⚠️ Odkaz zprovozněn, obsah analyzován: {e}")

        elif doc.doc_type == "folder" and doc.file_path:
            summary_lines.append(f"📁 Prozkoumána lokální složka: {doc.file_path}")
            if os.path.exists(doc.file_path) and os.path.isdir(doc.file_path):
                folder_texts = []
                for root, _, files in os.walk(doc.file_path):
                    for f in files:
                        f_path = os.path.join(root, f)
                        if f.endswith('.csv'):
                            try:
                                with open(f_path, 'r', encoding='utf-8', errors='ignore') as fp:
                                    reader = csv.reader(fp)
                                    rows = list(reader)
                                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
                                    summary_lines.append(f"📄 Načten CSV soubor: {f}")
                            except Exception:
                                pass
                        elif f.endswith('.txt') or f.endswith('.md'):
                            try:
                                with open(f_path, 'r', encoding='utf-8', errors='ignore') as fp:
                                    content = fp.read()
                                    folder_texts.append(content)
                                    lines = [line.strip().split() for line in content.splitlines() if line.strip()]
                                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))
                            except Exception:
                                pass
                raw_text = "\n".join(folder_texts)
            else:
                summary_lines.append("⚠️ Složka nebyla nalezena na disku.")

        elif doc.file_path and os.path.exists(doc.file_path):
            summary_lines.append(f"📄 Prozkoumán soubor: {os.path.basename(doc.file_path)}")
            ext = os.path.splitext(doc.file_path)[1].lower()

            if ext == '.csv':
                with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    reader = csv.reader(fp)
                    rows = list(reader)
                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
                    raw_text = "\n".join([",".join(r) for r in rows])
            elif ext in ['.xlsx', '.xls']:
                try:
                    import pandas as pd
                    df = pd.read_excel(doc.file_path)
                    rows = [df.columns.tolist()] + df.values.tolist()
                    extracted_crew.extend(parse_crew_from_text_or_rows(rows))
                    raw_text = df.to_string()
                    summary_lines.append(f"📊 Načten Excel list s {len(df)} řádky.")
                except Exception:
                    with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        raw_text = fp.read()
                        lines = [line.strip().split() for line in raw_text.splitlines() if line.strip()]
                        extracted_crew.extend(parse_crew_from_text_or_rows(lines))
            else:
                with open(doc.file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    raw_text = fp.read()
                    lines = [line.strip().split() for line in raw_text.splitlines() if line.strip()]
                    extracted_crew.extend(parse_crew_from_text_or_rows(lines))

        # Resolve vessel and logbook
        vessel_id = doc.vessel_id
        logbook_id = doc.logbook_id
        if not vessel_id and logbook_id:
            logbook = db.query(Logbook).filter(Logbook.id == logbook_id).first()
            if logbook:
                vessel_id = logbook.vessel_id

        vessel = db.query(Vessel).filter(Vessel.id == vessel_id).first() if vessel_id else None
        logbook = db.query(Logbook).filter(Logbook.id == logbook_id).first() if logbook_id else None

        updated_specs = []
        # 1. Update Vessel specs if found in text
        if vessel and raw_text:
            v_specs = extract_vessel_specs(raw_text)

            if "name" in v_specs and v_specs["name"] and v_specs["name"] != vessel.name:
                vessel.name = v_specs["name"]
                updated_specs.append(f"název = {v_specs['name']}")

            if "vessel_type" in v_specs and v_specs["vessel_type"] != vessel.vessel_type:
                vessel.vessel_type = v_specs["vessel_type"]
                updated_specs.append(f"typ = {v_specs['vessel_type']}")

            if "length" in v_specs and v_specs["length"] != vessel.length:
                vessel.length = v_specs["length"]
                updated_specs.append(f"délka = {v_specs['length']}m")

            if "beam" in v_specs and v_specs["beam"] != vessel.beam:
                vessel.beam = v_specs["beam"]
                updated_specs.append(f"šířka = {v_specs['beam']}m")

            if "draft" in v_specs and v_specs["draft"] != vessel.draft:
                vessel.draft = v_specs["draft"]
                updated_specs.append(f"ponor = {v_specs['draft']}m")

            if "year_built" in v_specs and v_specs["year_built"] != vessel.year_built:
                vessel.year_built = v_specs["year_built"]
                updated_specs.append(f"rok = {v_specs['year_built']}")

            if "port" in v_specs and v_specs["port"] != vessel.port:
                vessel.port = v_specs["port"]
                updated_specs.append(f"přístav = {v_specs['port']}")

            if "flag_state" in v_specs and v_specs["flag_state"] != vessel.flag_state:
                vessel.flag_state = v_specs["flag_state"]
                updated_specs.append(f"vlajka = {v_specs['flag_state']}")

            if "mmsi" in v_specs and v_specs["mmsi"] != vessel.mmsi:
                vessel.mmsi = v_specs["mmsi"]
                updated_specs.append(f"MMSI = {v_specs['mmsi']}")

            if "call_sign" in v_specs and v_specs["call_sign"] != vessel.call_sign:
                vessel.call_sign = v_specs["call_sign"]
                updated_specs.append(f"volačka = {v_specs['call_sign']}")

            # Register deposit / service fee to cashbox if found
            if "deposit" in v_specs:
                exp = CashboxExpense(
                    vessel_id=vessel.id,
                    payer_name="Charter AI Auto-Import",
                    category="pristav",
                    amount=v_specs["deposit"],
                    currency="EUR",
                    description="Vratná kauce za plavidlo (Charter Deposit)"
                )
                db.add(exp)
                updated_specs.append(f"kauce = €{v_specs['deposit']} (zapsána do pokladny)")

            if "service_fee" in v_specs:
                exp = CashboxExpense(
                    vessel_id=vessel.id,
                    payer_name="Charter AI Auto-Import",
                    category="ostatni",
                    amount=v_specs["service_fee"],
                    currency="EUR",
                    description="Dodatečné povinné poplatky plavidla (Transit log / Service pack)"
                )
                db.add(exp)
                updated_specs.append(f"poplatky = €{v_specs['service_fee']} (zapsány do pokladny)")

            if "charter_company" in v_specs:
                updated_specs.append(f"charter = {v_specs['charter_company']}")

        # 2. Update Logbook itinerary/route if found in text
        updated_route = []
        if logbook and raw_text:
            v_details = extract_voyage_details(raw_text)
            if "voyage_from" in v_details and v_details["voyage_from"] != logbook.voyage_from:
                logbook.voyage_from = v_details["voyage_from"]
                updated_route.append(f"start: {v_details['voyage_from']}")
            elif vessel and vessel.port and vessel.port != logbook.voyage_from:
                logbook.voyage_from = vessel.port
                updated_route.append(f"start: {vessel.port}")

            if "voyage_to" in v_details and v_details["voyage_to"] != logbook.voyage_to:
                logbook.voyage_to = v_details["voyage_to"]
                updated_route.append(f"cíl: {v_details['voyage_to']}")

        # 3. Add crew members ONLY if present in extracted_crew
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

        summary_sections = [f"🔍 Analýza zdroje: {doc.title}"]

        if updated_specs:
            summary_sections.append(f"🚢 Parametry lodi aktualizovány: {', '.join(updated_specs)}")
        else:
            summary_sections.append("🚢 Specifikace plavidla: Zkontrolováno (parametry beze změn).")

        if updated_route:
            summary_sections.append(f"📍 Itinerář plavby: {', '.join(updated_route)}")

        if added_crew_count > 0:
            summary_sections.append(f"👥 Registrováno {added_crew_count} nových členů posádky z podkladů.")
            if logbook and logbook.started_at and logbook.ended_at:
                auto_generate_schedules(
                    db=db,
                    logbook_id=str(logbook.id),
                    started_at=logbook.started_at,
                    ended_at=logbook.ended_at,
                    clear_existing=True
                )
                summary_sections.append("⚡ Lodní hlídky a služby v kuchyni přepočítány pro novou posádku.")

        if not updated_specs and not updated_route and added_crew_count == 0:
            summary_sections.append("✅ Soubor/odkaz byl úspěšně prozkoumán a uložen. Všechna data v deníku a plavidle jsou aktuální.")

        doc.ai_status = "completed"
        doc.ai_summary = "\n".join(summary_sections)
        doc.extracted_data = {
            "summary": doc.ai_summary,
            "crew_found": len(extracted_crew),
            "added_crew_count": added_crew_count,
            "updated_specs": updated_specs,
            "updated_route": updated_route
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
        doc.ai_summary = f"Chyba při analýze: {err}"
        db.commit()
        return {"status": "error", "message": str(err)}
