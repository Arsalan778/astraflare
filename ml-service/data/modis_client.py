import numpy as np
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class MODISClient:
    async def get_land_data(self, latitude: float, longitude: float) -> Dict:
        return self._estimate_land_data(latitude, longitude)
    
    def _estimate_land_data(self, lat: float, lon: float) -> Dict:
        # Use location to create a deterministic but varied seed for this location
        loc_seed = int(abs(lat * 1000) + abs(lon * 1000)) % 1000000
        rng = np.random.RandomState(loc_seed)
        
        abs_lat = abs(lat)
        
        if abs_lat < 23.5:
            lst = rng.normal(35, 5)
            ndvi = rng.beta(7, 3)
            soil_moisture = rng.beta(5, 3)
        elif abs_lat < 40:
            lst = rng.normal(28, 8)
            ndvi = rng.beta(5, 5)
            soil_moisture = rng.beta(4, 4)
        elif abs_lat < 60:
            lst = rng.normal(18, 10)
            ndvi = rng.beta(6, 4)
            soil_moisture = rng.beta(5, 3)
        else:
            lst = rng.normal(-5, 15)
            ndvi = rng.beta(2, 8)
            soil_moisture = rng.beta(6, 2)
        
        return {
            "lst": float(lst),
            "ndvi": float(np.clip(ndvi, -0.1, 1.0)),
            "evi": float(np.clip(ndvi * 0.7 + rng.normal(0, 0.05), -0.1, 1.0)),
            "land_cover": int(rng.choice([1, 2, 4, 5, 7, 8, 10, 12])),
            "soil_moisture": float(np.clip(soil_moisture, 0, 1)),
            "elevation": float(max(0, rng.exponential(500))),
            "slope": float(max(0, rng.exponential(8))),
            "aspect": float(rng.uniform(0, 360)),
        }