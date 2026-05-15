# LOGBOOK.md — Smart AI Maritime Logbook Platform

> **Vytvořeno:** 15. 5. 2026
> **Autor:** Njoror — AI vládce projektu
> **Verze:** 1.0.0
> **Licence:** MIT (Open Source)

---

## 1. Přehled projektu

### 1.1 Co je Logbook

Logbook je **moderní inteligentní lodní deník** — modulární SaaS platforma pro vedení lodního deníku řízeného umělou inteligencí. Systém splňuje legislativu IMO, český zákon o námořní plavbě (61/2000 Sb.) a vyhlášku 278/2000 Sb.

### 1.2 Klíčové vlastnosti

- 🤖 **AI-driven** — automatické generování záznamů z GPS, AIS a senzorů
- 🧩 **Modulární** — plug-and-play moduly, zapínatelné/vypínatelné z UI
- 🌍 **Multijazyčný** — CZ, EN, DE, HR, IT, FR, ES
- 📱 **Responzivní PWA** — funguje na PC, tabletu i telefonu
- ✈️ **Offline-first** — plná funkčnost bez internetu
- 🔒 **Zero-trust security** — E2E encryption, audit trail, immutable logs
- 📄 **PDF export** — oficiální lodní deník s digitálním podpisem a QR validací
- 🗺️ **Interaktivní mapy** — OpenSeaMap, OpenStreetMap, trasy, geofencing

### 1.3 Cílové skupiny

- Rekreační jachtaři
- Charterové firmy
- Profesionální námořníci
- Lodní školy a výcviková centra

---

## 2. Legislativní rámec

### 2.1 Česká republika

| Předpis | Požadavky |
|---------|-----------|
| **Zákon č. 61/2000 Sb.** | Lodní deník je povinný, musí obsahovat identifikaci lodi, posádku, záznamy plavby |
| **Vyhláška č. 278/2000 Sb.** | Konkrétní náležitosti deníku, formát záznamů |
| **Státní plavební správa** | Kontrola deníků, právní věrohodnost |

**Povinné náležitosti dle ČR:**
- Jméno lodi, rejstříkové číslo (IMO/MMSI), volací znak
- Jméno velitele lodi
- Seznam posádky (jméno, příjmení, datum narození, státní příslušnost, číslo pasu, funkce)
- Čas a místo vyplutí/připlutí
- Průběžná pozice (interval 1-4 hodiny)
- Kurs a rychlost (COG, SOG)
- Stav počasí (vítr, moře, viditelnost, tlak)
- Technické údaje (palivo, voda, baterie, motorové hodiny)
- Mimořádné události (nehody, poruchy, manévry MOB)
- Denní uzávěrka podepsaná velitelem

### 2.2 Mezinárodní předpisy

| Standard | Oblast |
|----------|--------|
| **SOLAS** | Bezpečnost na moři, povinné deníky |
| **STCW** | Výcvik a certifikace námořníků |
| **COLREG** | Předpisy pro zabraňování srážkám na moři |
| **MARPOL** | Ochrana mořského prostředí |
| **UNCLOS** | Právo moře |
| **IMO A.916(22)** | Elektronické deníky, integrita dat |
| **IMO MSC.1/Circ.1592** | Směrnice pro elektronické lodní deníky |

### 2.3 Elektronický deník — právní požadavky

- **Audit trail** — každá změna musí být zaznamenána
- **Neměnitelnost** — uzavřené záznelze nelze mazat bez stopy
- **Digitální podpis** — kryptografické ověření integrity
- **Časové razítko** — UTC timestamp pro každý záznam
- **Archivace** — minimálně 3 roky (dle IMO)
- **Export** — možnost exportu pro úřady, pojišťovny, vyšetřování

### 2.4 GDPR a eIDAS

- Osobní údaje posádky — ochrana dle GDPR
- Elektronické podpisy — soulad s eIDAS
- Právo na výmaz vs. povinnost archivace — řešení anonymizací

---

## 3. Architektura systému

