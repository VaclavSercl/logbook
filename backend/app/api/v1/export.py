"""Export routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from fpdf import FPDF
from fpdf.fonts import FontFace

from app.database import get_db
from app.models import Logbook, LogEntry
from app.api.v1.auth import get_current_user

router = APIRouter()


def format_coordinate(val, is_lat):
    if val is None:
        return "N/A"
    direction = "N" if is_lat else "E"
    if is_lat and val < 0:
        direction = "S"
    elif not is_lat and val < 0:
        direction = "W"
    abs_val = abs(val)
    degrees = int(abs_val)
    minutes = (abs_val - degrees) * 60
    return f"{degrees:02d}°{minutes:05.2f}' {direction}"


@router.get("/pdf/{logbook_id}")
async def export_pdf(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export logbook as PDF."""
    result = db.execute(select(Logbook).where(Logbook.id == str(logbook_id)))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    result = db.execute(
        select(LogEntry).where(LogEntry.logbook_id == str(logbook_id)).order_by(LogEntry.timestamp)
    )
    entries = result.scalars().all()

    pdf_content = _generate_pdf_content(logbook, entries)

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=logbook_{logbook_id}.pdf"},
    )


@router.get("/gpx/{logbook_id}")
async def export_gpx(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export logbook track as GPX."""
    result = db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == str(logbook_id))
        .where(LogEntry.latitude.isnot(None))
        .order_by(LogEntry.timestamp)
    )
    entries = result.scalars().all()

    gpx = _generate_gpx(entries)
    return Response(
        content=gpx,
        media_type="application/gpx+xml",
        headers={"Content-Disposition": f"attachment; filename=track_{logbook_id}.gpx"},
    )


@router.get("/csv/{logbook_id}")
async def export_csv(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export logbook as CSV."""
    result = db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == str(logbook_id))
        .order_by(LogEntry.timestamp)
    )
    entries = result.scalars().all()

    csv_content = _generate_csv(entries)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=logbook_{logbook_id}.csv"},
    )


