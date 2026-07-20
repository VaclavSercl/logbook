"""
Nautical Units Formatter for Logbook (Njoror).
Enforces user formatting rules across the entire platform:
- Vessel Speed: uzle (kn) & in parentheses (km/h) -> e.g. "6.8 kn (12.6 km/h)"
- Distance: námořní míle (NM) & in parentheses (km) -> e.g. "12.5 NM (23.2 km)"
- Depth: stopy (ft) & in parentheses (m) -> e.g. "19.7 ft (6.0 m)"
- Wind Speed: metry za sekundu (m/s) & in parentheses (Beaufort) -> e.g. "7.5 m/s (4 Bft)"
"""

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

def meters_to_feet(meters: float) -> float:
    return meters * 3.28084

def format_depth(meters: float) -> str:
    feet = meters_to_feet(meters)
    return f"{feet:.1f} ft ({meters:.1f} m)"

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
    return f"{ms:.1f} m/s ({bft} Bft)"
