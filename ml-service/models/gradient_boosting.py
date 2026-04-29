import numpy as np
import logging
import joblib
from typing import Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import lightgbm as lgb
from catboost import CatBoostClassifier
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)

class GradientBoostingPredictor:
    """Ensemble of LightGBM, CatBoost, and XGBoost."""
    
    def __init__(self):
        self.lgb_model = None
        self.catboost_model = None
        self.xgb_model = None
        self.is_trained = False
        self.feature_names = []
        self.weights = {"lgb": 0.4, "catboost": 0.35, "xgb": 0.25}
    
    def train(self, X, y, feature_names):
        self.feature_names = feature_names
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # LightGBM
        logger.info("Training LightGBM...")
        self.lgb_model = lgb.LGBMClassifier(
            objective="multiclass", num_class=4, n_estimators=500,
            learning_rate=0.05, max_depth=8, num_leaves=63,
            feature_fraction=0.8, bagging_fraction=0.8, bagging_freq=5,
            verbose=-1, random_state=42,
        )
        self.lgb_model.fit(X_train, y_train, eval_set=[(X_val, y_val)])
        lgb_acc = accuracy_score(y_val, self.lgb_model.predict(X_val))
        logger.info(f"LightGBM accuracy: {lgb_acc:.4f}")
        
        # CatBoost
        logger.info("Training CatBoost...")
        self.catboost_model = CatBoostClassifier(
            iterations=500, learning_rate=0.05, depth=8,
            loss_function="MultiClass", verbose=0, random_seed=42,
        )
        self.catboost_model.fit(X_train, y_train, eval_set=(X_val, y_val))
        cb_acc = accuracy_score(y_val, self.catboost_model.predict(X_val).flatten())
        logger.info(f"CatBoost accuracy: {cb_acc:.4f}")
        
        # XGBoost
        logger.info("Training XGBoost...")
        self.xgb_model = XGBClassifier(
            objective="multi:softprob", num_class=4, n_estimators=500,
            learning_rate=0.05, max_depth=8, random_state=42,
            eval_metric="mlogloss", verbosity=0,
        )
        self.xgb_model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        xgb_acc = accuracy_score(y_val, self.xgb_model.predict(X_val))
        logger.info(f"XGBoost accuracy: {xgb_acc:.4f}")
        
        self.is_trained = True
        
        # Update weights based on performance
        total = lgb_acc + cb_acc + xgb_acc
        self.weights = {"lgb": lgb_acc/total, "catboost": cb_acc/total, "xgb": xgb_acc/total}
        
        return {
            "lgb_accuracy": lgb_acc,
            "catboost_accuracy": cb_acc,
            "xgb_accuracy": xgb_acc,
            "weights": self.weights,
        }
    
    def predict_proba(self, X) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Models not trained")
        
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        
        lgb_proba = self.lgb_model.predict_proba(X)
        cb_proba = self.catboost_model.predict_proba(X)
        xgb_proba = self.xgb_model.predict_proba(X)
        
        ensemble_proba = (
            self.weights["lgb"] * lgb_proba
            + self.weights["catboost"] * cb_proba
            + self.weights["xgb"] * xgb_proba
        )
        
        return ensemble_proba
    
    def predict(self, X) -> int:
        proba = self.predict_proba(X)
        return int(np.argmax(proba, axis=1)[0])
    
    def get_feature_importance(self) -> Dict:
        if not self.is_trained:
            return {}
        importance = {}
        lgb_imp = self.lgb_model.feature_importances_
        for i, name in enumerate(self.feature_names):
            importance[name] = float(lgb_imp[i]) if i < len(lgb_imp) else 0.0
        total = sum(importance.values())
        if total > 0:
            importance = {k: v/total for k, v in importance.items()}
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    
    def save(self, path: str):
        joblib.dump({
            "lgb": self.lgb_model, "catboost": self.catboost_model,
            "xgb": self.xgb_model, "weights": self.weights,
            "feature_names": self.feature_names, "is_trained": self.is_trained,
        }, path)
    
    def load(self, path: str):
        data = joblib.load(path)
        self.lgb_model = data["lgb"]
        self.catboost_model = data["catboost"]
        self.xgb_model = data["xgb"]
        self.weights = data["weights"]
        self.feature_names = data["feature_names"]
        self.is_trained = data["is_trained"]