"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── User ──────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: Optional[str]
    role: str
    preferred_language: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Vessel ────────────────────────────────────────────

class VesselCreate(BaseModel):
    name: str = Field(..., max_length=255)
    imo: Optional[str] = None
    mmsi: Optional[str] = None
    call_sign: Optional[str] = None
    port: Optional[str] = None
    vessel_type: Optional[str] = None
    length: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    year_built: Optional[int] = None
    flag_state: Optional[str] = None


class VesselResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    imo: Optional[str]
    mmsi: Optional[str]
    call_sign: Optional[str]
    port: Optional[str]
    vessel_type: Optional[str]
    length: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Logbook ───────────────────────────────────────────

class LogbookCreate(BaseModel):
    vessel_id: UUID
    title: str = Field(..., max_length=255)
    voyage_from: Optional[str] = None
    voyage_to: Optional[str] = None


class LogbookResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    title: str
    voyage_from: Optional[str]
    voyage_to: Optional[str]
    status: str
    started_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Log Entry ─────────────────────────────────────────

class LogEntryCreate(BaseModel):
    logbook_id: UUID
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    course: Optional[float] = None
    speed: Optional[float] = None
    wind_direction: Optional[float] = None
    wind_speed: Optional[float] = None
    pressure: Optional[float] = None
    visibility: Optional[float] = None
    sea_state: Optional[str] = None
    temperature: Optional[float] = None
    engine_hours: Optional[float] = None
    fuel_level: Optional[float] = None
    battery_level: Optional[float] = None
    notes: Optional[str] = None
    category: Optional[str] = "navigation"


class LogEntryResponse(BaseModel):
    id: UUID
    logbook_id: UUID
    timestamp: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    course: Optional[float]
    speed: Optional[float]
    wind_direction: Optional[float]
    wind_speed: Optional[float]
    pressure: Optional[float]
    visibility: Optional[float]
    sea_state: Optional[str]
    notes: Optional[str]
    ai_comment: Optional[str]
    category: Optional[str]
    is_locked: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── GPS ───────────────────────────────────────────────

class GpsPointCreate(BaseModel):
    vessel_id: UUID
    timestamp: datetime
    latitude: float
    longitude: float
    speed: Optional[float] = None
    course: Optional[float] = None
    altitude: Optional[float] = None


class GpsPointResponse(BaseModel):
    id: int
    vessel_id: UUID
    timestamp: datetime
    latitude: float
    longitude: float
    speed: Optional[float]
    course: Optional[float]

    class Config:
        from_attributes = True


# ── AI ────────────────────────────────────────────────

class AiGenerateRequest(BaseModel):
    logbook_id: UUID
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    language: str = "cs"


class AiGenerateResponse(BaseModel):
    text: str
    entry_id: Optional[UUID] = None


# ── Export ────────────────────────────────────────────

class ExportRequest(BaseModel):
    logbook_id: UUID
    format: str = "pdf"  # pdf, gpx, csv, json
    language: str = "cs"
