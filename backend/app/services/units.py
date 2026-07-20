"""
Nautical & Imperial / Metric Units Formatter for Logbook (Njoror).
Enforces user formatting rules across the entire platform:
- Vessel Speed: uzle (kn) & (km/h) -> e.g. "6.8 kn (12.6 km/h)"
- Distance: námořní míle (NM) & (km) -> e.g. "12.5 NM (23.2 km)"
- Depth & Draft: stopy (ft) & (m) -> e.g. "19.7 ft (6.0 m)"
- Vessel Dimensions (Length, Beam): stopy (ft) & (m) -> e.g. "42.0 ft (12.8 m)"
- Wind Speed: uzle (kn) & (m/s, Beaufort) -> e.g. "12.0 kn (6.2 m/s, 4 Bft)"
- Temperature: °F & (°C) -> e.g. "72.5 °F (22.5 °C)"
- Air Pressure: inHg & (hPa) -> e.g. "29.91 inHg (1013 hPa)"
"""

def celsius_to_fahrenheit(celsius: float) -> float:
    return (celsius * 9.0 / 5.0) + 32.0

def format_temperature(celsius: float) -> str:
    fahrenheit = celsius_to_fahrenheit(celsius)
    return f"{fahrenheit:.1f} °F ({celsius:.1f} °C)"

def meters_to_feet(meters: float) -> float:
    return meters * 3.28084

def format_length_or_depth(meters: float) -> str:
    feet = meters_to_feet(meters)
    return f"{feet:.1f} ft ({meters:.1f} m)"

def format_depth(meters: float) -> str:
    return format_length_or_depth(meters)

def knots_to_kmh(knots: float) -> float:
    return knots * 1.852

def format_vessel_speed(knots: float) -> str:
    kmh = knots_to_kmh(knots)
    return f"{knots:.1f} kn ({kmh:.1f} km/h)"

def nm_to_km(nm: float) -> float:
    return nm * 1.852

def format_distance(nm: float) -> str:
    km = nm_to_km(nm)
    return f"{nm:.1f} NM ({km:.1f} km)"

def hpa_to_inhg(hpa: float) -> float:
    return hpa * 0.02953

def format_pressure(hpa: float) -> str:
    inhg = hpa_to_inhg(hpa)
    return f"{inhg:.2f} inHg ({hpa:.0f} hPa)"

def knots_to_ms(knots: float) -> float:
    return knots * 0.514444

def ms_to_beaufort(ms: float) -> int:
    if ms < 0.5: return 0
    if ms < 1.6: return 1
    if ms < 3.4: return 2
    if ms < 5.5: return 3
    if ms < 8.0: return 4
    if ms < 10.8: return 5
    if ms < 13.9: return 6
    if ms < 17.2: return 7
    if ms < 20.8: return 8
    if ms < 24.5: return 9
    if ms < 28.5: return 10
    if ms < 32.7: return 11
    return 12

def format_wind_speed(knots: float) -> str:
    ms = knots_to_ms(knots)
    bft = ms_to_beaufort(ms)
    return f"{knots:.1f} kn ({ms:.1f} m/s, {bft} Bft)"