### 3.1 Vysokoúrovňová architektura

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (PWA)                     │
│  Next.js + React + TypeScript + Tailwind + Zustand      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Dashboard │ │  Deník   │ │  Mapa    │ │ Nastavení│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Module Loader (Plugin System)        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Offline Engine (IndexedDB + Sync Queue)    │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket + GraphQL
┌──────────────────────┴──────────────────────────────────┐
│                      BACKEND                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              API Gateway (Kong / Traefik)          │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ Auth Svc   │ │ Logbook Svc│ │ AI Orchestrator    │   │
│  │ (JWT/MFA)  │ │ (CRUD)     │ │ (LLM + RAG)        │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ GPS Svc    │ │ Media Svc  │ │ Weather Svc        │   │
│  │ (NMEA/SK)  │ │ (S3/MinIO) │ │ (OpenWeather)      │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ AIS Svc    │ │ Export Svc │ │ Notification Svc   │   │
│  │ (AIS feed) │ │ (PDF/GPX)  │ │ (Push/Email)       │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Event Bus (NATS / Kafka)              │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                      DATA LAYER                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ PostgreSQL │ │ TimescaleDB│ │ Redis              │   │
│  │ + PostGIS  │ │ (telemetry)│ │ (cache/sessions)   │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ MinIO / S3 │ │ Vector DB  │ │ ElasticSearch      │   │
│  │ (media)    │ │ (RAG/AI)   │ │ (full-text search) │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Vrstva | Technologie | Důvod |
|--------|-------------|-------|
| **Frontend** | Next.js 14, React 18, TypeScript | PWA, SSR, skvělá DX |
| **Styling** | Tailwind CSS + shadcn/ui | Rychlý vývoj, responzivita |
| **State** | Zustand | Lehký, jednoduchý |
| **Mapy** | MapLibre GL + OpenSeaMap | Open source, námořní charty |
| **Offline** | IndexedDB (Dexie.js) | Lokální storage v prohlížeči |
| **Backend** | FastAPI (Python) | Rychlé API, AI integrace |
| **AI** | Ollama + Llama 3 / Mistral | Lokální LLM, žádná závislost na cloudu |
| **Databáze** | PostgreSQL + PostGIS + TimescaleDB | Geoprostorová data, time-series |
| **Cache** | Redis | Sessions, real-time data |
| **Event Bus** | NATS | Lehký, rychlý messaging |
| **Storage** | MinIO | S3-kompatibilní object storage |
| **Search** | ElasticSearch | Full-text search v deníku |
| **Vector DB** | Qdrant | RAG pro AI |
| **Export** | WeasyPrint / Puppeteer | PDF generování |
| **Auth** | JWT + OAuth2 + MFA | Bezpečná autentizace |
| **Container** | Docker + Docker Compose | Snadné nasazení |
| **Orchestrace** | Kubernetes (volitelné) | Škálování |

---

## 4. Datový model

### 4.1 ER Diagram (zjednodušený)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │     │   vessels   │     │   crews     │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │────<│ owner_id(FK)│     │ vessel_id(FK)│
│ username    │     │ id (PK)     │────<│ user_id (FK) │
│ email       │     │ name        │     │ role         │
│ password    │     │ imo         │     │ joined_at    │
│ full_name   │     │ mmsi        │     └─────────────┘
│ role        │     │ call_sign   │
│ created_at  │     │ port        │     ┌─────────────┐
└─────────────┘     │ type        │     │   modules   │
                    │ length      │     ├─────────────┤
┌─────────────┐     │ created_at  │     │ id (PK)     │
│  logbooks   │     └─────────────┘     │ name        │
├─────────────┤                         │ slug        │
│ id (PK)     │     ┌─────────────┐     │ version     │
│ vessel_id(FK)│────│ log_entries │     │ enabled     │
│ title       │     ├─────────────┤     │ config      │
│ voyage_from │     │ id (PK)     │     │ installed_at│
│ voyage_to   │     │ logbook_id  │>────└─────────────┘
│ status      │     │ timestamp   │
│ created_at  │     │ position    │     ┌─────────────┐
│ closed_at   │     │ course      │     │ gps_points  │
│ signed_hash │     │ speed       │     ├─────────────┤
└─────────────┘     │ weather     │     │ id (PK)     │
                    │ wind_dir    │     │ vessel_id   │
