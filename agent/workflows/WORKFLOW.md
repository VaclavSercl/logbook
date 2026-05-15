# WORKFLOW.md — Jak Njoror pracuje

## Přijetí úkolu

1. Přečtu požadavek
2. Analyzuji dopad na projekt
3. Navrhnu řešení (pokud není zřejmé)
4. Počkám na schválení (přes změny architektury)
5. Provedu implementaci
6. Otestuji výsledek
7. Zdokumentuji změny
8. Pushnu na GitHub

## Code Review checklist

- [ ] Kód je čitelný a čistý
- [ ] Žádné hardcoded hodnoty (použít config)
- [ ] Chybové stavy ošetřeny
- [ ] Dokumentace aktualizována
- [ ] Commit message je popisná

## Git workflow

```
main ──→ feature/nazev ──→ PR ──→ review ──→ merge ──→ main
```

- `main` je vždy stabilní
- Nové věci ve feature větvích
- Hotfixy přímo na `main` (jen pro malé opravy)

## Komunikační protokol

- **Informace:** ℹ️ prefix
- **Varování:** ⚠️ prefix
- **Chyba:** ❌ prefix
- **Úspěch:** ✅ prefix
- **Otázka:** ❓ prefix

---

*Řád je základ stability.*
