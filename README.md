# ⛵ Námořní Lodní Deník & Njořðr AI (Logbook)

Inteligentní námořní lodní deník a systém pro správy plaveb s umělou inteligencí **Njořðr AI** (Gemini 3.6 Flash High).

---

## 👑 Njořðr AI (Gemini 3.6 Flash High)

Njořðr je AI vládce a správce plavby. Zajišťuje kompletní analýzu a organizaci plavebních podkladů:

- **100% Čistá AI Analýza:** Ze všech nahraných souborů (Excel, PDF, Word, CSV, TXT, webové odkazy) automaticky extrahuje:
  - Přesný název plavidla, typ a technické specifikace (délka, šířka, ponor, rok výroby, domovský přístav, vlajka, vratná kauce).
  - Kompletní itinerář plavby a plavební trasy.
  - Manifest posádky (jména, příjmení, pasy/OP, data narození, státní příslušnosti).
  - Určení **Skippera (Kapitána)**.
  - Vratnou kauci a výdaje přímo do Lodní Pokladny (Cashbox).
- **📁 Vyhrazené složky plaveb:** Pro každou analyzovanou plavbu Njořðr AI automaticky vytvoří dedikovanou složku na disku ve formátu:
  `YYYY-MM-DD_<VesselName>_<Route>` (např. `2026-07-24_Oceanis_511_Poseidon_Biograd_to_Split`) obsahující souhrnný rozbor `njoror_ai_voyage_summary.md` a všechny zdrojové soubory.
- **⚡ Automatický rozvrh služeb:** Generuje 82 hlídek na moři a 8 rotací v kuchyni (kuchaři & pomocníci) na celou plavbu.
- **📂 Nahrávání z WWW rozhraní & ZIP:** Webové rozhraní podporuje nahrání jednotlivých souborů, více souborů najednou, nahrání celých složek přes prohlížeč (`webkitdirectory`) i automatické rozbalování `.ZIP` archivů.

---

## 🛠️ Architektura a Spuštění

- **Backend:** FastAPI (Python 3.10+, SQLAlchemy, SQLite, Gemini 3.6 Flash High API)
- **Frontend:** Next.js 14 (React, TailwindCSS, Progressive Web App / PWA)
- **Služby:** Systemd user services (`logbook-backend.service`, `logbook-frontend.service`)

### Rychlé spuštění AI balíčkovače z CLI:
```bash
python3 backend/njoror_ingest.py /cesta/ke/slozce
```

---

## 📜 Licencie
MIT
