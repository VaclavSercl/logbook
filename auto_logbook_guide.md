# ⚓ Automatický zapisovatel lodního deníku (Njoror)

Tento modul automaticky vytváří každou hodinu zápisy do aktivního lodního deníku. Zápisy generuje umělá inteligence **Gemini 2.5 Flash** (pod kapitolou **Njoror**, AI vládce lodního deníku) na základě telemetrických dat, počasí a geolokace.

## 🚀 Jak to funguje
1. **Detekce plavby:** Skript vyhledá v databázi `logbook.db` aktivní lodní deník a jeho přiřazenou loď.
2. **Analýza trasy:** Načte poslední GPS body a spočítá **průměrnou rychlost** od posledního okamžiku, kdy se loď začala pohybovat (rychlost > 0.5 uzlu). Pokud loď stojí, rychlost je 0.
3. **Geolokace (Nominatim):** Zjistí přesnou lokalitu podle souřadnic. Pokud se loď nachází v přístavu, marině nebo zátoce, vyhledá její název. Na širém moři označí polohu jako otevřené moře.
4. **Počasí (Open-Meteo):** Stáhne aktuální data pro danou polohu: teplotu, tlak, rychlost a směr větru, oblačnost a odhadne stav moře podle Douglasovy stupnice.
5. **AI Zápis (Super Prompt):** Gemini 2.5 Flash zformuje věcný, stručný námořní zápis odpovídající situaci (jiný styl v přístavu/marině, jiný na otevřeném moři při plavbě).
6. **Zápis do DB:** Vytvoří a uloží nový záznam do tabulky `log_entries` se všemi naměřenými hodnotami.

---

## 📅 Nastavení automatického spouštění (Cron)

Máte dvě možnosti, jak automatický zápis spouštět každou hodinu. Otevřete systémový cron příkazem:
```bash
crontab -e
```

### Varianta A: Přímé spuštění Python skriptu (Doporučeno)
Tato metoda je nejrychlejší (trvá cca 2-3 sekundy), nejspolehlivější a nespotřebovává zbytečné tokeny za uvažování agenta.

Vložte do crontabu následující řádek:
```cron
0 * * * * cd /home/wwwenda/workspace/logbook/backend && ./venv/bin/python3 app/services/auto_logbook.py >> /home/wwwenda/workspace/logbook/backend/auto_logbook.log 2>&1
```

### Varianta B: Spuštění přes Antigravity agenta (`agy`)
Pokud chcete, aby celý proces řídil a dozoroval agent `agy` s využitím přirozeného jazyka (jak bylo požadováno):

Vložte do crontabu:
```cron
0 * * * * cd /home/wwwenda/workspace/logbook/backend && agy --dangerously-skip-permissions --print "Spusť python skript app/services/auto_logbook.py pro zápis hodinového lodního deníku" >> /home/wwwenda/workspace/logbook/backend/auto_logbook.log 2>&1
```

---

## 📝 Super Prompt pro Gemini 2.5 Flash
Pokud byste chtěli generovat zápis čistě textově přes agenta (bez skriptu), skript interně používá tento **Super Prompt**:

```text
Jsi Njoror, AI vládce projektu lodního deníku na lodi {vessel_name}.
Sestav profesionální námořní zápis do lodního deníku pro aktuální hodinu plavby v češtině.

Telemetrická data a kontext:
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

Pokyny pro styl:
- Zápis musí znít jako od zkušeného a věcného kapitána námořní plavby.
- Pokud jsme v přístavu, na kotvě nebo v marině (podle lokality a rychlosti), popiš stručně toto místo, manévry spojené s kotvením, nebo stav lodi u mola.
- Pokud jsme na otevřeném moři (typ místa je open_sea), napiš standardní hodinové hlášení o plavbě, rychlosti, směru větru, plachtění/motorování a chování lodi na vlnách.
- Zápis musí být stručný (2 až 4 věty), odborný, bez úvodních slov či komentářů (začni rovnou samotným zápisem deníku).
```