┌─────────────┐     │ wind_speed  │     │ timestamp   │
│   media     │     │ pressure    │     │ latitude    │
├─────────────┤     │ visibility  │     │ longitude   │
│ id (PK)     │     │ sea_state   │     │ speed       │
│ entry_id(FK)│     │ engine_hrs  │     │ course      │
│ type        │     │ fuel_level  │     │ altitude    │
│ url         │     │ battery     │     │ raw_nmea    │
│ thumbnail   │     │ notes       │     └─────────────┘
│ metadata    │     │ ai_comment  │
│ gps_lat     │     │ category    │     ┌─────────────┐
│ gps_lon     │     │ is_locked   │     │  weather    │
│ created_at  │     │ created_at  │     ├─────────────┤
└─────────────┘     │ modified_at │     │ id (PK)     │
                    │ modified_by │     │ entry_id    │
┌─────────────┐     └─────────────┘     │ source      │
│  watch_org  │                         │ temperature │
├─────────────┤     ┌─────────────┐     │ humidity    │
│ id (PK)     │     │   ais_data  │     │ pressure    │
│ vessel_id   │     ├─────────────┤     │ wind_speed  │
│ name        │     │ id (PK)     │     │ wind_dir    │
│ start_time  │     │ vessel_id   │     │ visibility  │
│ end_time    │     │ mmsi        │     │ clouds      │
│ crew_id     │     │ ship_name   │     │ fetched_at  │
└─────────────┘     │ latitude    │     └─────────────┘
                    │ longitude   │
┌─────────────┐     │ cog         │     ┌─────────────┐
│  cashflow   │     │ sog         │     │ audit_log   │
├─────────────┤     │ heading     │     ├─────────────┤
│ id (PK)     │     │ timestamp   │     │ id (PK)     │
│ vessel_id   │     └─────────────┘     │ table_name  │
│ category    │                         │ record_id   │
│ amount      │     ┌─────────────┐     │ action      │
│ currency    │     │  incidents  │     │ old_value   │
│ description │     ├─────────────┤     │ new_value   │
│ receipt_url │     │ id (PK)     │     │ user_id     │
│ created_at  │     │ vessel_id   │     │ timestamp   │
└─────────────┘     │ type        │     └─────────────┘
                    │ severity    │
                    │ description │
                    │ position    │
                    │ timestamp   │
                    │ resolved_at│
                    └─────────────┘
```

### 4.2 Klíčové tabulky

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(20) DEFAULT 'user',  -- admin, captain, crew, viewer
    preferred_language VARCHAR(5) DEFAULT 'cs',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### vessels
```sql
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    imo VARCHAR(20),
    mmsi VARCHAR(20),
    call_sign VARCHAR(20),
    port VARCHAR(100),
    vessel_type VARCHAR(50),  -- sailboat, motorboat, catamaran, etc.
    length DECIMAL(6,2),      -- metres
    beam DECIMAL(5,2),
    draft DECIMAL(4,2),
    year_built INT,
    flag_state VARCHAR(5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### logbooks
```sql
CREATE TABLE logbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID REFERENCES vessels(id),
    title VARCHAR(255) NOT NULL,
    voyage_from VARCHAR(255),
    voyage_to VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',  -- active, closed, archived
    started_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    signed_hash VARCHAR(255),  -- cryptographic hash for integrity
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### log_entries
```sql
CREATE TABLE log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_id UUID REFERENCES logbooks(id),
    timestamp TIMESTAMPTZ NOT NULL,
    position GEOGRAPHY(POINT, 4326),  -- PostGIS
    course DECIMAL(5,2),              -- COG in degrees
    speed DECIMAL(5,2),               -- SOG in knots
    weather JSONB,                    -- weather data
    wind_direction DECIMAL(5,2),
    wind_speed DECIMAL(5,2),
    pressure DECIMAL(7,2),            -- hPa
    visibility DECIMAL(6,2),          -- km
    sea_state VARCHAR(50),
    engine_hours DECIMAL(8,2),
    fuel_level DECIMAL(5,2),          -- percentage or litres
    battery_level DECIMAL(5,2),       -- percentage
    notes TEXT,
    ai_comment TEXT,                  -- AI-generated narrative
    category VARCHAR(50),             -- navigation, anchoring, incident, etc.
    is_locked BOOLEAN DEFAULT false,  -- after daily closure
    created_at TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ,
    modified_by UUID REFERENCES users(id)
);

