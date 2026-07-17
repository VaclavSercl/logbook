# MEMORY.md — Paměť Njorora

## O projektu

- **Název:** Logbook — Smart AI Maritime Logbook Platform
- **Vytvořeno:** 15. 5. 2026
- **Účel:** Modulární SaaS platforma pro vedení lodního deníku řízeného AI
- **Jazyk:** Python (backend), TypeScript (frontend)
- **Platforma:** Next.js PWA + FastAPI + PostgreSQL/PostGIS + Redis + MinIO
- **Stav:** 🚧 fáze 1 — základní struktura hotová (MVP)

## Struktura projektu

```
logbook/
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/v1/    # auth, vessels, logbooks, entries, gps, ai, export, modules
│   │   ├── models/    # SQLAlchemy (User, Vessel, Logbook, LogEntry, GpsPoint, Media, AuditLog, Module)
│   │   ├── schemas/   # Pydantic
│   │   ├── config.py  # Settings
│   │   └── database.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # Next.js PWA
│   ├── src/app/       # page.tsx, login/, logbook/
│   ├── src/lib/api.ts # API client
│   ├── public/manifest.json
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml # PostgreSQL+PostGIS, Redis, Backend, Frontend, MinIO
├── .env.example
└── logbook.md         # Kompletní specifikace (997 řádků)
```

## Klíčová rozhodnutí

| Datum | Rozhodnutí | Důvod |
|-------|-----------|-------|
| 15.5.2026 | FastAPI + async SQLAlchemy | Rychlá AI integrace |
| 15.5.2026 | Next.js PWA | Offline-first, responzivita |
| 15.5.2026 | PostgreSQL + PostGIS | Geoprostorová data |
| 15.5.2026 | JWT autentizace | Bezpečný přístup |
| 15.5.2026 | Docker Compose | Snadné nasazení |
| 16.7.2026 | Implementace Crew & Weather | Dokončení chybějících modulů a stránek v Next.js a FastAPI. Zprovoznění Open-Meteo API. |
| 17.7.2026 | Oprava mapy & Live Polling | Vyřešení chybějící inicializace mapy MapLibre (mount state) a implementace tichého 10s auto-polling intervalu na frontendu pro okamžité zobrazení bodů z Telegram Live Location. |
| 17.7.2026 | Oprava UUID v SQLite | Vyřešení problému s mizejícími lodními deníky po refreshnutí stránky. SQLite neumí porovnat raw UUID objekty ze SQLAlchemy filtrů s textovými sloupci, opraveno přetypováním parametrů na string. |
| 17.7.2026 | Odstranění problikávání (Hydration flicker) | Rozdělení stavu mountování (hydration) a přihlášení (token) na všech klientských stránkách frontendu. Pokud ještě kód neběží na klientu, vykreslí se neutrální tmavý div, čímž se zamezilo problikávání přihlašovací / úvodní stránky pro přihlášeného uživatele. |
| 17.7.2026 | Funkce mazání deníků | Přidáno tlačítko "Smazat deník" na frontendu a implementován odpovídající DELETE endpoint na backendu. Při smazání deníku dojde k řetězovému (cascade) vymazání všech souvisejících záznamů, médií, rozpisů hlídek a služeb v kuchyni. |
| 17.7.2026 | Validace plavidla u deníků | Ošetřeno chování při vytváření deníku, pokud uživatel nemá žádnou loď. V takovém případě se v modálním okně zobrazí varování, tlačítko na vytvoření se zakáže a zobrazí se přímý odkaz na vytvoření lodi. Vytvoření bez vybrané lodi je odmítnuto i na úrovni JavaScriptové funkce s jasným chybovým hlášením. |

## Známé problémy / TODO

- Frontend: chybí pouze stránka galerie (gallery)
- Backend: AI endpoint je základní (potřebuje Ollama integraci)
- Backend: chybí WebSocket pro real-time GPS (dočasně vyřešeno 10s tichým pollingem na frontendu)
- Backend: chybí notifikační systém
- Chybí testy
- Chybí CI/CD pipeline

## Plány

- Fáze 2: AI & Moduly (Ollama, plugin systém)
- Fáze 3: Pokročilé funkce (AIS, COLREG, voice-to-log)
- Fáze 4: Enterprise (Kubernetes, multi-tenancy)

---

*Tato paměť je živá. S každým zápisem se Njoror stává chytřejším.*
