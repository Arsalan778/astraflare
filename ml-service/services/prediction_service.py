"""
Core Prediction Service - orchestrates data loading, feature engineering,
model inference, and result formatting.
"""

import numpy as np
import logging
import asyncio
from typing import Dict, List, Optional
from datetime import datetime

from config import settings

logger = logging.getLogger(__name__)


class PredictionService:
    """Main service that coordinates the full prediction pipeline."""

    def __init__(self, ensemble_model, feature_engineer, data_loader):
        self.ensemble_model = ensemble_model
        self.feature_engineer = feature_engineer
        self.data_loader = data_loader
        self.prediction_count = 0
        self.last_training_time = None

    async def predict(self, latitude: float, longitude: float,
                      radius_km: float = 50.0,
                      time_horizon_hours: int = 24) -> Dict:
        """Full prediction pipeline for a single location."""

        # Auto-train if models are not ready
        if not self.ensemble_model.is_trained:
            logger.info("Models not trained. Triggering initial training...")
            await self._initial_train()

        # 1. Load real-time features
        raw_features = await self.data_loader.load_features_for_location(
            latitude, longitude, radius_km, time_horizon_hours
        )

        # 2. Validate and add derived features
        raw_features = self.feature_engineer.validate_features(raw_features)
        raw_features = self.feature_engineer.add_derived_features(raw_features)

        # 3. Convert to array
        features_array, feature_names = self.feature_engineer.features_to_array(raw_features)

        # 4. Ensemble prediction
        proba = self.ensemble_model.predict_proba(features_array)
        predicted_class = int(np.argmax(proba, axis=1)[0])
        confidence = float(np.max(proba))
        risk_score = float(
            proba[0][1] * 0.25 + proba[0][2] * 0.65 + proba[0][3] * 1.0
        )

        # 5. Get model contributions
        contributions = self.ensemble_model.get_model_contributions(features_array)

        # 6. Feature importance from gradient boosting base model
        feature_importance = {}
        try:
            gb_model = self.ensemble_model.base_models[0]
            feature_importance = gb_model.get_feature_importance()
        except Exception:
            pass

        self.prediction_count += 1

        return {
            "risk_level": settings.RISK_LEVELS.get(predicted_class, "unknown"),
            "risk_score": round(risk_score, 4),
            "confidence": round(confidence, 4),
            "risk_probabilities": {
                settings.RISK_LEVELS[i]: round(float(proba[0][i]), 4)
                for i in range(4)
            },
            "features": {k: round(float(v), 4) for k, v in raw_features.items()
                         if isinstance(v, (int, float, np.integer, np.floating))},
            "features_array": features_array,
            "feature_names": feature_names,
            "model_contributions": contributions,
            "feature_importance": feature_importance,
            "predicted_class": predicted_class,
        }

    async def _initial_train(self):
        """Train all models on historical data."""
        logger.info("🚀 Starting initial model training...")

        df = await self.data_loader.load_training_data()

        feature_cols = [c for c in df.columns if c != "risk_label"]
        X = df[feature_cols].values
        y = df["risk_label"].values

        metrics = self.ensemble_model.train(X, y, feature_cols)

        # Save models
        try:
            self.ensemble_model.save_models(settings.MODEL_DIR)
        except Exception as e:
            logger.warning(f"Could not save models: {e}")

        self.last_training_time = datetime.utcnow()
        logger.info(f"✅ Training complete. Metrics: {metrics}")

    async def retrain(self, model_types: List[str] = None,
                      dataset_path: Optional[str] = None,
                      hyperparameter_tuning: bool = True):
        """Retrain models (triggered by admin)."""
        logger.info("♻️ Retraining models...")
        await self._initial_train()
        logger.info("✅ Retraining complete")

    async def generate_global_heatmap(self, resolution: str = "medium") -> Dict:
        """Generate global risk heatmap data."""
        step = {"low": 10, "medium": 5, "high": 2}[resolution]

        if not self.ensemble_model.is_trained:
            await self._initial_train()

        points = []
        lats = np.arange(-60, 61, step)
        lons = np.arange(-180, 181, step)

        for lat in lats:
            for lon in lons:
                try:
                    raw_features = await self.data_loader.load_features_for_location(
                        lat, lon, radius_km=25, time_horizon_hours=24
                    )
                    raw_features = self.feature_engineer.validate_features(raw_features)
                    raw_features = self.feature_engineer.add_derived_features(raw_features)
                    features_array, _ = self.feature_engineer.features_to_array(raw_features)

                    proba = self.ensemble_model.predict_proba(features_array)
                    risk_score = float(
                        proba[0][1] * 0.25 + proba[0][2] * 0.65 + proba[0][3] * 1.0
                    )

                    if risk_score > 0.1:
                        points.append({
                            "lat": float(lat),
                            "lon": float(lon),
                            "risk": round(risk_score, 3),
                            "level": settings.RISK_LEVELS[int(np.argmax(proba))],
                        })
                except Exception:
                    continue

        return {
            "points": points,
            "count": len(points),
            "resolution": resolution,
            "generated_at": datetime.utcnow().isoformat(),
        }

    def get_model_status(self) -> Dict:
        """Return status of all loaded models."""
        status = {
            "ensemble_trained": self.ensemble_model.is_trained,
            "prediction_count": self.prediction_count,
            "last_training": self.last_training_time.isoformat() if self.last_training_time else None,
            "models": {},
        }

        for model, name in zip(
            self.ensemble_model.base_models,
            self.ensemble_model.model_names,
        ):
            status["models"][name] = {
                "trained": model.is_trained,
                "type": type(model).__name__,
            }

        return status