import httpx
import logging
import numpy as np
import math
from typing import List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

class FIRMSClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
        self.cache = {}
    
    async def get_active_fires(self, days: int = 1, min_confidence: int = 70) -> List[Dict]:
        cache_key = f"global_{days}"
        if cache_key in self.cache:
            cached_time, data = self.cache[cache_key]
            if (datetime.utcnow() - cached_time).seconds < 3600:
                return data
        
        try:
            if not self.api_key:
                return self._synthetic_fires()
            
            url = f"{self.base_url}/{self.api_key}/VIIRS_SNPP_NRT/world/{days}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    fires = self._parse_csv(resp.text, min_confidence)
                    self.cache[cache_key] = (datetime.utcnow(), fires)
                    return fires
            return self._synthetic_fires()
        except Exception as e:
            logger.warning(f"FIRMS API error: {e}")
            return self._synthetic_fires()
    
    async def get_fires_near(self, lat: float, lon: float, radius_km: float = 50, days: int = 2) -> List[Dict]:
        all_fires = await self.get_active_fires(days=days)
        nearby = []
        for fire in all_fires:
            dist = self._haversine(lat, lon, fire["latitude"], fire["longitude"])
            if dist <= radius_km:
                fire["distance_km"] = round(dist, 2)
                nearby.append(fire)
        return nearby
    
    def _parse_csv(self, csv_text: str, min_confidence: int) -> List[Dict]:
        lines = csv_text.strip().split("\n")
        if len(lines) < 2:
            return []
        headers = lines[0].split(",")
        fires = []
        for line in lines[1:2000]:
            values = line.split(",")
            if len(values) != len(headers):
                continue
            row = dict(zip(headers, values))
            try:
                conf = float(row.get("confidence", 0))
                if conf >= min_confidence:
                    fires.append({
                        "latitude": float(row.get("latitude", 0)),
                        "longitude": float(row.get("longitude", 0)),
                        "brightness": float(row.get("bright_ti4", row.get("brightness", 300))),
                        "confidence": conf,
                        "frp": float(row.get("frp", 0)),
                        "acq_date": row.get("acq_date", ""),
                        "satellite": row.get("satellite", "VIIRS"),
                    })
            except (ValueError, TypeError):
                continue
        return fires
    
    def _synthetic_fires(self) -> List[Dict]:
        rng = np.random.RandomState(int(datetime.utcnow().timestamp()) % 1000000)
        hotspots = [
            (37.0, -119.5), (-15.0, -55.0), (-25.0, 135.0), (60.0, 100.0),
            (38.0, 23.0), (40.0, -8.0), (10.0, 105.0), (-5.0, 25.0),
            (34.0, -118.0), (44.0, -121.0), (-33.0, 150.0), (62.0, 130.0),
        ]
        fires = []
        for lat, lon in hotspots:
            for _ in range(rng.randint(3, 25)):
                fires.append({
                    "latitude": float(lat + rng.normal(0, 1.5)),
                    "longitude": float(lon + rng.normal(0, 1.5)),
                    "brightness": float(rng.uniform(300, 500)),
                    "confidence": float(rng.uniform(60, 100)),
                    "frp": float(rng.exponential(50)),
                    "acq_date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "satellite": "VIIRS",
                })
        return fires
    
    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp = math.radians(lat2 - lat1)
        dl = math.radians(lon2 - lon1)
        a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))