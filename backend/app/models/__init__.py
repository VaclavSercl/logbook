"""SQLAlchemy database models."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, BigInteger, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    role = Column(String(20), default="user")  # admin, captain, crew, viewer
    preferred_language = Column(String(5), default="cs")
    avatar_url = Column(Text)
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vessels = relationship("Vessel", back_populates="owner")
    crew_memberships = relationship("CrewMember", back_populates="user")


class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(String(255), nullable=False)
    imo = Column(String(20))
    mmsi = Column(String(20))
    call_sign = Column(String(20))
    port = Column(String(100))
    vessel_type = Column(String(50))
    length = Column(Float)
    beam = Column(Float)
    draft = Column(Float)
    year_built = Column(Integer)
    flag_state = Column(String(5))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="vessels")
    logbooks = relationship("Logbook", back_populates="vessel")
    crew = relationship("CrewMember", back_populates="vessel")


class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vessel_id = Column(UUID(as_uuid=True), ForeignKey("vessels.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(String(255), nullable=False)
    role = Column(String(50))  # captain, mate, engineer, deckhand
    nationality = Column(String(5))
    passport_number = Column(String(50))
    date_of_birth = Column(DateTime)
    joined_at = Column(DateTime, default=datetime.utcnow)

    vessel = relationship("Vessel", back_populates="crew")
    user = relationship("User", back_populates="crew_memberships")


class Logbook(Base):
    __tablename__ = "logbooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vessel_id = Column(UUID(as_uuid=True), ForeignKey("vessels.id"))
    title = Column(String(255), nullable=False)
    voyage_from = Column(String(255))
    voyage_to = Column(String(255))
    status = Column(String(20), default="active")  # active, closed, archived
    started_at = Column(DateTime)
    closed_at = Column(DateTime)
    signed_hash = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    vessel = relationship("Vessel", back_populates="logbooks")
    entries = relationship("LogEntry", back_populates="logbook", cascade="all, delete-orphan")


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    logbook_id = Column(UUID(as_uuid=True), ForeignKey("logbooks.id"))
    timestamp = Column(DateTime, nullable=False, index=True)
    position = Column(Geography(geometry_type="POINT", srid=4326))
    course = Column(Float)  # COG
    speed = Column(Float)  # SOG in knots
    wind_direction = Column(Float)
    wind_speed = Column(Float)
    pressure = Column(Float)  # hPa
    visibility = Column(Float)  # km
    sea_state = Column(String(50))
    temperature = Column(Float)
    engine_hours = Column(Float)
    fuel_level = Column(Float)
    battery_level = Column(Float)
    notes = Column(Text)
    ai_comment = Column(Text)
    category = Column(String(50))  # navigation, anchoring, incident, maintenance
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    modified_at = Column(DateTime)
    modified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    logbook = relationship("Logbook", back_populates="entries")
    media = relationship("Media", back_populates="entry", cascade="all, delete-orphan")


class GpsPoint(Base):
    __tablename__ = "gps_points"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vessel_id = Column(UUID(as_uuid=True), ForeignKey("vessels.id"), index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float)
    course = Column(Float)
    altitude = Column(Float)
    raw_nmea = Column(Text)
    source = Column(String(50), default="gps")


class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey("log_entries.id"))
    type = Column(String(20))  # photo, video, audio
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    file_size = Column(Integer)
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)
    metadata = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

    entry = relationship("LogEntry", back_populates="media")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(20), nullable=False)  # INSERT, UPDATE, DELETE
    old_value = Column(JSONB)
    new_value = Column(JSONB)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    ip_address = Column(String(45))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class Module(Base):
    __tablename__ = "modules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    version = Column(String(20), default="1.0.0")
    description = Column(Text)
    icon = Column(String(50))
    is_active = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=False)
    config = Column(JSONB, default={})
    installed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
