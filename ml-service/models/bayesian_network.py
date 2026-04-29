import numpy as np
import logging
from typing import Dict
from scipy.stats import norm, beta

logger = logging.getLogger(__name__)

class BayesianRiskNetwork:
    """Probabilistic Bayesian Network for wildfire risk assessment."""
    
    def __init__(self):
        self.is_trained = False
        self.priors = {
            "low": 0.4, "moderate": 0.3, "high": 0.2, "extreme": 0.1
        }
        self.conditional_params = {}
    
    def train(self, X, y, feature_names):
        """Learn conditional probability distributions from data."""
        self.feature_names = feature_names
        
        for class_idx in range(4):
            mask = y == class_idx
            if mask.sum() == 0:
                continue
            class_data = X[mask]
            self.conditional_params[class_idx] = {}
            for i, name in enumerate(feature_names):
                col = class_data[:, i]
                self.conditional_params[class_idx][name] = {
                    "mean": float(np.mean(col)),
                    "std": float(max(np.std(col), 1e-6)),
                }
        
        # Update priors from data
        for class_idx in range(4):
            self.priors[class_idx] = float(np.mean(y == class_idx))
        
        self.is_trained = True
        logger.info("Bayesian Network trained successfully")
        return {"status": "trained", "classes": 4}
    
    def predict_proba(self, X) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Bayesian Network not trained")
        
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        
        results = []
        for sample in X:
            posteriors = []
            for class_idx in range(4):
                log_prob = np.log(self.priors.get(class_idx, 0.25) + 1e-10)
                params = self.conditional_params.get(class_idx, {})
                for i, name in enumerate(self.feature_names):
                    if name in params:
                        p = params[name]
                        log_prob += norm.logpdf(sample[i], p["mean"], p["std"])
                posteriors.append(log_prob)
            
            posteriors = np.array(posteriors)
            posteriors -= np.max(posteriors)  # Numerical stability
            proba = np.exp(posteriors)
            proba /= proba.sum()
            results.append(proba)
        
        return np.array(results)
    
    def predict(self, X) -> int:
        proba = self.predict_proba(X)
        return int(np.argmax(proba, axis=1)[0])
    
    def save(self, path):
        import joblib
        joblib.dump({"params": self.conditional_params, "priors": self.priors,
                      "feature_names": self.feature_names, "is_trained": self.is_trained}, path)
    
    def load(self, path):
        import joblib
        data = joblib.load(path)
        self.conditional_params = data["params"]
        self.priors = data["priors"]
        self.feature_names = data["feature_names"]
        self.is_trained = data["is_trained"]