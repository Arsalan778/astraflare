import numpy as np
import os
import logging
from typing import List, Dict
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict

logger = logging.getLogger(__name__)

class EnsembleStacker:
    """Meta-learner that stacks predictions from all base models."""
    
    def __init__(self, base_models: list):
        self.base_models = base_models
        self.meta_model = LogisticRegression(max_iter=1000, random_state=42)
        self.is_trained = False
        self.feature_names = []
        self.model_names = ["gradient_boosting", "conv_lstm", "transformer", "bayesian"]
    
    def train(self, X, y, feature_names):
        self.feature_names = feature_names
        
        logger.info("🔥 Training ensemble stacker with all base models...")
        
        # Train each base model
        model_metrics = {}
        for model, name in zip(self.base_models, self.model_names):
            logger.info(f"Training {name}...")
            metrics = model.train(X, y, feature_names)
            model_metrics[name] = metrics
        
        # Generate meta-features via cross-validated predictions
        logger.info("Generating meta-features...")
        meta_features = []
        for model in self.base_models:
            try:
                proba = model.predict_proba(X)
                meta_features.append(proba)
            except Exception as e:
                logger.warning(f"Meta-feature generation failed for model: {e}")
                meta_features.append(np.zeros((len(X), 4)))
        
        meta_X = np.hstack(meta_features)
        
        # Train meta-learner
        self.meta_model.fit(meta_X, y)
        
        from sklearn.metrics import accuracy_score
        meta_pred = self.meta_model.predict(meta_X)
        meta_acc = accuracy_score(y, meta_pred)
        logger.info(f"Ensemble stacker accuracy: {meta_acc:.4f}")
        
        self.is_trained = True
        
        return {
            "base_models": model_metrics,
            "ensemble_accuracy": float(meta_acc),
        }
    
    def predict_proba(self, X) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Ensemble not trained")
        
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        
        meta_features = []
        model_contribs = {}
        
        for model, name in zip(self.base_models, self.model_names):
            try:
                proba = model.predict_proba(X)
                meta_features.append(proba)
                model_contribs[name] = proba.tolist()
            except Exception as e:
                logger.warning(f"Prediction failed for {name}: {e}")
                meta_features.append(np.full((X.shape[0], 4), 0.25))
                model_contribs[name] = [[0.25, 0.25, 0.25, 0.25]]
        
        meta_X = np.hstack(meta_features)
        ensemble_proba = self.meta_model.predict_proba(meta_X)
        
        return ensemble_proba
    
    def predict(self, X) -> int:
        proba = self.predict_proba(X)
        return int(np.argmax(proba, axis=1)[0])
    
    def get_model_contributions(self, X) -> Dict:
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        contributions = {}
        for model, name in zip(self.base_models, self.model_names):
            try:
                proba = model.predict_proba(X)
                pred_class = int(np.argmax(proba, axis=1)[0])
                contributions[name] = {
                    "prediction": pred_class,
                    "confidence": float(np.max(proba)),
                    "probabilities": proba[0].tolist(),
                }
            except Exception as e:
                logger.warning(f"Failed to get contributions from {name}: {e}")
                contributions[name] = {"prediction": -1, "confidence": 0, "probabilities": [0.25]*4}
        return contributions
    
    def save_models(self, directory: str):
        os.makedirs(directory, exist_ok=True)
        import joblib
        for model, name in zip(self.base_models, self.model_names):
            path = os.path.join(directory, f"{name}.joblib")
            model.save(path)
        joblib.dump(self.meta_model, os.path.join(directory, "meta_model.joblib"))
        logger.info(f"All models saved to {directory}")
    
    def load_models(self, directory: str):
        import joblib
        for model, name in zip(self.base_models, self.model_names):
            path = os.path.join(directory, f"{name}.joblib")
            if os.path.exists(path):
                model.load(path)
        meta_path = os.path.join(directory, "meta_model.joblib")
        if os.path.exists(meta_path):
            self.meta_model = joblib.load(meta_path)
            self.is_trained = True
            self.feature_names = self.base_models[0].feature_names if self.base_models[0].feature_names else []
        logger.info(f"Models loaded from {directory}")