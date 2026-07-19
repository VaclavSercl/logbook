"""Geofencing calculation service for circular and polygonal zones."""
import math
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import GeofenceZone

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance in meters between two GPS coordinates using the Haversine formula."""
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def is_point_in_polygon(lat: float, lng: float, polygon: list) -> bool:
    """
    Check if a GPS coordinate is inside a polygon using the Ray Casting algorithm.
    polygon is a list of [lat, lng] coordinate pairs.
    """
    inside = False
    n = len(polygon)
    if n < 3:
        return False
        
    p1x, p1y = polygon[0][0], polygon[0][1]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n][0], polygon[i % n][1]
        if lat > min(p1x, p2x):
            if lat <= max(p1x, p2x):
                if lng <= max(p1y, p2y):
                    if p1x != p2x:
                        xints = (lat - p1x) * (p2y - p1y) / (p2x - p1x) + p1y
                    if p1y == p2y or lng <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
        
    return inside

def is_vessel_in_geofence(vessel_lat: float, vessel_lng: float, zone: GeofenceZone) -> bool:
    """Check if the vessel's current position is within a geofence zone boundary."""
    # 1. Circular geofence
    if zone.radius is not None and zone.latitude is not None and zone.longitude is not None:
        dist = calculate_distance_meters(vessel_lat, vessel_lng, zone.latitude, zone.longitude)
        return dist <= zone.radius
        
    # 2. Polygon geofence
    elif zone.polygon_coordinates:
        # polygon_coordinates is stored as JSON, which SQLAlchemy returns as parsed Python list
        return is_point_in_polygon(vessel_lat, vessel_lng, zone.polygon_coordinates)
        
    return False

def evaluate_active_geofences(logbook_id: str, vessel_lat: float, vessel_lng: float, db: Session) -> list[dict]:
    """
    Query and evaluate all active geofence perimeters for a logbook.
    Returns a list of triggered geofences containing alert status and message.
    """
    result = db.execute(
        select(GeofenceZone)
        .where(GeofenceZone.logbook_id == logbook_id, GeofenceZone.is_active == True)
    )
    zones = result.scalars().all()
    
    triggered_alerts = []
    
    for zone in zones:
        is_in = is_vessel_in_geofence(vessel_lat, vessel_lng, zone)
        triggered = False
        message = ""
        
        # Determine violation logic based on geofence type
        if zone.zone_type == "anchor_watch":
            # Anchor watch triggers when the vessel goes OUTSIDE the safety circle
            if not is_in:
                triggered = True
                message = f"ALARM: Plavidlo opustilo kotevní okruh zóny '{zone.name}'!"
        elif zone.zone_type == "danger_zone":
            # Danger zone triggers when the vessel goes INSIDE the restricted area
            if is_in:
                triggered = True
                message = f"VAROVÁNÍ: Plavidlo vstoupilo do nebezpečné zóny '{zone.name}'!"
        elif zone.zone_type == "marina":
            # Marina triggers when the vessel arrives at destination
            if is_in:
                triggered = True
                message = f"OZNÁMENÍ: Plavidlo úspěšně doplulo do cílové mariny '{zone.name}'."
                
        if triggered:
            triggered_alerts.append({
                "zone_id": str(zone.id),
                "name": zone.name,
                "zone_type": zone.zone_type,
                "message": message,
                "is_in_perimeter": is_in
            })
            
    return triggered_alerts
