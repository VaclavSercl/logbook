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
| 17.7.2026 | Varování na aktivní deník | Přidáno varování do modálního okna pro vytvoření deníku, pokud k vybranému plavidlu již existuje jiný otevřený (aktivní) lodní deník. Uživatel je upozorněn, aby jej nejprve uzavřel pro zajištění správné synchronizace z Telegramu. |
| 17.7.2026 | Uživatelský průvodce (/help) | Vytvořena nová, přehledná stránka s návody pro uživatele. Obsahuje podrobný návod na nastavení a propojení s Telegramem, sdílení Live Location na dobu neurčitou a zápisy řeči přes Gemini AI. Odkazy na nápovědu přidány do záhlaví všech podstránek. |
| 17.7.2026 | Upřesnění Telegram bota v průvodci | Upraven text nápovědy (/help) tak, aby odpovídal architektuře vlastních privátních botů. Každý uživatel má možnost si vytvořit vlastního privátního bota přes @BotFather a vložit token, což zajišťuje absolutní soukromí. |
| 17.7.2026 | Odhlášení a smazání účtu | Implementováno tlačítko pro bezpečné odhlášení z aplikace a tlačítko na trvalé smazání účtu. Na backendu byl vytvořen endpoint DELETE /auth/me, který provede bezpečné kaskádové smazání uživatelských dat (lodě, deníky, GPS souřadnice, služby, hlídky atd.) bez porušení cizích klíčů v SQLite. |
| 17.7.2026 | Veřejný náhled plaveb (Live) | Implementována možnost anonymního sledování aktivních plaveb. Na backendu byly vytvořeny veřejné endpointy pro logbook, zápisy a GPS body. Na landing page se nezalogovaným uživatelům zobrazí sekce "Sledovat aktivní plavby živě", která odkazuje na novou detailní stranu /public/logbook/[id] s interaktivní mapou a timeline zápisů. |
| 17.7.2026 | Nastavení viditelnosti deníku (is_public) | Přidán sloupec is_public do tabulky logbooks v SQLite. V modálním okně pro vytvoření deníku na frontendu byla přidána možnost zaškrtnout, zda má být deník veřejný. Veřejné endpointy nově vrací pouze ty aktivní deníky, které mají tento příznak zapnutý. |
| 17.7.2026 | Lokalizace platformy (i18n) | Vytvořen modul i18n.ts pro překlady uživatelského rozhraní. Aplikace nyní podporuje kompletní přepínání mezi češtinou a angličtinou s okamžitou reaktivní aktualizací napříč komponentami. Systém je připraven pro snadné přidání dalších jazyků v budoucnu. |
| 17.7.2026 | Přepínač jazyků v hlavičce | Přidány čudlíky CS/EN pro přepínání jazyka do anonymní hlavičky úvodní stránky i do navigační lišty přihlášených uživatelů. Přidány překladové klíče pro přihlášení a registraci a lokalizována celá navigace na hlavní nástěnce. |
| 17.7.2026 | Kompletní reset databáze | Na žádost uživatele byla smazána celá SQLite databáze logbook.db. Služba byla restartována a databázový soubor se automaticky vytvořil zcela čistý se všemi tabulkami (uživatelé, lodě, deníky, GPS body atd.) a s čistým startovním stavem. |
| 17.7.2026 | Dynamická maketa deníku (Landing Page) | Maketa prohlížeče na úvodní stránce byla předělána na dynamickou. Při načtení se buď vytáhnou reálná data právě probíhající veřejné plavby z databáze, nebo (pokud je databáze prázdná) se vybere jedna ze čtyř detailně zpracovaných ukázkových plaveb (Jadran, Egejské moře, Karibik, Baltské moře) s odpovídajícími údaji o rychlosti, počasí a lodních zápisech. |
| 19.7.2026 | Úprava hodinového cronu | Změna spouštěče hodinového zápisu v crontabu ze spouštění agenta `agy` na přímé volání Python skriptu `auto_logbook.py` ve venv. Tím se předešlo vyčerpání kvót Antigravity CLI, protože skript nyní volá Gemini API přímo pomocí svého `GOOGLE_API_KEY` bez režie CLI agenta. |
| 19.7.2026 | Implementace Fáze 3 (Pokročilé) | Přidány modely, schemas a API endpointy pro AIS, výpočty CPA/TCPA, hlasové zápisy (Voice-to-log) přes inline Gemini Audio a Geofencing s podporou kruhových i polygonálních zón. Všechna data jsou ukládána do SQLite a synchronizována. |
| 20.7.2026 | Synoptické značení větru (Wind Barb) | Analýza standardu WMO/synoptického značení větru (šipky, čárky, vlaječky podle článku z Lodních novin). Vytvořen modul `app/services/wind_barb.py`, přidány testy, aktualizován `AGENTS.md`, `auto_logbook.py` a LLM prompt pro námořní styl zápisu Njorora. |
| 20.7.2026 | Oprava registrace posádky & hlídek | Vyřešení 403 Forbidden chyby v `crew.py`, `watches.py` a `galley.py` způsobené nekompatibilitou UUID objektu a stringu v SQLite. |
| 20.7.2026 | Modul Kotvení & Kotevní Alarm | Přidán backend modul `anchoring.py`, model `AnchorLog` a frontend stránka `/anchoring` pro evidenci spuštění kotvy, hloubky, délky řetězu, Scope Ratio a aktivního geofence alarmu driftu. |
| 20.7.2026 | Modul Lodní Pokladna (Finance) | Přidán backend modul `cashbox.py`, model `CashboxExpense` a frontend stránka `/cashbox` pro přehled výdajů posádky (proviant, palivo, přístavy, opravy) s více měnami. |
| 20.7.2026 | Integrace Windy.com Live Widgetu | Vytvořeno propojení s Windy.com v `weather.py` a v rozhraní `/weather`. Dynamicky generuje živou interaktivní větrnou mapu a ECMWF model pro přesné GPS souřadnice lodi. |
| 20.7.2026 | Unifikovaná navigace (Navbar) | Vytvořena sdílená komponenta `Navbar.tsx` s kompletními odkazy na všechny moduly v systému a integrací i18n přepínače. |
| 20.7.2026 | Striktní pravidla jednotek | Implementována globální pravidla pro formátování jednotek napříč systémem a LLM promptem Njorora: Rychlost `kn (km/h)`, Vzdálenost `NM (km)`, Hloubka `ft (m)`, Vítr `m/s (Bft)`. Vytvořen `units.py` a `units.ts`. |

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
