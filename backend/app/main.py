"""Logbook — Smart AI Maritime Logbook Platform
Main application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed_modules import seed_default_modules
from app.services.audit_service import register_audit_listeners
from app.api.v1 import auth, vessels, logbooks, entries, gps, ai, export, modules, dashboard, sparrow, crew, weather, watches, galley

# Register SQLAlchemy audit listeners
register_audit_listeners()


# Create tables
Base.metadata.create_all(bind=engine)

# Seed default modules
db = SessionLocal()
try:
    seed_default_modules(db)
finally:
    db.close()

app = FastAPI(
    title="Logbook API",
    description="Smart AI Maritime Logbook Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# API routes
api_prefix = "/api/v1"
app.include_router(auth.router, prefix=f"{api_prefix}/auth", tags=["auth"])
app.include_router(vessels.router, prefix=f"{api_prefix}/vessels", tags=["vessels"])
app.include_router(logbooks.router, prefix=f"{api_prefix}/logbooks", tags=["logbooks"])
app.include_router(entries.router, prefix=f"{api_prefix}/entries", tags=["entries"])
app.include_router(gps.router, prefix=f"{api_prefix}/gps", tags=["gps"])
app.include_router(ai.router, prefix=f"{api_prefix}/ai", tags=["ai"])
app.include_router(export.router, prefix=f"{api_prefix}/export", tags=["export"])
app.include_router(modules.router, prefix=f"{api_prefix}/modules", tags=["modules"])
app.include_router(dashboard.router, prefix=f"{api_prefix}/dashboard", tags=["dashboard"])
app.include_router(sparrow.router, prefix=f"{api_prefix}/sparrow", tags=["sparrow"])
app.include_router(crew.router, prefix=f"{api_prefix}/crew", tags=["crew"])
app.include_router(weather.router, prefix=f"{api_prefix}/weather", tags=["weather"])
app.include_router(watches.router, prefix=f"{api_prefix}/watches", tags=["watches"])
app.include_router(galley.router, prefix=f"{api_prefix}/galley", tags=["galley"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


import asyncio
from app.services.telegram_bot import run_telegram_bot

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_telegram_bot())
