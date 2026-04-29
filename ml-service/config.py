import os
from dotenv import load_dotenv

from pathlib import Path
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    NASA_FIRMS_API_KEY: str = os.getenv("NASA_FIRMS_API_KEY", "")
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./saved_models")
    DATA_CACHE_DIR: str = os.getenv("DATA_CACHE_DIR", "./data/cache")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")

    FEATURE_COLUMNS = [
        "temperature_c", "humidity_pct", "wind_speed_kmh", "wind_direction_deg",
        "pressure_hpa", "precipitation_mm", "cloud_cover_pct", "dew_point_c",
        "uv_index", "visibility_km", "land_surface_temp_c", "ndvi", "evi",
        "soil_moisture", "elevation_m", "slope_deg", "aspect_deg",
        "nearby_fire_count", "nearest_fire_dist_km", "fire_radiative_power",
        "latitude", "longitude", "month", "day_of_year", "hour",
        "temp_humidity_ratio", "drought_index", "fire_weather_index",
        "vegetation_dryness", "fuel_moisture_content", "is_fire_season",
        "temp_wind_interaction", "drought_vegetation_risk", "fire_proximity_risk"
    ]

    RISK_LEVELS = {0: "low", 1: "moderate", 2: "high", 3: "extreme"}
    RISK_COLORS = {"low": "#22c55e", "moderate": "#eab308", "high": "#f97316", "extreme": "#ef4444"}

    LIGHTGBM_PARAMS = {
        "objective": "multiclass", "num_class": 4, "metric": "multi_logloss",
        "boosting_type": "gbdt", "num_leaves": 63, "learning_rate": 0.05,
        "feature_fraction": 0.8, "bagging_fraction": 0.8, "bagging_freq": 5,
        "verbose": -1, "n_estimators": 500, "max_depth": 8,
    }

    CATBOOST_PARAMS = {
        "iterations": 500, "learning_rate": 0.05, "depth": 8,
        "loss_function": "MultiClass", "classes_count": 4, "verbose": 0,
    }

settings = Settings()