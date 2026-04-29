"""
AstraFlare ML Service — FastAPI Application
============================================
Handles all ML predictions, model training, explainability,
fire spread simulation, emissions estimation, and PyroSage AI agent.
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from data.data_loader import DataLoader
from data.firms_client import FIRMSClient
from data.modis_client import MODISClient
from data.weather_client import WeatherClient
from models.bayesian_network import BayesianRiskNetwork
from models.conv_lstm import ConvLSTMPredictor
from models.ensemble_stacker import EnsembleStacker
from models.gradient_boosting import GradientBoostingPredictor
from models.transformer_model import TransformerPredictor
from models.automl_pipeline import AutoMLPipeline
from services.prediction_service import PredictionService
from services.feature_engineering import FeatureEngineer
from services.explainability import ExplainabilityService
from services.fire_spread_simulator import FireSpreadSimulator
from services.satellite_processor import SatelliteProcessor
from services.emissions_estimator import EmissionsEstimator
from services.rag_service import RAGService

# ============ Logging ============
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("astraflare.ml")

# ============ Global Service Instances ============
prediction_service: Optional[PredictionService] = None
feature_engineer: Optional[FeatureEngineer] = None
explainability_service: Optional[ExplainabilityService] = None
fire_spread_sim: Optional[FireSpreadSimulator] = None
satellite_processor: Optional[SatelliteProcessor] = None
emissions_estimator: Optional[EmissionsEstimator] = None
rag_service: Optional[RAGService] = None
data_loader: Optional[DataLoader] = None


# ============ Lifespan ============
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all services on startup, clean up on shutdown."""
    global prediction_service, feature_engineer, explainability_service
    global fire_spread_sim, satellite_processor, emissions_estimator
    global rag_service, data_loader

    logger.info("=" * 60)
    logger.info("🚀 AstraFlare ML Service Starting...")
    logger.info("=" * 60)

    # --- Data Clients ---
    modis_client = MODISClient()
    firms_client = FIRMSClient(api_key=settings.NASA_FIRMS_API_KEY)
    weather_client = WeatherClient(api_key=settings.OPENWEATHER_API_KEY)
    data_loader = DataLoader(modis_client, firms_client, weather_client)

    # --- Feature Engineering ---
    feature_engineer = FeatureEngineer()

    # --- ML Models ---
    gb_predictor = GradientBoostingPredictor()
    conv_lstm = ConvLSTMPredictor()
    transformer = TransformerPredictor()
    bayesian = BayesianRiskNetwork()
    ensemble = EnsembleStacker([gb_predictor, conv_lstm, transformer, bayesian])

    # --- Services ---
    prediction_service = PredictionService(
        ensemble_model=ensemble,
        feature_engineer=feature_engineer,
        data_loader=data_loader,
    )
    explainability_service = ExplainabilityService()
    fire_spread_sim = FireSpreadSimulator()
    satellite_processor = SatelliteProcessor()
    emissions_estimator = EmissionsEstimator()
    rag_service = RAGService(api_key=settings.GEMINI_API_KEY)

    # --- Load Pre-trained Models ---
    model_dir = settings.MODEL_DIR
    model_dir = settings.MODEL_DIR
try:
    gb_path = os.path.join(model_dir, "gradient_boosting.joblib")
    logger.info(f"Looking for models in: {model_dir}")
    logger.info(f"gradient_boosting.joblib exists: {os.path.exists(gb_path)}")

    if os.path.exists(gb_path):
        ensemble.load_models(model_dir)
        logger.info("✅ Pre-trained models loaded from disk")
    else:
        logger.info("⚠️ No pre-trained models found. Will train on first request.")
except Exception:
    logger.exception("⚠️ Could not load models")

    logger.info("=" * 60)
    logger.info("✅ AstraFlare ML Service Ready")
    logger.info("=" * 60)

    yield  # App is running

    logger.info("🛑 AstraFlare ML Service shutting down...")


