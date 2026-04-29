import numpy as np
import pandas as pd
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self, modis_client, firms_client, weather_client):
        self.modis_client = modis_client
        self.firms_client = firms_client
        self.weather_client = weather_client
    
    async def load_features_for_location(self, latitude: float, longitude: float,
                                          radius_km: float = 50.0, time_horizon_hours: int = 24) -> Dict:
        weather = await self.weather_client.get_weather(latitude, longitude)
        firms = await self.firms_client.get_fires_near(latitude, longitude, radius_km)
        modis = await self.modis_client.get_land_data(latitude, longitude)
        
        features = {}
        
        # Weather
        features["temperature_c"] = weather.get("temperature", 25.0)
        features["humidity_pct"] = weather.get("humidity", 50.0)
        features["wind_speed_kmh"] = weather.get("wind_speed", 10.0)
        features["wind_direction_deg"] = weather.get("wind_direction", 180.0)
        features["pressure_hpa"] = weather.get("pressure", 1013.0)
        features["precipitation_mm"] = weather.get("precipitation", 0.0)
        features["cloud_cover_pct"] = weather.get("cloud_cover", 50.0)
        features["dew_point_c"] = weather.get("dew_point", 10.0)
        features["uv_index"] = weather.get("uv_index", 5.0)
        features["visibility_km"] = weather.get("visibility", 10.0)
        
        # FIRMS
        features["nearby_fire_count"] = len(firms)
        features["nearest_fire_dist_km"] = (
            min(f.get("distance_km", 999) for f in firms) if firms else 999.0
        )
        features["avg_fire_confidence"] = (
            np.mean([f.get("confidence", 0) for f in firms]) if firms else 0.0
        )
        features["max_fire_brightness"] = (
            max(f.get("brightness", 0) for f in firms) if firms else 0.0
        )
        features["fire_radiative_power"] = (
            sum(f.get("frp", 0) for f in firms) if firms else 0.0
        )
        
        # MODIS
        features["land_surface_temp_c"] = modis.get("lst", 30.0)
        features["ndvi"] = modis.get("ndvi", 0.5)
        features["evi"] = modis.get("evi", 0.3)
        features["land_cover_type"] = modis.get("land_cover", 1)
        features["soil_moisture"] = modis.get("soil_moisture", 0.3)
        features["elevation_m"] = modis.get("elevation", 500.0)
        features["slope_deg"] = modis.get("slope", 5.0)
        features["aspect_deg"] = modis.get("aspect", 180.0)
        
        # Derived
        features["temp_humidity_ratio"] = features["temperature_c"] / max(features["humidity_pct"], 1)
        features["drought_index"] = self._drought_index(features["temperature_c"], features["humidity_pct"], features["precipitation_mm"])
        features["fire_weather_index"] = self._fwi(features["temperature_c"], features["humidity_pct"], features["wind_speed_kmh"], features["precipitation_mm"])
        features["vegetation_dryness"] = self._veg_dryness(features["ndvi"], features["soil_moisture"], features["temperature_c"])
        features["fuel_moisture_content"] = self._fuel_moisture(features["temperature_c"], features["humidity_pct"], features["precipitation_mm"], features["wind_speed_kmh"])
        
        # Temporal
        from datetime import datetime
        now = datetime.utcnow()
        features["month"] = now.month
        features["day_of_year"] = now.timetuple().tm_yday
        features["hour"] = now.hour
        features["is_fire_season"] = 1 if now.month in [5,6,7,8,9,10] else 0
        
        # Spatial
        features["latitude"] = latitude
        features["longitude"] = longitude
        
        # Interaction
        features["temp_wind_interaction"] = features["temperature_c"] * features["wind_speed_kmh"]
        features["drought_vegetation_risk"] = features["drought_index"] * (1 - features["ndvi"])
        features["fire_proximity_risk"] = features["nearby_fire_count"] / max(features["nearest_fire_dist_km"], 0.1)
        
        return features
    
    def _drought_index(self, temp, hum, precip):
        d = max(0, (temp - 10) * (100 - hum) / 1000)
        m = precip * 0.1
        return min(max(d - m, 0), 1)
    
    def _fwi(self, temp, hum, wind, precip):
        mc = max(0, 100 - hum) * 0.01
        tf = max(0, (temp - 15)) * 0.05
        wf = wind * 0.02
        pf = max(0, 1 - precip * 0.5)
        return min(max((mc + tf + wf) * pf, 0), 1)
    
    def _veg_dryness(self, ndvi, sm, temp):
        g = 1 - min(max(ndvi, 0), 1)
        d = 1 - min(max(sm, 0), 1)
        t = min(max((temp - 20) / 30, 0), 1)
        return g * 0.3 + d * 0.4 + t * 0.3
    
    def _fuel_moisture(self, temp, hum, precip, wind):
        b = hum * 0.01
        te = max(0, 1 - (temp - 15) / 35)
        pe = min(precip * 0.2, 0.5)
        we = max(0, 1 - wind / 50)
        return min(max(b*0.4 + te*0.2 + pe*0.2 + we*0.2, 0), 1)
    
    async def load_training_data(self) -> pd.DataFrame:
        import os
        training_file = 'data/training_data.csv'
        
        if os.path.exists(training_file):
            logger.info(f"📂 Loading real training data from {training_file}")
            try:
                data = pd.read_csv(training_file)
                # Ensure it has all required columns
                required_cols = ["temperature_c", "humidity_pct", "wind_speed_kmh", "risk_label"]
                if all(c in data.columns for c in required_cols):
                    return data
                else:
                    logger.warning(f"⚠️ Dataset missing required columns {required_cols}. Falling back to synthetic.")
            except Exception as e:
                logger.error(f"❌ Failed to load dataset: {e}")

        logger.info("🧪 Generating synthetic training data (no training_data.csv found)")
        np.random.seed(42)
        n = 50000
        
        data = pd.DataFrame({
            "temperature_c": np.random.normal(28, 12, n),
            "humidity_pct": np.clip(np.random.normal(45, 20, n), 5, 100),
            "wind_speed_kmh": np.clip(np.random.exponential(15, n), 0, 120),
            "wind_direction_deg": np.random.uniform(0, 360, n),
            "pressure_hpa": np.random.normal(1013, 10, n),
            "precipitation_mm": np.clip(np.random.exponential(2, n), 0, 50),
            "cloud_cover_pct": np.random.uniform(0, 100, n),
            "dew_point_c": np.random.normal(12, 8, n),
            "uv_index": np.random.uniform(0, 11, n),
            "visibility_km": np.clip(np.random.normal(10, 5, n), 0.1, 50),
            "land_surface_temp_c": np.random.normal(32, 15, n),
            "ndvi": np.clip(np.random.beta(5, 5, n), -0.1, 1.0),
            "evi": np.clip(np.random.beta(3, 7, n), -0.1, 1.0),
            "soil_moisture": np.clip(np.random.beta(3, 5, n), 0, 1),
            "elevation_m": np.clip(np.random.exponential(500, n), 0, 5000),
            "slope_deg": np.clip(np.random.exponential(8, n), 0, 60),
            "aspect_deg": np.random.uniform(0, 360, n),
            "nearby_fire_count": np.random.poisson(2, n),
            "nearest_fire_dist_km": np.clip(np.random.exponential(50, n), 0.1, 999),
            "fire_radiative_power": np.random.exponential(100, n),
            "latitude": np.random.uniform(-60, 60, n),
            "longitude": np.random.uniform(-180, 180, n),
            "month": np.random.randint(1, 13, n),
            "day_of_year": np.random.randint(1, 366, n),
            "hour": np.random.randint(0, 24, n),
        })
        
        data["temp_humidity_ratio"] = data["temperature_c"] / data["humidity_pct"].clip(1)
        data["drought_index"] = data.apply(lambda r: self._drought_index(r["temperature_c"], r["humidity_pct"], r["precipitation_mm"]), axis=1)
        data["fire_weather_index"] = data.apply(lambda r: self._fwi(r["temperature_c"], r["humidity_pct"], r["wind_speed_kmh"], r["precipitation_mm"]), axis=1)
        data["vegetation_dryness"] = data.apply(lambda r: self._veg_dryness(r["ndvi"], r["soil_moisture"], r["temperature_c"]), axis=1)
        data["fuel_moisture_content"] = data.apply(lambda r: self._fuel_moisture(r["temperature_c"], r["humidity_pct"], r["precipitation_mm"], r["wind_speed_kmh"]), axis=1)
        data["is_fire_season"] = data["month"].apply(lambda m: 1 if m in [5,6,7,8,9,10] else 0)
        data["temp_wind_interaction"] = data["temperature_c"] * data["wind_speed_kmh"]
        data["drought_vegetation_risk"] = data["drought_index"] * (1 - data["ndvi"])
        data["fire_proximity_risk"] = data["nearby_fire_count"] / data["nearest_fire_dist_km"].clip(0.1)
        
        # Generate labels
        risk_score = (
            0.20 * data["fire_weather_index"]
            + 0.15 * data["vegetation_dryness"]
            + 0.15 * (1 - data["fuel_moisture_content"])
            + 0.10 * (data["temperature_c"].clip(0) / 50)
            + 0.10 * (1 - data["humidity_pct"] / 100)
            + 0.10 * (data["wind_speed_kmh"] / 80)
            + 0.05 * data["fire_proximity_risk"].clip(0, 1)
            + 0.05 * data["is_fire_season"]
            + 0.05 * (data["slope_deg"] / 60)
            + 0.05 * np.random.normal(0, 0.05, n)
        ).clip(0, 1)
        
        data["risk_label"] = pd.cut(risk_score, bins=[-0.01, 0.25, 0.50, 0.75, 1.01], labels=[0,1,2,3]).astype(int)
        
        return data