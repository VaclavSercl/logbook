# MEMORY.md — Paměť Njorora

## O projektu

- **Název:** Logbook — Smart AI Maritime Logbook Platform
- **Vytvořeno:** 15. 5. 2026
- **Účel:** Modulární SaaS platforma pro vedení lodního deníku řízeného AI
- **Jazyk:** Python (backend), TypeScript (frontend)
- **Platforma:** Next.js PWA + FastAPI + PostgreSQL/PostGIS + Ollama
- **Stav:** 🚧 fáze 1 — specifikace hotová

## Klíčová rozhodnutí

| Datum | Rozhodnutí | Důvod |
|-------|-----------|-------|
| 15.5.2026 | Název "Logbook" | Jednoduchý, výstižný |
| 15.5.2026 | Veřejný repozitář | Open source přístup |
| 15.5.2026 | Python + TypeScript | Univerzální, rychlý vývoj |
| 15.5.2026 | Lowercase konvence | Konzistence a čitelnost |
| 15.5.2026 | Next.js PWA | Offline-first, responzivita |
| 15.5.2026 | FastAPI | Rychlá AI integrace |
| 15.5.2026 | PostgreSQL + PostGIS + TimescaleDB | Geoprostorová + time-series data |
| 15.5.2026 | Ollama (lokální LLM) | AI bez závislosti na cloudu |
| 15.5.2026 | Plugin architektura | Modularita, rozšiřitelnost |

## Specifikace

Kompletní specifikace v souboru `logbook.md`:
- Legislativní rámec (ČR + mezinárodní)
- Architektura systému
- Datový model (ER diagram + SQL)
- 18 modulů (P0-P3 priorita)
- AI Engine (LLM + RAG + tool calling)
- Frontend (Next.js PWA)
- Backend API (REST + WebSocket)
- Bezpečnost (zero-trust, E2E, audit)
- Offline-first strategie
- GPS hardware doporučení
- Roadmapa (4 fáze, 12 měsíců)

## Učení a poznatky

- PAT token (`github_pat...`) nemá oprávnět vytvářet repozitáře (403)
- Starý `ghp_` token funguje pro vše
- `gh auth login --with-token` může timeoutnout — použít Python API jako fallback

## Známé problémy

- GPS hardware ještě není integrován (plánováno fáze 1)
- Ollama vyžaduje dost RAM pro Llama 3 70B (plán: quantization)

## Plány do budoucna

- Fáze 1: MVP (měsíce 1-3)
- Fáze 2: AI & Moduly (měsíce 4-6)
- Fáze 3: Pokročilé funkce (měsíce 7-9)
- Fáze 4: Enterprise (měsíce 10-12)

---

*Tato paměť je živá. S každým zápisem se Njoror stává chytřejším.*
