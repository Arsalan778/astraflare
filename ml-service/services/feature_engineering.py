"""
Real-time feature engineering pipeline.
Transforms raw data into ML-ready features with domain-specific transformations.
"""

import numpy as np
import logging
from typing import Dict, List, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Transforms raw location data into ML-ready feature vectors."""

    # Canonical feature order - must match training
    FEATURE_ORDER = [
        "temperature_c", "humidity_pct", "wind_speed_kmh", "wind_direction_deg",
        "pressure_hpa", "precipitation_mm", "cloud_cover_pct", "dew_point_c",
        "uv_index", "visibility_km", "land_surface_temp_c", "ndvi", "evi",
        "soil_moisture", "elevation_m", "slope_deg", "aspect_deg",
        "nearby_fire_count", "nearest_fire_dist_km", "fire_radiative_power",
        "latitude", "longitude", "month", "day_of_year", "hour",
        "temp_humidity_ratio", "drought_index", "fire_weather_index",
        "vegetation_dryness", "fuel_moisture_content", "is_fire_season",
        "temp_wind_interaction", "drought_vegetation_risk", "fire_proximity_risk",
    ]

    def features_to_array(self, features: Dict) -> Tuple[np.ndarray, List[str]]:
        """Convert feature dictionary to ordered numpy array."""
        values = []
        names = []
        for name in self.FEATURE_ORDER:
            val = features.get(name, 0.0)
            try:
                values.append(float(val))
            except (ValueError, TypeError):
                values.append(0.0)
            names.append(name)
        return np.array(values, dtype=np.float64), names

    def add_derived_features(self, features: Dict) -> Dict:
        """Add domain-specific derived features to the raw feature dictionary."""

        # Vapour Pressure Deficit (VPD) — key wildfire driver
        temp = features.get("temperature_c", 25)
        hum = features.get("humidity_pct", 50)
        svp = 0.6108 * np.exp((17.27 * temp) / (temp + 237.3))
        avp = svp * (hum / 100.0)
        features["vpd_kpa"] = max(svp - avp, 0)

        # Heat index approximation
        if temp > 27:
            features["heat_index"] = (
                -8.785 + 1.611 * temp + 2.339 * hum
                - 0.146 * temp * hum
                - 0.013 * temp**2 - 0.016 * hum**2
                + 0.002 * temp**2 * hum + 0.001 * temp * hum**2
                - 0.000004 * temp**2 * hum**2
            )
        else:
            features["heat_index"] = temp

        # Wind effect on fire
        wind = features.get("wind_speed_kmh", 10)
        features["wind_factor"] = min(wind / 40.0, 1.0)

        # Topographic fire risk
        slope = features.get("slope_deg", 5)
        features["slope_risk"] = min(slope / 30.0, 1.0)

        # Aspect factor (south-facing slopes in northern hemisphere are drier)
        lat = features.get("latitude", 0)
        aspect = features.get("aspect_deg", 180)
        if lat > 0:
            # Northern hemisphere: south-facing = more sun
            features["aspect_dryness"] = (1 + np.cos(np.radians(aspect - 180))) / 2
        else:
            features["aspect_dryness"] = (1 + np.cos(np.radians(aspect))) / 2

        # Days since last rain (approximated from precipitation)
        precip = features.get("precipitation_mm", 0)
        features["rain_deficit"] = max(0, 1.0 - precip / 5.0)

        # Composite fire danger score
        fwi = features.get("fire_weather_index", 0.5)
        veg_dry = features.get("vegetation_dryness", 0.5)
        fuel = features.get("fuel_moisture_content", 0.5)
        features["composite_danger"] = (
            0.3 * fwi + 0.25 * veg_dry + 0.2 * (1 - fuel)
            + 0.15 * features["wind_factor"] + 0.1 * features["slope_risk"]
        )

        return features

    def validate_features(self, features: Dict) -> Dict:
        """Validate and clamp feature values to reasonable ranges."""
        ranges = {
            "temperature_c": (-50, 60),
            "humidity_pct": (0, 100),
            "wind_speed_kmh": (0, 200),
            "wind_direction_deg": (0, 360),
            "pressure_hpa": (870, 1085),
            "precipitation_mm": (0, 500),
            "cloud_cover_pct": (0, 100),
            "ndvi": (-0.2, 1.0),
            "evi": (-0.2, 1.0),
            "soil_moisture": (0, 1),
            "elevation_m": (0, 8849),
            "slope_deg": (0, 90),
            "aspect_deg": (0, 360),
            "latitude": (-90, 90),
            "longitude": (-180, 180),
        }

        for key, (lo, hi) in ranges.items():
            if key in features:
                features[key] = max(lo, min(hi, float(features[key])))

        return features

    def get_feature_descriptions(self) -> Dict[str, str]:
        """Human-readable descriptions for all features."""
        return {
            "temperature_c": "Air temperature in Celsius",
            "humidity_pct": "Relative humidity percentage",
            "wind_speed_kmh": "Wind speed in km/h",
            "wind_direction_deg": "Wind direction in degrees",
            "pressure_hpa": "Atmospheric pressure in hPa",
            "precipitation_mm": "Precipitation in mm",
            "cloud_cover_pct": "Cloud cover percentage",
            "dew_point_c": "Dew point temperature in Celsius",
            "uv_index": "UV radiation index",
            "visibility_km": "Visibility in km",
            "land_surface_temp_c": "MODIS land surface temperature",
            "ndvi": "Normalized Difference Vegetation Index",
            "evi": "Enhanced Vegetation Index",
            "soil_moisture": "Soil moisture (0-1)",
            "elevation_m": "Elevation above sea level in meters",
            "slope_deg": "Terrain slope in degrees",
            "aspect_deg": "Terrain aspect in degrees",
            "nearby_fire_count": "Number of active fires nearby",
            "nearest_fire_dist_km": "Distance to nearest active fire",
            "fire_radiative_power": "Total fire radiative power nearby",
            "drought_index": "Calculated drought severity index",
            "fire_weather_index": "Fire Weather Index",
            "vegetation_dryness": "Vegetation dryness indicator",
            "fuel_moisture_content": "Estimated fuel moisture content",
            "temp_wind_interaction": "Temperature × wind speed interaction",
            "drought_vegetation_risk": "Drought × vegetation dryness",
            "fire_proximity_risk": "Fire count / distance risk factor",
        }