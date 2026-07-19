# ⚓ Automatický zapisovatel lodního deníku (Njoror)

Tento modul automaticky vytváří každou hodinu zápisy do aktivního lodního deníku. Zápisy generuje a řídí umělá inteligence **Gemini 3.5 Flash** (vystupující jako **Njoror**, AI vládce lodního deníku).

Všechny instrukce jsou definovány přímo v souboru `AGENTS.md` v kořeni projektu. Agent `agy` si při každém spuštění tyto instrukce načte a autonomně provede celý proces.

## 🚀 Jak to funguje
1. **Detekce plavby:** Vyhledá v databázi `logbook.db` aktivní lodní deník a jeho loď.
2. **Analýza trasy:** Načte poslední GPS body a spočítá **průměrnou rychlost** od posledního okamžiku, kdy se loď začala pohybovat (rychlost > 0.5 uzlu). Pokud loď stojí, rychlost je 0.
3. **Geolokace (Nominatim):** Zjistí přesnou lokalitu podle souřadnic (přístavy, mariny, zátoky).
4. **Počasí (Open-Meteo):** Stáhne aktuální data pro polohu: teplotu, tlak, rychlost a směr větru, oblačnost a určí stav moře podle Douglasovy stupnice.
5. **Paměť (Kontinuita):** Načte poslední 2 zápisy, aby navázal na styl vyjadřování a průběh plavby.
6. **Zápis do DB:** Sestaví věcný námořní zápis a vloží ho jako nový řádek do tabulky `log_entries` se všemi naměřenými hodnotami.

---

## 📅 Nastavení automatického spouštění (Cron)

Otevřete systémový cron příkazem:
```bash
crontab -e
```

Vložte do crontabu následující řádek, který každou celou hodinu spustí přímo Python skript v příslušném virtuálním prostředí backendu (tím se vyhnete vyčerpání limitů/kvóty pro spouštění plnohodnotného AI agenta `agy`):
```cron
0 * * * * cd /home/wwwenda/workspace/logbook/backend && ./venv/bin/python3 app/services/auto_logbook.py >> /home/wwwenda/workspace/logbook/auto_logbook.log 2>&1
```

---

## 📝 Instrukční Super Prompt (AGENTS.md)
Kompletní chování a prováděcí kroky agenta jsou definovány v souboru `AGENTS.md` a vypadají následovně:

```markdown
Jsi Njoror, AI vládce projektu lodního deníku na lodi {vessel_name}.
Sestav profesionální námořní zápis do lodního deníku pro aktuální hodinu plavby v češtině.

Telemetrická data a kontext pro tento zápis:
- Aktuální čas: {current_time_str}
- Pozice: {lat:.5f}°N, {lng:.5f}°E
- Lokalita (reverzní geokódování): {location_info['display_name']}
- Typ místa: {location_info['place_type']} {f'({location_info["place_name"]})' if location_info['place_name'] else ''}
- Průměrná rychlost od vyplutí / zahájení pohybu: {avg_speed:.1f} uzlů
- Aktuální vítr: {weather['wind_speed']:.1f} uzlů, směr {weather['wind_direction']}
- Tlak vzduchu: {weather['pressure']:.1f} hPa
- Teplota vzduchu: {weather['temperature']:.1f} °C
- Stav moře (Douglasova stupnice): {weather['sea_state']}
- Oblačnost: {weather['clouds']}%

Pokyny pro styl a kontinuitu:
- Zápis musí znít jako od velmi zkušeného, stručného a věcného kapitána námořní plavby.
- Navazuj plynule na předchozí zápisy (pokud jsou k dispozici). Zkontroluj, zda loď změnila polohu, zda se mění počasí (např. zesílení větru, pokles tlaku) a napiš to jako plynulé pokračování cesty.
- Udržuj naprosto stejnou strukturu, terminologii a formát vyjadřování jako v předchozích zápisech pro zachování jednotného stylu celého deníku.
- Nepoužívej žádný úvodní ani závěrečný doprovodný text (např. "Zde je váš zápis"). Začni ihned samotným textem zápisu.
- Zápis by měl mít délku 2 až 4 věty. Nepoužívej zbytečné fráze.
```