def _generate_pdf_content(logbook, entries):
    """Generate PDF content using fpdf2."""
    vessel = logbook.vessel  # SQLAlchemy relationship auto-load
    
    # Custom PDF class
    class LogbookPDF(FPDF):
        def header(self):
            # Header text
            self.set_font("helvetica", "B", 10)
            self.set_text_color(44, 62, 80) # Dark Blue-Gray
            self.cell(0, 5, "OFFICIAL MARITIME LOGBOOK - IMO STANDARD COMPLIANT", align="L")
            self.ln()
            
            # Decorative horizontal bar
            self.set_draw_color(44, 62, 80)
            self.set_line_width(0.5)
            self.line(15, 21, 282, 21)
            self.ln(5)

        def footer(self):
            # Separation line for footer
            self.set_draw_color(189, 195, 199)
            self.set_line_width(0.2)
            self.line(15, 198, 282, 198)
            
            self.set_y(-12)
            self.set_font("helvetica", "I", 8)
            self.set_text_color(127, 140, 141)
            
            # Page numbering
            self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="R")
            
            # Status / Digital Hash
            self.set_x(15)
            status_text = f"Status: {logbook.status.upper()}"
            if logbook.signed_hash:
                status_text += f" | Digitally Signed: {logbook.signed_hash}"
            self.cell(0, 5, status_text, align="L")

    # Create landscape PDF
    pdf = LogbookPDF(orientation="landscape", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, f"LOGBOOK: {logbook.title}")
    pdf.ln()
    pdf.ln(2)
    
    # Metadata block (Vessel & Voyage)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    
    # Gather Vessel details
    v_name = vessel.name if vessel else "N/A"
    v_imo = f"IMO {vessel.imo}" if (vessel and vessel.imo) else "N/A"
    v_mmsi = vessel.mmsi if (vessel and vessel.mmsi) else "N/A"
    v_call = vessel.call_sign if (vessel and vessel.call_sign) else "N/A"
    
    voy_from = logbook.voyage_from or "N/A"
    voy_to = logbook.voyage_to or "N/A"
    started = logbook.started_at.strftime("%Y-%m-%d %H:%M UTC") if logbook.started_at else "N/A"
    closed = logbook.closed_at.strftime("%Y-%m-%d %H:%M UTC") if logbook.closed_at else "N/A"
    
    # Two columns layout
    # Col 1: Vessel Info
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "Vessel Name:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, v_name)
    
    # Col 2: Voyage Departure
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(35, 6, "Port of Departure:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, voy_from)
    pdf.ln()
    
    # Row 2
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "IMO Number:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, v_imo)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(35, 6, "Port of Destination:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, voy_to)
    pdf.ln()
    
    # Row 3
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "MMSI / Call Sign:")
    pdf.set_font("helvetica", "", 10)
    mmsi_call = f"{v_mmsi} / {v_call}" if (v_mmsi != "N/A" or v_call != "N/A") else "N/A"
    pdf.cell(100, 6, mmsi_call)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(35, 6, "Voyage Started:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, started)
    pdf.ln()
    
    # Row 4
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "Vessel Type:")
    pdf.set_font("helvetica", "", 10)
    v_type = vessel.vessel_type if vessel else "N/A"
    pdf.cell(100, 6, v_type)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(35, 6, "Voyage Closed:")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(100, 6, closed)
    pdf.ln()
    
    pdf.ln(5)
    
    # Logbook entries header
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 8, f"Logbook Entries ({len(entries)})")
    pdf.ln()
    pdf.ln(1)
    
    # Entries Table
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(0, 0, 0)
    
    with pdf.table(
        col_widths=(35, 45, 25, 45, 117),
        headings_style=FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=(44, 62, 80)),
        line_height=5,
        padding=2,
        repeat_headings=True,
    ) as table:
        # Table Header Row
        row = table.row()
        row.cell("Date / Time")
        row.cell("Position")
        row.cell("Course / Speed")
        row.cell("Environment")
        row.cell("Notes & Comments")
        
        # Populate rows
        if not entries:
            row = table.row()
            row.cell("No entries recorded during this voyage.", colspan=5)
        else:
            for entry in entries:
                row = table.row()
                
                # Column 1: Date/Time
                dt_str = entry.timestamp.strftime("%Y-%m-%d\n%H:%M UTC")
                row.cell(dt_str)
                
                # Column 2: Position
                lat_str = format_coordinate(entry.latitude, is_lat=True)
                lon_str = format_coordinate(entry.longitude, is_lat=False)
                pos_str = f"Lat: {lat_str}\nLon: {lon_str}"
                row.cell(pos_str)
                
                # Column 3: Course/Speed
                c_val = f"{entry.course:.0f}°" if entry.course is not None else "N/A"
                s_val = f"{entry.speed:.1f} kn" if entry.speed is not None else "N/A"
                cs_str = f"Co: {c_val}\nSp: {s_val}"
                row.cell(cs_str)
                
                # Column 4: Environment
                w_dir = f"{entry.wind_direction:.0f}°" if entry.wind_direction is not None else "N/A"
                w_spd = f"{entry.wind_speed:.1f} kn" if entry.wind_speed is not None else "N/A"
                press_val = f"{entry.pressure:.0f} hPa" if entry.pressure is not None else "N/A"
                sea_val = entry.sea_state if entry.sea_state else "N/A"
                env_str = f"Wind: {w_dir} / {w_spd}\nPress: {press_val}\nSea: {sea_val}"
                row.cell(env_str)
                
                # Column 5: Notes & Comments
                note_parts = []
                if entry.category:
                    note_parts.append(f"[{entry.category}]")
                if entry.notes:
                    note_parts.append(entry.notes)
                if entry.ai_comment:
                    note_parts.append(f"\nAI Comment: {entry.ai_comment}")
                notes_str = " ".join(note_parts) if note_parts else "No records."
                row.cell(notes_str)
                
    # Returns bytearray
    return bytes(pdf.output())


def _generate_gpx(entries):
    """Generate GPX XML."""
    gpx = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Logbook">
<trk><name>Track</name><trkseg>
"""
    for entry in entries:
        if entry.latitude and entry.longitude:
            gpx += f'  <trkpt lat="{entry.latitude}" lon="{entry.longitude}">'
            gpx += f'<time>{entry.timestamp.isoformat()}</time>'
            if entry.speed:
                gpx += f'<speed>{entry.speed}</speed>'
            gpx += '</trkpt>\n'
    gpx += "</trkseg></trk></gpx>"
    return gpx


def _generate_csv(entries):
    """Generate CSV content."""
    lines = ["timestamp,latitude,longitude,course,speed,wind_speed,pressure,notes,ai_comment"]
    for entry in entries:
        lines.append(
            f'"{entry.timestamp.isoformat()}","{entry.latitude or ""}","{entry.longitude or ""}",'
            f'"{entry.course or ""}","{entry.speed or ""}","{entry.wind_speed or ""}",'
            f'"{entry.pressure or ""}","{(entry.notes or "").replace(chr(34), chr(34)+chr(34))}",'
            f'"{(entry.ai_comment or "").replace(chr(34), chr(34)+chr(34))}"'
        )
    return "\n".join(lines)
