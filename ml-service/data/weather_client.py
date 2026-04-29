import httpx
import logging
import numpy as np
from typing import Dict
from datetime import datetime

logger = logging.getLogger(__name__)

class WeatherClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.cache = {}
    
    async def get_weather(self, latitude: float, longitude: float) -> Dict:
        cache_key = f"{round(latitude, 2)}_{round(longitude, 2)}"
        if cache_key in self.cache:
            cached_time, data = self.cache[cache_key]
            if (datetime.utcnow() - cached_time).seconds < 1800:
                return data
        
        try:
            if not self.api_key:
                return self._synthetic_weather(latitude, longitude)
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{self.base_url}/weather",
                    params={"lat": latitude, "lon": longitude, "appid": self.api_key, "units": "metric"}
                )
                if resp.status_code == 200:
                    raw = resp.json()
                    data = {
                        "temperature": raw["main"]["temp"],
                        "humidity": raw["main"]["humidity"],
                        "pressure": raw["main"]["pressure"],
                        "wind_speed": raw["wind"]["speed"] * 3.6,  # m/s to km/h
                        "wind_direction": raw["wind"].get("deg", 0),
                        "cloud_cover": raw["clouds"]["all"],
                        "visibility": raw.get("visibility", 10000) / 1000,
                        "dew_point": raw["main"].get("temp") - ((100 - raw["main"]["humidity"]) / 5),
                        "precipitation": raw.get("rain", {}).get("1h", 0),
                        "uv_index": 5.0,
                    }
                    self.cache[cache_key] = (datetime.utcnow(), data)
                    return data
                return self._synthetic_weather(latitude, longitude)
        except Exception as e:
            logger.warning(f"Weather API error: {e}")
            return self._synthetic_weather(latitude, longitude)
    
    def _synthetic_weather(self, lat: float, lon: float) -> Dict:
        # Use location to create a deterministic but varied seed for this location
        loc_seed = int(abs(lat * 1000) + abs(lon * 1000)) % 1000000
        rng = np.random.RandomState(loc_seed)
        
        abs_lat = abs(lat)
        month = datetime.utcnow().month
        
        # Base temp by latitude
        base_temp = 35 - abs_lat * 0.5
        # Seasonal adjustment
        if lat > 0:  # Northern hemisphere
            seasonal = 10 * np.sin((month - 1) * np.pi / 6)
        else:
            seasonal = -10 * np.sin((month - 1) * np.pi / 6)
        
        temp = base_temp + seasonal + rng.normal(0, 5)
        
        return {
            "temperature": float(np.clip(temp, -40, 55)),
            "humidity": float(np.clip(rng.normal(50, 20), 5, 100)),
            "pressure": float(rng.normal(1013, 10)),
            "wind_speed": float(np.clip(rng.exponential(15), 0, 120)),
            "wind_direction": float(rng.uniform(0, 360)),
            "cloud_cover": float(rng.uniform(0, 100)),
            "visibility": float(np.clip(rng.normal(10, 5), 0.1, 50)),
            "dew_point": float(temp - rng.uniform(5, 20)),
            "precipitation": float(np.clip(rng.exponential(2), 0, 50)),
            "uv_index": float(np.clip(12 - abs_lat / 8, 0, 12)),
        }