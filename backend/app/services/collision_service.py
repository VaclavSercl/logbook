"""Maritime collision avoidance service implementing CPA and TCPA vector mathematics."""
import math

def calculate_cpa_tcpa(
    lat1: float, lng1: float, speed1: float, course1: float,
    lat2: float, lng2: float, speed2: float, course2: float
) -> tuple[float, float]:
    """
    Calculate the Closest Point of Approach (CPA) in Nautical Miles (NM)
    and the Time to CPA (TCPA) in minutes between two vessels.
    
    Vessel 1: Our vessel
    Vessel 2: AIS Target
    
    Speeds in knots, courses in degrees (0-360).
    """
    # 1. Project positions to a local Cartesian plane in Nautical Miles (NM)
    # Latitude difference: 1 degree = 60 Nautical Miles
    # Longitude difference: 1 degree = 60 * cos(latitude) Nautical Miles
    lat_avg = math.radians((lat1 + lat2) / 2.0)
    
    r0_x = (lng2 - lng1) * 60.0 * math.cos(lat_avg)
    r0_y = (lat2 - lat1) * 60.0
    
    # Current distance
    current_dist = math.sqrt(r0_x**2 + r0_y**2)
    
    # If both vessels are stationary, CPA is the current distance and TCPA is 0
    if (speed1 is None or speed1 < 0.1) and (speed2 is None or speed2 < 0.1):
        return round(current_dist, 3), 0.0

    # Handle None/null speeds or courses
    s1 = speed1 if speed1 is not None else 0.0
    c1 = math.radians(course1) if course1 is not None else 0.0
    s2 = speed2 if speed2 is not None else 0.0
    c2 = math.radians(course2) if course2 is not None else 0.0

    # 2. Convert speed and course to velocity vectors in knots (NM per hour)
    # Course is measured clockwise from North (Y-axis)
    v1_x = s1 * math.sin(c1)
    v1_y = s1 * math.cos(c1)
    
    v2_x = s2 * math.sin(c2)
    v2_y = s2 * math.cos(c2)
    
    # 3. Calculate relative velocity vector (Target velocity - Our velocity)
    v_rel_x = v2_x - v1_x
    v_rel_y = v2_y - v1_y
    
    v_rel_sq = v_rel_x**2 + v_rel_y**2
    
    # If there is no relative velocity (same speed and course), they will never meet
    if v_rel_sq < 0.0001:
        return round(current_dist, 3), 999.0
        
    # 4. Calculate Time to CPA (TCPA) in hours
    # Formula: t_cpa = - (r0 . v_rel) / |v_rel|^2
    t_cpa_hours = - (r0_x * v_rel_x + r0_y * v_rel_y) / v_rel_sq
    
    # If TCPA is negative, the vessels are already diverging (CPA was in the past)
    if t_cpa_hours < 0:
        return round(current_dist, 3), round(t_cpa_hours * 60.0, 1)
        
    # 5. Calculate Distance at CPA (CPA) in NM
    # Position at CPA: r_cpa = r0 + v_rel * t_cpa
    cpa_x = r0_x + v_rel_x * t_cpa_hours
    cpa_y = r0_y + v_rel_y * t_cpa_hours
    
    cpa_dist = math.sqrt(cpa_x**2 + cpa_y**2)
    
    return round(cpa_dist, 3), round(t_cpa_hours * 60.0, 1)
