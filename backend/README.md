# Logbook Backend — FastAPI

## Quick Start

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Docs
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Structure
```
backend/
├── app/
│   ├── main.py           # App entry point
│   ├── config.py         # Configuration
│   ├── database.py       # DB connection
│   ├── api/              # API routes
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── vessels.py
│   │   │   ├── logbooks.py
│   │   │   ├── entries.py
│   │   │   ├── gps.py
│   │   │   ├── ai.py
│   │   │   ├── export.py
│   │   │   └── modules.py
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── core/             # Auth, events, audit
│   └── modules/          # Plugin system
├── tests/
├── alembic/              # Migrations
├── Dockerfile
└── requirements.txt
```
