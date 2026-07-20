"""
Wind Barb (Synoptické značení větru) Service for Njoror.
Parses wind speed in knots and wind direction in degrees to calculate 
synoptics (pennants, full barbs, half barbs) and SVG/Unicode representations.
"""
from typing import Dict, Any, Tuple

def calculate_wind_barb(wind_speed_knots: float, wind_direction_deg: float) -> Dict[str, Any]:
    """
    Calculates synoptic wind barb components for a given wind speed (knots) and direction (degrees).
    
    Standard WMO rules (rounded to nearest 5 knots):
    - Pennant (vlaječka): 50 knots
    - Full barb (dlouhá čárka): 10 knots
    - Half barb (krátká čárka): 5 knots
    - Speed < 2.5 knots: Calm (kroužek / bezvětří)
    """
    speed = max(0.0, float(wind_speed_knots))
    direction = float(wind_direction_deg) % 360.0
    
    # Round speed to nearest 5 knots for standard barb representation
    rounded_speed = int(round(speed / 5.0) * 5)
    
    if rounded_speed < 3:
        return {
            "speed_knots": speed,
            "direction_deg": direction,
            "cardinal": get_cardinal_direction(direction),
            "is_calm": True,
            "pennants": 0,
            "full_barbs": 0,
            "half_barbs": 0,
            "text_description": "Bezvětří (staniční kroužek bez šipky)",
            "notation_code": "CALM",
            "symbol": "○"
        }
    
    rem = rounded_speed
    pennants = rem // 50
    rem %= 50
    
    full_barbs = rem // 10
    rem %= 10
    
    half_barbs = rem // 5
    
    # Build text description in Czech for nautical logbook
    parts = []
    if pennants > 0:
        parts.append(f"{pennants}× vlaječka (50 kn)")
    if full_barbs > 0:
        parts.append(f"{full_barbs}× celá čárka (10 kn)")
    if half_barbs > 0:
        parts.append(f"{half_barbs}× půl čárky (5 kn)")
    
    desc_str = ", ".join(parts)
    cardinal = get_cardinal_direction(direction)
    
    # Simple ASCII/Unicode representation
    barb_symbols = "▲" * pennants + "𝌆" * full_barbs + "𝌀" * half_barbs
    
    return {
        "speed_knots": speed,
        "rounded_speed_knots": rounded_speed,
        "direction_deg": direction,
        "cardinal": cardinal,
        "is_calm": False,
        "pennants": pennants,
        "full_barbs": full_barbs,
        "half_barbs": half_barbs,
        "text_description": f"Vítr z {cardinal} ({direction:.0f}°), synoptické značení: {desc_str}",
        "notation_code": f"{pennants}F_{full_barbs}B_{half_barbs}H",
        "symbol": barb_symbols
    }

def get_cardinal_direction(degrees: float) -> str:
    cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int(((degrees % 360) + 11.25) / 22.5)
    return cardinals[ix % 16]
