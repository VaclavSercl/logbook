"""Database seed script for default modules."""
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Module
from datetime import datetime

DEFAULT_MODULES = [
    {
        "name": "Počasí a meteo stanice",
        "slug": "weather",
        "version": "1.0.0",
        "description": "Zobrazuje aktuální informace o počasí, barometrický tlak, teplotu vody a vzduchu.",
        "icon": "CloudSun",
        "is_active": True,
        "is_installed": True,
        "config": {}
    },
    {
        "name": "Posádka a hlídky",
        "slug": "crew",
        "version": "1.0.0",
        "description": "Správa seznamu posádky, rozdělení do hlídek (watches) a služeb v lodní kuchyni (galley).",
        "icon": "Users",
        "is_active": True,
        "is_installed": True,
        "config": {}
    },
    {
        "name": "Fotogalerie plavby",
        "slug": "gallery",
        "version": "1.0.0",
        "description": "Ukládání fotografií s vazbou na GPS souřadnice a čas pořízení.",
        "icon": "Image",
        "is_active": False,
        "is_installed": False,
        "config": {}
    },
    {
        "name": "Lodní pokladna",
        "slug": "cashflow",
        "version": "1.0.0",
        "description": "Evidence nákladů na plavbu, rozpočítání útrat mezi členy posádky.",
        "icon": "DollarSign",
        "is_active": False,
        "is_installed": False,
        "config": {}
    },
    {
        "name": "Údržba plavidla",
        "slug": "maintenance",
        "version": "1.0.0",
        "description": "Plánování a evidence servisních prací, kontrola motorových hodin a stavu zásob.",
        "icon": "Wrench",
        "is_active": False,
        "is_installed": False,
        "config": {}
    }
]

def seed_default_modules(db: Session):
    for mod_data in DEFAULT_MODULES:
        result = db.execute(select(Module).where(Module.slug == mod_data["slug"]))
        existing = result.scalar_one_or_none()
        if not existing:
            new_module = Module(
                name=mod_data["name"],
                slug=mod_data["slug"],
                version=mod_data["version"],
                description=mod_data["description"],
                icon=mod_data["icon"],
                is_active=mod_data["is_active"],
                is_installed=mod_data["is_installed"],
                config=mod_data["config"],
                installed_at=datetime.utcnow() if mod_data["is_installed"] else None
            )
            db.add(new_module)
    db.commit()
