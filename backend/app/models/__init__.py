"""SQLAlchemy database models (SQLite-compatible)."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, BigInteger, JSON
)
from sqlalchemy.types import TypeDecorator, UserDefinedType
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.database import Base


class SQLiteGeography(UserDefinedType):
    def get_col_spec(self, **kw):
        return 'TEXT'


class SQLiteCompatibleGeography(TypeDecorator):
    impl = SQLiteGeography
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__()
        self.geo_type = Geography(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(self.geo_type)
        return dialect.type_descriptor(SQLiteGeography())


def gen_uuid():

    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    role = Column(String(20), default="user")
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

    id = Column(String(36), primary_key=True, default=gen_uuid)
    owner_id = Column(String(36), ForeignKey("users.id"))
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
    logbooks = relationship("Logbook", back_populates="vessel", cascade="all, delete-orphan")
    crew = relationship("CrewMember", back_populates="vessel", cascade="all, delete-orphan")


class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vessel_id = Column(String(36), ForeignKey("vessels.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    name = Column(String(255), nullable=False)
    role = Column(String(50))
    nationality = Column(String(5))
    passport_number = Column(String(50))
    date_of_birth = Column(DateTime)
    joined_at = Column(DateTime, default=datetime.utcnow)

    vessel = relationship("Vessel", back_populates="crew")
    user = relationship("User", back_populates="crew_memberships")


class Logbook(Base):
    __tablename__ = "logbooks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vessel_id = Column(String(36), ForeignKey("vessels.id"))
    title = Column(String(255), nullable=False)
    voyage_from = Column(String(255))
    voyage_to = Column(String(255))
    status = Column(String(20), default="active")
    started_at = Column(DateTime)
    closed_at = Column(DateTime)
    signed_hash = Column(String(255))
    is_public = Column(Boolean, default=True, server_default="1")
    created_at = Column(DateTime, default=datetime.utcnow)

    vessel = relationship("Vessel", back_populates="logbooks")
    entries = relationship("LogEntry", back_populates="logbook", cascade="all, delete-orphan")


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    logbook_id = Column(String(36), ForeignKey("logbooks.id"))
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    position = Column(SQLiteCompatibleGeography('POINT', srid=4326), nullable=True)
    course = Column(Float)
    speed = Column(Float)
    wind_direction = Column(Float)
    wind_speed = Column(Float)
    pressure = Column(Float)
    visibility = Column(Float)
    sea_state = Column(String(50))
    temperature = Column(Float)
    engine_hours = Column(Float)
    fuel_level = Column(Float)
    battery_level = Column(Float)
    notes = Column(Text)
    ai_comment = Column(Text)
    category = Column(String(50))
    is_locked = Column(Boolean, default=False)
    entry_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    modified_at = Column(DateTime)
    modified_by = Column(String(36), ForeignKey("users.id"))

    logbook = relationship("Logbook", back_populates="entries")
    media = relationship("Media", back_populates="entry", cascade="all, delete-orphan")


class GpsPoint(Base):
    __tablename__ = "gps_points"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    vessel_id = Column(String(36), ForeignKey("vessels.id"), index=True)
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

    id = Column(String(36), primary_key=True, default=gen_uuid)
    entry_id = Column(String(36), ForeignKey("log_entries.id"))
    type = Column(String(20))
    url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    file_size = Column(Integer)
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)
    meta = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    entry = relationship("LogEntry", back_populates="media")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    action = Column(String(20), nullable=False)
    old_value = Column(JSON)
    new_value = Column(JSON)
    user_id = Column(String(36), ForeignKey("users.id"))
    ip_address = Column(String(45))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class Module(Base):
    __tablename__ = "modules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    version = Column(String(20), default="1.0.0")
    description = Column(Text)
    icon = Column(String(50))
    is_active = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=False)
    config = Column(JSON, default={})
    installed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


from sqlalchemy import Table

watch_group_members = Table(
    "watch_group_members",
    Base.metadata,
    Column("watch_group_id", String(36), ForeignKey("watch_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("crew_member_id", String(36), ForeignKey("crew_members.id", ondelete="CASCADE"), primary_key=True)
)


class WatchGroup(Base):
    __tablename__ = "watch_groups"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vessel_id = Column(String(36), ForeignKey("vessels.id"))
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("CrewMember", secondary=watch_group_members)


class WatchSchedule(Base):
    __tablename__ = "watch_schedules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    logbook_id = Column(String(36), ForeignKey("logbooks.id"))
    watch_group_id = Column(String(36), ForeignKey("watch_groups.id"))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    watch_group = relationship("WatchGroup")


class GalleyDuty(Base):
    __tablename__ = "galley_duties"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    logbook_id = Column(String(36), ForeignKey("logbooks.id"))
    date = Column(DateTime, nullable=False)
    cook_id = Column(String(36), ForeignKey("crew_members.id"))
    cleaner_id = Column(String(36), ForeignKey("crew_members.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    cook = relationship("CrewMember", foreign_keys=[cook_id])
    cleaner = relationship("CrewMember", foreign_keys=[cleaner_id])


class AisTarget(Base):
    __tablename__ = "ais_targets"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    logbook_id = Column(String(36), ForeignKey("logbooks.id"))
    mmsi = Column(String(20), nullable=False)
    name = Column(String(100))
    call_sign = Column(String(20))
    ship_type = Column(String(50))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float)
    course = Column(Float)
    heading = Column(Float)
    cpa = Column(Float)
    tcpa = Column(Float)
    is_danger = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    logbook = relationship("Logbook")


class GeofenceZone(Base):
    __tablename__ = "geofence_zones"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    logbook_id = Column(String(36), ForeignKey("logbooks.id"), index=True)
    name = Column(String(100), nullable=False)
    zone_type = Column(String(50), default="anchor_watch") # anchor_watch, marina, danger_zone
    latitude = Column(Float) # center latitude for circular zones
    longitude = Column(Float) # center longitude for circular zones
    radius = Column(Float) # radius in meters for circular zones
    polygon_coordinates = Column(JSON) # JSON list: [[lat, lng], [lat, lng], ...] for polygons
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    logbook = relationship("Logbook")