-- Index for fast time-range queries
CREATE INDEX idx_log_entries_time ON log_entries (logbook_id, timestamp);
CREATE INDEX idx_log_entries_position ON log_entries USING GIST (position);
```

#### gps_points (time-series)
```sql
CREATE TABLE gps_points (
    id BIGSERIAL PRIMARY KEY,
    vessel_id UUID REFERENCES vessels(id),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    speed DECIMAL(5,2),
    course DECIMAL(5,2),
    altitude DECIMAL(8,2),
    raw_nmea TEXT,
    source VARCHAR(50)  -- gps, ais, manual
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('gps_points', 'timestamp');
```

#### audit_log
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,     -- INSERT, UPDATE, DELETE
    old_value JSONB,
    new_value JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Moduly

### 5.1 Jádro (Core) — vždy aktivní

| Komponenta | Popis |
|------------|-------|
| **Autentizace** | JWT + OAuth2, MFA, RBAC |
| **Uživatelé** | Správa uživatelů, profilů, rolí |
| **GPS Logger** | Sběr GPS dat, NMEA parser |
| **AI Orchestrator** | LLM orchestration, RAG, tool calling |
| **Event Bus** | NATS/Kafka pro inter-modulární komunikaci |
| **Audit Log** | Neměnitelná záznamy o všech změnách |
| **Lokalizace** | i18n framework (CZ, EN, DE, HR, IT, FR, ES) |
| **Konfigurace** | Nastavení systému a modulů |
| **Storage Layer** | MinIO/S3 pro soubory |
| **Sync Engine**  | Offline-first synchronizace |
| **Notification Engine** | Push notifikace, email |

### 5.2 Moduly (plug-and-play)

| # | Modul | Popis | Priorita |
|---|-------|-------|----------|
| 1 | **Lodní deník** | Základní deník, záznamy, editace, PDF | 🔴 P0 |
| 2 | **GPS Tracking** | Real-time tracking, trasy, GPX import/export | 🔴 P0 |
| 3 | **Mapy** | Interaktivní mapy, OpenSeaMap, trasování | 🔴 P0 |
| 4 | **Počasí** | OpenWeather API, meteorologické overlaye | 🔴 P0 |
| 5 | **AI Asistent** | Automatické zápisy, narativ, doporučení | 🔴 P0 |
| 6 | **Posádka** | Správa crew, hlídky, úkoly | 🟡 P1 |
| 7 | **Fotogalerie** | Fotky/videa s GPS, EXIF, ukádání do mapy | 🟡 P1 |
| 8 | **Lodní pokladna** | Cashflow, výdaje, palivové hospodářství | 🟡 P1 |
| 9 | **AIS** | Sledování okolních lodí, kolizní detekce | 🟡 P1 |
| 10 | **Údržba** | Servisní historie, checklisty, připomínky | 🟢 P2 |
| 11 | **Anchoring** | Kotvení, geofencing, hlídky | 🟢 P2 |
| 12 | **Incident Management** | Nehody, SOS, reporty | 🟢 P2 |
| 13 | **Exporty** | PDF, GPX, CSV, JSON, XML | 🟡 P1 |
| 14 | **Statistiky** | Analytika plavby, reporty | 🟢 P2 |
| 15 | **Marina Management** | Přístavy, rezervace, kontakty | 🔵 P3 |
| 16 | **Charter Režim** | Specifické funkce pro charterové firmy | 🔵 P3 |
| 17 | **Tide Module** | Příliv a odliv | 🔵 P3 |
| 18 | **Satelitní komunikace** | Iridium, Starlink integrace | 🔵 P3 |

### 5.3 Plugin architektura

```typescript
// Module interface
interface LogbookModule {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  routes: Route[];
  menuItems: MenuItem[];
  settings: SettingSchema[];
  onInstall(): Promise<void>;
  onUninstall(): Promise<void>;
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  onConfigChange(config: Record<string, any>): void;
}

// Module manifest (module.json)
{
  "id": "weather",
  "name": "Počasí",
  "version": "1.0.0",
  "description": "Meteorologické moduly a overlaye",
  "icon": "cloud",
  "author": "Njoror",
  "license": "MIT",
  "dependencies": ["core"],
  "permissions": ["gps", "network", "storage"],
  "entry": "dist/index.js",
  "settings": [
    {
      "key": "api_provider",
      "type": "select",
      "label": "Poskytovatel počasí",
      "options": ["openweather", "meteoblue", "windguru"],
      "default": "openweather"
    }
  ]
}
```

---

## 6. AI Engine

### 6.1 Architektura AI

```
┌─────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATOR                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  LLM     │  │  RAG     │  │  Tool Calling        │  │
│  │  Engine  │  │  Engine  │  │  (Function Calling)  │  │
│  │ (Ollama) │  │ (Qdrant) │  │                      │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Prompt Templates                      │   │
│  │  • Log Entry Generator                            │   │
│  │  • Voyage Summarizer                              │   │
│  │  • Anomaly Detector                               │   │
│  │  • COLREG Advisor                                 │   │
│  │  • Weather Interpreter                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Data Sources                          │   │
│  │  • GPS points (time-series)                       │   │
│  │  • Weather API data                               │   │
│  │  • AIS data                                       │   │
│  │  • Nautical charts (vector tiles)                 │   │
│  │  • Maritime regulations (RAG corpus)              │   │
│  │  • Historical voyage data                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 AI funkce

#### Automatické generování záznamů

**Vstup (raw data):**
```json
{
  "trip_id": "ae-2026-05",
  "data": [
    {"ts": "2026-05-15T10:00Z", "pos": [37.93, 23.68], "sog": 0.2, "cog": 0},
    {"ts": "2026-05-15T12:00Z", "pos": [37.85, 23.72], "sog": 6.5, "cog": 175},
    {"ts": "2026-05-15T14:00Z", "pos": [37.70, 23.85], "sog": 5.8, "cog": 160}
  ],
  "weather": {
    "wind_speed": 12, "wind_dir": "NW", "pressure": 1013,
    "visibility": 10, "sea_state": "slight"
  }
}
```

**Výstup (AI generovaný zápis):**
> *"15. 5. 2026, 10:00 UTC — Vyplutí z mariny Rafina (37°55'N, 23°40'E). Vítr NW 12 uzlů, stav moře mírný, viditelnost 10 km. Tlak 1013 hPa.*
>
> *12:00 UTC — Plavba na kurz 175°, rychlost 6,5 uzlu. Pozice 37°51'N, 23°43'E. Urazeno cca 8 NM za 2 hodiny.*
>
> *14:00 UTC — Pokračování na kurz 160°, rychlost klesla na 5,8 uzlu. Pozice 37°42'N, 23°51'E. Celkem urazeno cca 15 NM.*
>
> *Shrnutí dne: Klidná plavba podél pobřeží, stabilní podmínky, průměrná rychlost 6,2 uzlu."*

#### Detekce anomálií
- Neočekávaná změna kurzu
- Překročení rychlosti v zóně
- Blížení se k nebezpečné zóně
- Nízký stav paliva/baterie
- COLREG varování (blížící se lodě)

#### Voice-to-log
- Hlasové poznámky → přepis → strukturovaný zápis
- Podpora češtiny a angličtiny

### 6.3 LLM Stack

| Komponenta | Technologie | Účel |
|------------|-------------|------|
| **LLM** | Llama 3 70B / Mistral | Generování textu |
| **Embedding** | nomic-embed-text | Vectorizace pro RAG |
| **Vector DB** | Qdrant | Ukládání embeddings |
| **Orchestration** | LangChain / LlamaIndex | RAG pipeline |
| **Local Runtime** | Ollama | Lokální běh LLM |

---

## 7. Frontend

### 7.1 Obrazovky

| Obrazovka | Popis |
|-----------|-------|
| **Dashboard** | Přehled plavby, aktuální pozice, počasí, rychlost |
| **Lodní deník** | Seznam záznamů, editace, filtrace, vyhledávání |
| **Mapa** | Interaktivní mapa s trasou, AIS, počasím |
| **Počasí** | Aktuální a předpověď, overlaye na mapě |
| **Posádka** | Seznam, hlídky, úkoly |
| **Galerie** | Fotky a videa s GPS tagy |
| **Nastavení** | Konfigurace systému a modulů |
| **Správa modulů** | Instalace, aktivace, konfigurace modulů |
| **AI Asistent** | Chat s AI, hlasové poznámky |
| **Timeline** | Vizuální časová osa plavby |
| **Statistiky** | Grafy, reporty, analytika |
| **Exporty** | PDF, GPX, CSV generování |

### 7.2 UX požadavky

- **Dark/Light mode** — automatický přepínání (noční režim na moři)
- **Vysoký kontrast** — čitelnost při přímém slunci
- **Touch-friendly** — velké tlačítka pro ovládání na tabletu v kokpitu
- **Offline indikátor** — jasné označení stavu synchronizace
- **SOS tlačítko** — dostupné z každé obrazovky

### 7.3 Responzivita

| Zařízení | Breakpoint | Layout |
|----------|------------|--------|
| Telefon | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | Two column, side nav |
| Desktop | > 1024px | Full layout, sidebar |

---

## 8. Backend API

### 8.1 REST Endpoints

#### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/mfa/enable
POST   /api/v1/auth/mfa/verify
```

#### Vessels
```
GET    /api/v1/vessels
POST   /api/v1/vessels
GET    /api/v1/vessels/:id
PUT    /api/v1/vessels/:id
DELETE /api/v1/vessels/:id
```

#### Logbooks
```
GET    /api/v1/logbooks
POST   /api/v1/logbooks
GET    /api/v1/logbooks/:id
PUT    /api/v1/logbooks/:id
POST   /api/v1/logbooks/:id/close      # Uzavření deníku
POST   /api/v1/logbooks/:id/sign       # Digitální podpis
```

#### Log Entries
```
GET    /api/v1/logbooks/:id/entries
POST   /api/v1/logbooks/:id/entries
GET    /api/v1/entries/:id
PUT    /api/v1/entries/:id
DELETE /api/v1/entries/:id              # Jen neuzavřené
```

#### GPS
```
GET    /api/v1/vessels/:id/gps          # Body v časovém rozmezí
POST   /api/v1/vessels/:id/gps          # Přidání bodu
GET    /api/v1/vessels/:id/track        # Kompletní trasa
GET    /api/v1/vessels/:id/position     # Aktuální pozice
```

#### AI
```
POST   /api/v1/ai/generate-entry       # Generování zápisu
POST   /api/v1/ai/summarize            # Sumarizace plavby
POST   /api/v1/ai/analyze              # Analýza dat
POST   /api/v1/ai/voice-to-log         # Hlas → zápis
WS     /api/v1/ai/stream               # Real-time AI stream
```

#### Export
```
GET    /api/v1/export/pdf/:logbookId   # PDF deník
GET    /api/v1/export/gpx/:logbookId   # GPX trasa
GET    /api/v1/export/csv/:logbookId   # CSV data
GET    /api/v1/export/json/:logbookId  # JSON export
```

#### Modules
```
GET    /api/v1/modules                  # Seznam modulů
POST   /api/v1/modules/:id/install      # Instalace
POST   /api/v1/modules/:id/activate     # Aktivace
POST   /api/v1/modules/:id/deactivate   # Deaktivace
PUT    /api/v1/modules/:id/config       # Konfigurace
```

### 8.2 WebSocket Events

```typescript
// Real-time events
interface WSEvents {
  'gps:update': { lat: number; lon: number; speed: number; course: number };
  'ais:contact': { mmsi: string; name: string; lat: number; lon: number };
  'weather:update': { temperature: number; wind: object; pressure: number };
  'log:new': { entry: LogEntry };
  'log:updated': { entry: LogEntry };
  'ai:notification': { type: string; message: string; severity: string };
  'sync:status': { status: 'online' | 'offline' | 'syncing' };
  'module:event': { module: string; event: string; data: object };
}
```

---

## 9. Bezpečnost

### 9.1 Autentizace a autorizace

- **JWT** — access token (15 min) + refresh token (7 dní)
- **OAuth2** — Google, GitHub login
- **MFA** — TOTP (Google Authenticator)
- **RBAC** — admin, captain, crew, viewer

### 9.2 Ochrana dat

- **E2E encryption** — citlivá data šifrována na klientu
- **At-rest encryption** — šifrování databáze (PostgreSQL TDE)
- **TLS 1.3** — veškerá komunikace šifrovaná
- **Immutable audit logs** — záznamy nelze měnit ani smazat

### 9.3 Anti-tamper

```python
# Každý záznam má kryptografický hash
import hashlib

def compute_entry_hash(entry: dict, previous_hash: str) -> str:
    data = f"{entry['timestamp']}{entry['position']}{entry['notes']}{previous_hash}"
    return hashlib.sha256(data.encode()).hexdigest()

# Uzavření dne — všechny záznamy se zamknou
def close_day(logbook_id: str, user_id: str):
    entries = get_day_entries(logbook_id)
    for entry in entries:
        entry.is_locked = True
        entry.signature = sign_with_user_key(user_id, entry.hash)
    generate_daily_pdf(logbook_id)
```

### 9.4 Backup a disaster recovery

- Automatické denní backupy (PostgreSQL + MinIO)
- Point-in-time recovery
- Geo-redundantní storage (volitelné)

---

## 10. Offline-first strategie

### 10.1 Architektura

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (PWA)                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Service Worker                        │   │
│  │  • Cache static assets                            │   │
│  │  • Intercept API calls                            │   │
│  │  • Background sync                                │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              IndexedDB (Dexie.js)                  │   │
│  │  • Log entries (pending sync)                     │   │
│  │  • GPS points (buffer)                            │   │
│  │  • Media files (blob references)                  │   │
│  │  • Offline maps (vector tiles)                    │   │
│  │  • AIS cache                                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Sync Engine                            │   │
│  │  • Queue outgoing changes                         │   │
│  │  • Conflict resolution (last-write-wins + manual) │   │
│  │  • Retry with exponential backoff                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Konflikt resolution

1. **Server wins** — pro většinu dat (GPS, počasí)
2. **Manual merge** — pro editované záznamy
3. **Timestamp-based** — poslední změna vítězí

---

## 11. GPS Hardware

### 11.1 Doporučené řešení

| Varianta | Hardware | Cena | Výhody |
|----------|----------|------|--------|
| **DIY** | ESP32 + u-blox NEO-8M | ~400 Kč | Nejlevnější, plně open-source |
| **USB** | G-Mouse USB GPS (u-blox 7) | ~500 Kč | Plug & Play, snadná integrace |
| **Tracker** | SinoTrack ST-901 | ~500 Kč | Vodotěsný, 12V, záložní baterie |
| **NMEA** | Standard NMEA 0183/2000 | existující | Napojení na lodní síť |

### 11.2 Software stack pro GPS

| Nástroj | Účel |
|---------|------|
| **Traccar** | Open-source GPS tracking server |
| **Signal K** | Námořní datový server (NMEA 2000) |
| **gpsd** | Linux GPS daemon |
| **pyserial** | Python NMEA parser |

### 11.3 Integrační řetězec

```
GPS Hardware → NMEA 0183 → gpsd/Signal K → Backend API → PostgreSQL (PostGIS)
                                                                    ↓
                                                              AI Engine
                                                                    ↓
                                                              Log Entry
```

---

## 12. Mapy

### 11.1 Mapové zdroje

| Zdroj | Typ | Licence |
|-------|-----|---------|
| **OpenSeaMap** | Námořní charty | CC BY-SA |
| **OpenStreetMap** | Základní mapy | ODbL |
| **MapLibre GL** | Rendering engine | BSD |
| **NOAA** | Americké charty | Public domain |

### 11.2 Funkce

- Interaktivní mapa s trasou plavby
- AIS overlay (okolní lodě)
- Meteorologické overlay (vítr, tlak, srážky)
- Přístavové vrstvy
- Kotvení zóny
- Geofencing (vlastní zóny)
- Offline mapy (stažené dlaždice)

---

## 13. Struktura projektu

```
logbook/
├── agent/                      # AI agent Njoror
│   ├── AGENT.md
│   ├── SOUL.md
│   ├── TOOLS.md
│   ├── MEMORY.md
│   └── WORKFLOW.md
├── logbook.md                  # Tento soubor — hlavní specifikace
├── README.md
├── .gitignore
├── docker-compose.yml          # Celý stack
├── frontend/                   # Next.js PWA
│   ├── src/
│   │   ├── app/               # App router
│   │   ├── components/        # React komponenty
│   │   ├── hooks/             # Custom hooks
│   │   ├── stores/            # Zustand stores
│   │   ├── lib/               # Utility functions
│   │   ├── i18n/              # Lokalizace
│   │   └── modules/           # Plugin systém
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── sw.js              # Service worker
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/               # API routes
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── vessels.py
│   │   │   │   ├── logbooks.py
│   │   │   │   ├── entries.py
│   │   │   │   ├── gps.py
│   │   │   │   ├── ai.py
│   │   │   │   ├── export.py
│   │   │   │   └── modules.py
│   │   ├── core/              # Jádro
│   │   │   ├── auth.py
│   │   │   ├── events.py
│   │   │   ├── audit.py
│   │   │   └── sync.py
│   │   ├── models/            # SQLAlchemy modely
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logika
│   │   │   ├── ai_service.py
│   │   │   ├── gps_service.py
│   │   │   ├── weather_service.py
│   │   │   ├── export_service.py
│   │   │   └── sync_service.py
│   │   └── modules/           # Plugin systém
│   │       ├── base.py
│   │       ├── loader.py
│   │       └── registry.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── ai/                         # AI modely a konfigurace
│   ├── prompts/               # Prompt templates
│   │   ├── log_entry.md
│   │   ├── voyage_summary.md
│   │   └── anomaly_detect.md
│   ├── rag/                   # RAG corpus
│   │   ├── regulations/      # Námořní předpisy
│   │   └── nautical_terms/   # Námořní terminologie
│   └── ollama/                # Ollama konfigurace
├── modules/                    # Samostatné moduly
│   ├── weather/
│   ├── maps/
│   ├── ais/
│   ├── crew/
│   ├── cashflow/
│   ├── media/
│   ├── maintenance/
│   └── ...
├── database/                   # Migrace a seed data
│   ├── migrations/
│   └── seeds/
├── docs/                       # Dokumentace
│   ├── architecture.md
│   ├── api.md
│   ├── modules.md
│   └── deployment.md
└── scripts/                    # Utility skripty
    ├── setup.sh
    ├── backup.sh
    └── import_gpx.py
```

---

## 14. Roadmapa vývoze

### Fáze 1: MVP (měsíce 1-3)

- [ ] Projekt setup (Next.js + FastAPI + PostgreSQL)
- [ ] Autentizace (JWT, registrace, přihlášení)
- [ ] Správa plavidel
- [ ] Základní lodní deník (CRUD záznamů)
- [ ] GPS tracking (sběr a zobrazení)
- [ ] Základní mapa (MapLibre + OpenSeaMap)
- [ ] Počasí (OpenWeather API)
- [ ] PDF export (základní)
- [ ] PWA setup (offline cache)
- [ ] i18n (CZ + EN)

### Fáze 2: AI & Moduly (měsíce 4-6)

- [ ] AI Engine (Ollama + Llama 3)
- [ ] Automatické generování záznamů
- [ ] Plugin systém pro moduly
- [ ] Modul: Posádka a hlídky
- [ ] Modul: Fotogalerie s GPS
- [ ] Modul: Lodní pokladna
- [ ] Audit trail a immutable logs
- [ ] Digitální podpis a hash integrity
- [ ] Rozšířený PDF export (oficiální formát)

### Fáze 3: Pokročilé funkce (měsíce 7-9)

- [ ] AIS integrace
- [ ] COLREG detekce kolizí
- [ ] Voice-to-log
- [ ] Geofencing
- [ ] Modul: Údržba plavidla
- [ ] Modul: Incident management
- [ ] Statistiky a analytika
- [ ] Offline-first synchronizace
- [ ] MFA (TOTP)

### Fáze 4: Enterprise (měsíce 10-12)

- [ ] Kubernetes deployment
- [ ] Multi-tenancy
- [ ] Marina management
- [ ] Charter režim
- [ ] API pro třetí strany
- [ ] Mobilní aplikace (React Native)
- [ ] Certifikace (IMO compliance)

---

## 15. Deployment

### 15.1 Lokální vývoj

```bash
# Clone
git clone https://github.com/VaclavSercl/logbook.git
cd logbook

# Start celého stacku
docker-compose up -d

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 15.2 Lodní server (Raspberry Pi / NUC)

```bash
# Na lodi — minimální stack
docker-compose -f docker-compose.boat.yml up -d
# PostgreSQL + Backend + AI (Ollama) + Traccar
```

### 15.3 Cloud

```bash
# Kubernetes
kubectl apply -f k8s/
```

---

## 16. Licence

MIT Licence — open source, volné použití.

---

*Tento dokument je živý. S každým milníkem se aktualizuje.*
*Njoror — Bůh mořeplavby, strážce Logbooku* ⚓
