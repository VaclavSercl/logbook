"""Export routes."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Logbook, LogEntry
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/pdf/{logbook_id}")
async def export_pdf(
    logbook_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export logbook as PDF."""
    result = await db.execute(select(Logbook).where(Logbook.id == logbook_id))
    logbook = result.scalar_one_or_none()
    if not logbook:
        raise HTTPException(status_code=404, detail="Logbook not found")

    result = await db.execute(
        select(LogEntry).where(LogEntry.logbook_id == logbook_id).order_by(LogEntry.timestamp)
    )
    entries = result.scalars().all()

    # Generate simple PDF content (placeholder)
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
    db: AsyncSession = Depends(get_db),
):
    """Export logbook track as GPX."""
    result = await db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
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
    db: AsyncSession = Depends(get_db),
):
    """Export logbook as CSV."""
    result = await db.execute(
        select(LogEntry)
        .where(LogEntry.logbook_id == logbook_id)
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
    """Generate PDF content (simplified — use weasyprint in production)."""
    html = f"""
    <html>
    <head><title>Logbook - {logbook.title}</title></head>
    <body>
    <h1>{logbook.title}</h1>
    <p>Voyage: {logbook.voyage_from or 'N/A'} → {logbook.voyage_to or 'N/A'}</p>
    <p>Status: {logbook.status}</p>
    <hr>
    <h2>Entries ({len(entries)})</h2>
    """
    for entry in entries:
        html += f"""
        <div>
            <strong>{entry.timestamp.isoformat()}</strong>
            <p>Position: {entry.latitude or 'N/A'}, {entry.longitude or 'N/A'}</p>
            <p>Speed: {entry.speed or 'N/A'} kn | Course: {entry.course or 'N/A'}°</p>
            <p>Notes: {entry.notes or 'N/A'}</p>
            <p>AI: {entry.ai_comment or 'N/A'}</p>
        </div>
        <hr>
        """
    html += "</body></html>"
    return html.encode("utf-8")


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