# ============ FastAPI App ============
app = FastAPI(
    title="AstraFlare ML Service",
    description=(
        "Intelligent Wildfire Risk Prediction & Analysis API.\n\n"
        "Provides ensemble ML predictions, fire spread simulation, "
        "emissions estimation, explainable AI, and PyroSage AI agent."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Pydantic Request/Response Models ============

class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude (-180 to 180)")
    radius_km: float = Field(default=50.0, ge=1, le=500, description="Analysis radius in km")


class PredictionRequest(BaseModel):
    location: LocationInput
    time_horizon_hours: int = Field(default=24, ge=1, le=168)
    include_explainability: bool = Field(default=True)
    include_spread_simulation: bool = Field(default=False)
    include_emissions: bool = Field(default=False)


class BatchPredictionRequest(BaseModel):
    locations: List[LocationInput]
    time_horizon_hours: int = Field(default=24, ge=1, le=168)


class FireSpreadRequest(BaseModel):
    location: LocationInput
    fire_intensity: float = Field(default=0.7, ge=0, le=1)
    simulation_hours: int = Field(default=48, ge=1, le=168)
    wind_speed_kmh: float = Field(default=20.0, ge=0, le=200)
    wind_direction_deg: float = Field(default=180.0, ge=0, le=360)
    terrain_type: str = Field(default="mixed", pattern="^(forest|grassland|shrubland|desert|mixed)$")


class PyroSageQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    context: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None
    location: Optional[LocationInput] = None


class TrainRequest(BaseModel):
    dataset_path: Optional[str] = None
    model_types: List[str] = Field(
        default=["lightgbm", "catboost", "conv_lstm", "transformer", "bayesian"]
    )
    hyperparameter_tuning: bool = Field(default=True)


class EmissionsRequest(BaseModel):
    location: LocationInput
    risk_score: Optional[float] = Field(default=None, ge=0, le=1)
    area_km2: Optional[float] = Field(default=None, ge=0)


class SatelliteAnalysisRequest(BaseModel):
    location: LocationInput
    radius_km: float = Field(default=50.0, ge=1, le=500)


class PredictionResponse(BaseModel):
    risk_level: str
    risk_score: float
    confidence: float
    risk_probabilities: Dict[str, float]
    features_used: Dict[str, float]
    model_contributions: Dict[str, Any]
    explainability: Optional[Dict[str, Any]] = None
    fire_spread: Optional[Dict[str, Any]] = None
    emissions: Optional[Dict[str, Any]] = None
    timestamp: str
    location: Dict[str, float]


# ============ Health & Status ============

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AstraFlare ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": prediction_service.ensemble_model.is_trained if prediction_service else False,
    }


@app.get("/models/status", tags=["System"])
async def get_model_status():
    """Get detailed status of all ML models."""
    if not prediction_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return prediction_service.get_model_status()


# ============ Prediction Endpoints ============

@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_wildfire_risk(request: PredictionRequest):
    """
    Generate wildfire risk prediction for a specific location.

    Uses an ensemble of LightGBM, CatBoost, Random Forest (ConvLSTM proxy),
    ExtraTrees (Transformer proxy), and Bayesian Network models,
    stacked with a logistic regression meta-learner.
    """
    if not prediction_service:
        raise HTTPException(status_code=503, detail="Prediction service not ready")

    try:
        result = await prediction_service.predict(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            radius_km=request.location.radius_km,
            time_horizon_hours=request.time_horizon_hours,
        )

        response_data = {
            "risk_level": result["risk_level"],
            "risk_score": result["risk_score"],
            "confidence": result["confidence"],
            "risk_probabilities": result["risk_probabilities"],
            "features_used": result["features"],
            "model_contributions": result["model_contributions"],
            "timestamp": datetime.utcnow().isoformat(),
            "location": {
                "latitude": request.location.latitude,
                "longitude": request.location.longitude,
            },
        }

        # Explainability
        if request.include_explainability:
            try:
                explanation = await explainability_service.explain(
                    features=result["features_array"],
                    feature_names=result["feature_names"],
                    model=prediction_service.ensemble_model,
                )
                response_data["explainability"] = explanation
            except Exception as e:
                logger.warning(f"Explainability failed: {e}")
                response_data["explainability"] = {"error": str(e)}

        # Fire spread simulation
        if request.include_spread_simulation and result["risk_score"] > 0.4:
            try:
                spread = await fire_spread_sim.simulate(
                    latitude=request.location.latitude,
                    longitude=request.location.longitude,
                    fire_intensity=result["risk_score"],
                    hours=min(request.time_horizon_hours, 48),
                )
                response_data["fire_spread"] = spread
            except Exception as e:
                logger.warning(f"Fire spread simulation failed: {e}")
                response_data["fire_spread"] = {"error": str(e)}

        # Emissions estimate
        if request.include_emissions and result["risk_score"] > 0.3:
            try:
                emissions = await emissions_estimator.estimate(
                    latitude=request.location.latitude,
                    longitude=request.location.longitude,
                    risk_score=result["risk_score"],
                    area_km2=request.location.radius_km ** 2 * 3.14159,
                )
                response_data["emissions"] = emissions
            except Exception as e:
                logger.warning(f"Emissions estimation failed: {e}")
                response_data["emissions"] = {"error": str(e)}

        return PredictionResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch", tags=["Predictions"])
async def batch_predict(request: BatchPredictionRequest):
    """Generate risk predictions for multiple locations."""
    if not prediction_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        results = []
        for loc in request.locations:
            try:
                result = await prediction_service.predict(
                    latitude=loc.latitude,
                    longitude=loc.longitude,
                    radius_km=loc.radius_km,
                    time_horizon_hours=request.time_horizon_hours,
                )
                results.append({
                    "location": {"latitude": loc.latitude, "longitude": loc.longitude},
                    "risk_level": result["risk_level"],
                    "risk_score": result["risk_score"],
                    "confidence": result["confidence"],
                    "risk_probabilities": result["risk_probabilities"],
                })
            except Exception as e:
                results.append({
                    "location": {"latitude": loc.latitude, "longitude": loc.longitude},
                    "error": str(e),
                })

        return {
            "predictions": results,
            "count": len(results),
            "successful": sum(1 for r in results if "error" not in r),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Explainability ============

@app.post("/explain", tags=["Explainability"])
async def explain_prediction(request: PredictionRequest):
    """Get detailed SHAP and LIME explanations for a prediction."""
    if not prediction_service or not explainability_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        result = await prediction_service.predict(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            radius_km=request.location.radius_km,
            time_horizon_hours=request.time_horizon_hours,
        )

        shap_explanation = await explainability_service.explain_shap(
            features=result["features_array"],
            feature_names=result["feature_names"],
            model=prediction_service.ensemble_model,
        )

        lime_explanation = await explainability_service.explain_lime(
            features=result["features_array"],
            feature_names=result["feature_names"],
            model=prediction_service.ensemble_model,
        )

        return {
            "prediction": {
                "risk_level": result["risk_level"],
                "risk_score": result["risk_score"],
                "confidence": result["confidence"],
            },
            "shap": shap_explanation,
            "lime": lime_explanation,
            "feature_importance": result.get("feature_importance", {}),
            "feature_descriptions": feature_engineer.get_feature_descriptions(),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Explanation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============ Fire Spread Simulation ============

@app.post("/simulate/fire-spread", tags=["Simulation"])
async def simulate_fire_spread(request: FireSpreadRequest):
    """
    Simulate fire spread pattern from a given ignition point.

    Uses a cellular automaton model accounting for wind, slope,
    vegetation density, and fuel moisture.
    """
    if not fire_spread_sim:
        raise HTTPException(status_code=503, detail="Simulation service not ready")

    try:
        result = await fire_spread_sim.simulate(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            fire_intensity=request.fire_intensity,
            hours=request.simulation_hours,
            wind_speed=request.wind_speed_kmh,
            wind_direction=request.wind_direction_deg,
            terrain_type=request.terrain_type,
        )
        return result
    except Exception as e:
        logger.error(f"Fire spread simulation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============ Emissions & Environmental Impact ============

@app.post("/emissions/estimate", tags=["Environment"])
async def estimate_emissions(request: EmissionsRequest):
    """Estimate environmental impact (CO2, PM2.5, forest loss) of a potential wildfire."""
    if not emissions_estimator:
        raise HTTPException(status_code=503, detail="Emissions service not ready")

    try:
        risk_score = request.risk_score
        area_km2 = request.area_km2

        # If no risk score provided, run prediction first
        if risk_score is None:
            if prediction_service:
                result = await prediction_service.predict(
                    latitude=request.location.latitude,
                    longitude=request.location.longitude,
                    radius_km=request.location.radius_km,
                )
                risk_score = result["risk_score"]
            else:
                risk_score = 0.5

        if area_km2 is None:
            area_km2 = request.location.radius_km ** 2 * 3.14159

        emissions = await emissions_estimator.estimate(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            risk_score=risk_score,
            area_km2=area_km2,
        )
        return emissions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Satellite Analysis ============

@app.post("/satellite/analyze", tags=["Satellite"])
async def analyze_satellite_data(request: SatelliteAnalysisRequest):
    """Analyze satellite data for fire-prone region detection."""
    if not satellite_processor or not data_loader:
        raise HTTPException(status_code=503, detail="Satellite service not ready")

    try:
        # Get active fires in the region
        fires = await data_loader.firms_client.get_fires_near(
            request.location.latitude,
            request.location.longitude,
            request.radius_km,
        )

        analysis = await satellite_processor.analyze_region(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            radius_km=request.radius_km,
            active_fires=fires,
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Heatmap & Active Fires ============

@app.get("/heatmap/global", tags=["Map Data"])
async def get_global_heatmap(
    resolution: str = Query(default="medium", pattern="^(low|medium|high)$"),
):
    """Get global wildfire risk heatmap data for map visualization."""
    if not prediction_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        heatmap = await prediction_service.generate_global_heatmap(resolution=resolution)
        return heatmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/active-fires", tags=["Map Data"])
async def get_active_fires(
    days: int = Query(default=1, ge=1, le=10),
    min_confidence: int = Query(default=70, ge=0, le=100),
):
    """Get active fire detections from NASA FIRMS."""
    if not data_loader:
        raise HTTPException(status_code=503, detail="Data service not ready")

    try:
        fires = await data_loader.firms_client.get_active_fires(
            days=days, min_confidence=min_confidence
        )
        return {
            "fires": fires,
            "count": len(fires),
            "days_range": days,
            "min_confidence": min_confidence,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/active-fires/near", tags=["Map Data"])
async def get_fires_near_location(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=100, ge=1, le=1000),
    days: int = Query(default=2, ge=1, le=10),
):
    """Get active fires near a specific location."""
    if not data_loader:
        raise HTTPException(status_code=503, detail="Data service not ready")

    try:
        fires = await data_loader.firms_client.get_fires_near(
            latitude, longitude, radius_km, days
        )
        return {
            "fires": fires,
            "count": len(fires),
            "center": {"latitude": latitude, "longitude": longitude},
            "radius_km": radius_km,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ PyroSage AI Agent ============

@app.post("/pyrosage/chat", tags=["PyroSage AI"])
async def pyrosage_chat(query: PyroSageQuery):
    """
    PyroSage 🔥 — Intelligent wildfire analyst AI agent.

    Uses RAG (Retrieval-Augmented Generation) with a wildfire knowledge base
    and LLM reasoning to answer questions, explain predictions, and provide
    recommendations.
    """
    if not rag_service:
        raise HTTPException(status_code=503, detail="PyroSage not ready")

    try:
        # If location provided, enrich context with prediction data
        enriched_context = query.context or {}

        if query.location and prediction_service:
            try:
                pred = await prediction_service.predict(
                    latitude=query.location.latitude,
                    longitude=query.location.longitude,
                )
                enriched_context.update({
                    "risk_level": pred["risk_level"],
                    "risk_score": pred["risk_score"],
                    "confidence": pred["confidence"],
                    "risk_probabilities": pred["risk_probabilities"],
                    "features": pred["features"],
                    "model_contributions": pred["model_contributions"],
                })
            except Exception as e:
                logger.warning(f"Could not enrich PyroSage context: {e}")

        response = await rag_service.query(
            user_query=query.query,
            context=enriched_context if enriched_context else None,
            conversation_id=query.conversation_id,
            location=query.location.model_dump() if query.location else None,
        )
        return response

    except Exception as e:
        logger.error(f"PyroSage error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PyroSage error: {str(e)}")


@app.post("/pyrosage/analyze-location", tags=["PyroSage AI"])
async def pyrosage_analyze_location(location: LocationInput):
    """
    Ask PyroSage to provide a comprehensive analysis of a location.
    Automatically runs prediction and generates a detailed report.
    """
    if not rag_service or not prediction_service:
        raise HTTPException(status_code=503, detail="Services not ready")

    try:
        # Run prediction
        pred = await prediction_service.predict(
            latitude=location.latitude,
            longitude=location.longitude,
            radius_km=location.radius_km,
        )

        # Get explanation
        explanation = None
        try:
            explanation = await explainability_service.explain(
                features=pred["features_array"],
                feature_names=pred["feature_names"],
                model=prediction_service.ensemble_model,
            )
        except Exception:
            pass

        context = {
            "risk_level": pred["risk_level"],
            "risk_score": pred["risk_score"],
            "confidence": pred["confidence"],
            "risk_probabilities": pred["risk_probabilities"],
            "features": pred["features"],
            "model_contributions": pred["model_contributions"],
        }
        if explanation:
            context["explainability"] = explanation

        # Ask PyroSage to analyze
        analysis = await rag_service.query(
            user_query=(
                f"Provide a comprehensive wildfire risk analysis for this location "
                f"at coordinates ({location.latitude}, {location.longitude}). "
                f"Explain the current risk level, key contributing factors, "
                f"and provide specific recommendations."
            ),
            context=context,
            location=location.model_dump(),
        )

        # Sanitize prediction values (ensure no NaNs)
        def sanitize_float(val):
            try:
                if val is None or np.isnan(float(val)) or np.isinf(float(val)):
                    return 0.0
                return float(val)
            except:
                return 0.0

        return {
            "prediction": {
                "risk_level": pred["risk_level"],
                "risk_score": sanitize_float(pred["risk_score"]),
                "confidence": sanitize_float(pred["confidence"]),
                "risk_probabilities": [sanitize_float(p) for p in pred["risk_probabilities"]],
            },
            "analysis": analysis["response"],
            "suggestions": analysis["suggestions"],
            "features": pred["features"],
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/pyrosage/conversation/{conversation_id}", tags=["PyroSage AI"])
async def clear_conversation(conversation_id: str):
    """Clear a PyroSage conversation history."""
    if rag_service:
        rag_service.clear_conversation(conversation_id)
    return {"status": "cleared", "conversation_id": conversation_id}


# ============ Training & Admin ============

@app.post("/train", tags=["Admin"])
async def trigger_training(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger model retraining.
    Runs in background — returns immediately with status.
    """
    if not prediction_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        background_tasks.add_task(
            prediction_service.retrain,
            model_types=request.model_types,
            dataset_path=request.dataset_path,
            hyperparameter_tuning=request.hyperparameter_tuning,
        )
        return {
            "status": "training_started",
            "model_types": request.model_types,
            "hyperparameter_tuning": request.hyperparameter_tuning,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Training is running in the background. Check /models/status for progress.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/features/descriptions", tags=["System"])
async def get_feature_descriptions():
    """Get human-readable descriptions for all ML features."""
    if not feature_engineer:
        raise HTTPException(status_code=503, detail="Service not ready")
    return {
        "features": feature_engineer.get_feature_descriptions(),
        "feature_order": feature_engineer.FEATURE_ORDER,
        "total": len(feature_engineer.FEATURE_ORDER),
    }


@app.get("/weather/{latitude}/{longitude}", tags=["Data Sources"])
async def get_weather_data(latitude: float, longitude: float):
    """Get current weather data for a location."""
    if not data_loader:
        raise HTTPException(status_code=503, detail="Service not ready")
    try:
        weather = await data_loader.weather_client.get_weather(latitude, longitude)
        return {"weather": weather, "location": {"latitude": latitude, "longitude": longitude}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/land-data/{latitude}/{longitude}", tags=["Data Sources"])
async def get_land_data(latitude: float, longitude: float):
    """Get MODIS land surface data for a location."""
    if not data_loader:
        raise HTTPException(status_code=503, detail="Service not ready")
    try:
        land = await data_loader.modis_client.get_land_data(latitude, longitude)
        return {"land_data": land, "location": {"latitude": latitude, "longitude": longitude}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Entry Point ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )