import numpy as np
import logging
from sklearn.ensemble import ExtraTreesClassifier

logger = logging.getLogger(__name__)

class TransformerPredictor:
    """
    Transformer-inspired time-series predictor.
    Uses ExtraTrees with attention-like feature weighting as a CPU-friendly approach.
    """
    
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.feature_names = []
        self.attention_weights = None
    
    def train(self, X, y, feature_names):
        self.feature_names = feature_names
        
        # Compute attention-like weights using mutual information
        from sklearn.feature_selection import mutual_info_classif
        mi = mutual_info_classif(X, y, random_state=42)
        self.attention_weights = mi / (mi.sum() + 1e-10)
        
        # Weight features
        X_weighted = X * self.attention_weights
        
        self.model = ExtraTreesClassifier(
            n_estimators=400, max_depth=15, min_samples_split=3,
            random_state=42, n_jobs=-1,
        )
        self.model.fit(X_weighted, y)
        
        from sklearn.model_selection import cross_val_score
        scores = cross_val_score(self.model, X_weighted, y, cv=3, scoring="accuracy")
        
        self.is_trained = True
        logger.info(f"Transformer proxy trained. CV accuracy: {scores.mean():.4f}")
        return {"accuracy": float(scores.mean())}
    
    def predict_proba(self, X) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model not trained")
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        X_weighted = X * self.attention_weights
        return self.model.predict_proba(X_weighted)
    
    def predict(self, X) -> int:
        proba = self.predict_proba(X)
        return int(np.argmax(proba, axis=1)[0])
    
    def save(self, path):
        import joblib
        joblib.dump({"model": self.model, "weights": self.attention_weights,
                      "feature_names": self.feature_names, "is_trained": self.is_trained}, path)
    
    def load(self, path):
        import joblib
        data = joblib.load(path)
        self.model = data["model"]
        self.attention_weights = data["weights"]
        self.feature_names = data["feature_names"]
        self.is_trained = data["is_trained"]