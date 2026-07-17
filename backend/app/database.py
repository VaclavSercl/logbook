"""Database connection and session management."""
import sqlite3
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Register UUID adapter for SQLite compatibility
sqlite3.register_adapter(uuid.UUID, str)

from app.config import settings

DATABASE_URL = settings.DATABASE_URL

# Ošetřit connect_args pouze pro sqlite
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(DATABASE_URL, echo=settings.DEBUG, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
