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
    beam: Optional[float]
    draft: Optional[float]
    year_built: Optional[int]
    flag_state: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Logbook ───────────────────────────────────────────

class LogbookCreate(BaseModel):
    vessel_id: UUID
    title: str = Field(..., max_length=255)
    voyage_from: Optional[str] = None
    voyage_to: Optional[str] = None
    is_public: Optional[bool] = True


class LogbookResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    title: str
    voyage_from: Optional[str]
    voyage_to: Optional[str]
    status: str
    is_public: bool
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


# ── Dashboard ─────────────────────────────────────────

class DashboardStatsResponse(BaseModel):
    vessels: int
    logbooks: int
    entries: int
    activeModules: int


# ── Crew Member ───────────────────────────────────────

class CrewMemberCreate(BaseModel):
    vessel_id: UUID
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    nickname: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    include_in_watches: bool = True
    include_in_galley: bool = True


class CrewMemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    include_in_watches: Optional[bool] = None
    include_in_galley: Optional[bool] = None


class CrewMemberResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    name: str
    role: Optional[str]
    nationality: Optional[str]
    passport_number: Optional[str]
    date_of_birth: Optional[datetime]
    include_in_watches: bool = True
    include_in_galley: bool = True
    joined_at: datetime

    class Config:
        from_attributes = True


# ── Weather ───────────────────────────────────────────

class WeatherResponse(BaseModel):
    temperature: float
    humidity: float
    pressure: float
    wind_speed: float
    wind_direction: str
    visibility: float
    sea_state: str
    clouds: float

# ── Watch Groups & Schedules ──────────────────────────

class WatchGroupCreate(BaseModel):
    vessel_id: UUID
    name: str = Field(..., max_length=100)
    member_ids: List[UUID] = []


class WatchGroupResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    name: str
    members: List[CrewMemberResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class WatchScheduleCreate(BaseModel):
    logbook_id: UUID
    watch_group_id: UUID
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None


class WatchScheduleResponse(BaseModel):
    id: UUID
    logbook_id: UUID
    watch_group_id: UUID
    watch_group: WatchGroupResponse
    start_time: datetime
    end_time: datetime
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Galley Duties ─────────────────────────────────────

class GalleyDutyCreate(BaseModel):
    logbook_id: UUID
    date: datetime
    cook_id: UUID
    cleaner_id: UUID
    notes: Optional[str] = None


class GalleyDutyResponse(BaseModel):
    id: UUID
    logbook_id: UUID
    date: datetime
    cook_id: UUID
    cook: CrewMemberResponse
    cleaner_id: UUID
    cleaner: CrewMemberResponse
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── AIS ───────────────────────────────────────────────

class AisTargetCreate(BaseModel):
    logbook_id: UUID
    mmsi: str = Field(..., max_length=20)
    name: Optional[str] = None
    call_sign: Optional[str] = None
    ship_type: Optional[str] = None
    latitude: float
    longitude: float
    speed: Optional[float] = None
    course: Optional[float] = None
    heading: Optional[float] = None


class AisTargetResponse(BaseModel):
    id: UUID
    logbook_id: UUID
    mmsi: str
    name: Optional[str]
    call_sign: Optional[str]
    ship_type: Optional[str]
    latitude: float
    longitude: float
    speed: Optional[float]
    course: Optional[float]
    heading: Optional[float]
    cpa: Optional[float]
    tcpa: Optional[float]
    is_danger: bool
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Geofence Zones ────────────────────────────────────

class GeofenceZoneCreate(BaseModel):
    logbook_id: UUID
    name: str = Field(..., max_length=100)
    zone_type: str = "anchor_watch"  # anchor_watch, marina, danger_zone
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: Optional[float] = None
    polygon_coordinates: Optional[List[List[float]]] = None
    is_active: Optional[bool] = True


class GeofenceZoneResponse(BaseModel):
    id: UUID
    logbook_id: UUID
    name: str
    zone_type: str
    latitude: Optional[float]
    longitude: Optional[float]
    radius: Optional[float]
    polygon_coordinates: Optional[List[List[float]]]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Cashbox Expenses ─────────────────────────────────

class CashboxExpenseCreate(BaseModel):
    vessel_id: UUID
    payer_name: Optional[str] = "Kapitán"
    category: str = "proviant"
    amount: float
    currency: str = "EUR"
    description: str


class CashboxExpenseResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    payer_name: Optional[str]
    category: str
    amount: float
    currency: str
    description: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ── Anchor Log & Alarm ────────────────────────────────

class AnchorLogCreate(BaseModel):
    vessel_id: UUID
    latitude: float
    longitude: float
    depth: Optional[float] = None
    chain_length: Optional[float] = None
    alarm_radius: Optional[float] = 30.0
    notes: Optional[str] = None


class AnchorLogResponse(BaseModel):
    id: UUID
    vessel_id: UUID
    status: str
    latitude: float
    longitude: float
    depth: Optional[float]
    chain_length: Optional[float]
    alarm_radius: Optional[float]
    notes: Optional[str]
    dropped_at: datetime
    raised_at: Optional[datetime]

    class Config:
        from_attributes = True

