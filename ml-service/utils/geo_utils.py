import math
import numpy as np
from typing import Tuple, List, Dict

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def km_to_degrees(km: float, latitude: float = 0) -> Tuple[float, float]:
    """Convert km to approximate lat/lon degrees."""
    lat_deg = km / 111.0
    lon_deg = km / (111.0 * math.cos(math.radians(latitude)))
    return lat_deg, lon_deg

def generate_grid(center_lat: float, center_lon: float, radius_km: float, step_km: float = 5) -> List[Tuple[float, float]]:
    """Generate a grid of lat/lon points around a center."""
    lat_step, lon_step = km_to_degrees(step_km, center_lat)
    lat_range = radius_km / 111.0
    lon_range = radius_km / (111.0 * math.cos(math.radians(center_lat)))
    
    points = []
    lat = center_lat - lat_range
    while lat <= center_lat + lat_range:
        lon = center_lon - lon_range
        while lon <= center_lon + lon_range:
            if haversine(center_lat, center_lon, lat, lon) <= radius_km:
                points.append((lat, lon))
            lon += lon_step
        lat += lat_step
    return points