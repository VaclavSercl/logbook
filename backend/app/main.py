"""Logbook — Smart AI Maritime Logbook Platform
Main application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.api.v1 import auth, vessels, logbooks, entries, gps, ai, export, modules


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="Logbook API",
    description="Smart AI Maritime Logbook Platform",
    version="1.0.0",
    lifespan=lifespan,
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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
