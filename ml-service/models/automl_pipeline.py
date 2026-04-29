"""
AutoML Pipeline - Automated model selection and hyperparameter tuning.
"""

import numpy as np
import logging
import joblib
from typing import Dict, Optional
from sklearn.model_selection import RandomizedSearchCV, cross_val_score
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    AdaBoostClassifier,
    ExtraTreesClassifier,
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, f1_score
from scipy.stats import randint, uniform

logger = logging.getLogger(__name__)


class AutoMLPipeline:
    """
    Automated ML pipeline that searches over multiple model families
    and hyperparameter configurations to find the best predictor.
    """

    def __init__(self):
        self.best_model = None
        self.best_model_name = None
        self.best_score = 0.0
        self.search_results = []
        self.is_trained = False
        self.feature_names = []

    def _get_search_space(self) -> Dict:
        """Define model families and their hyperparameter search spaces."""
        return {
            "GradientBoosting": {
                "model": GradientBoostingClassifier(random_state=42),
                "params": {
                    "n_estimators": randint(100, 600),
                    "learning_rate": uniform(0.01, 0.2),
                    "max_depth": randint(3, 12),
                    "min_samples_split": randint(2, 20),
                    "min_samples_leaf": randint(1, 10),
                    "subsample": uniform(0.6, 0.4),
                    "max_features": ["sqrt", "log2", None],
                },
            },
            "RandomForest": {
                "model": RandomForestClassifier(random_state=42, n_jobs=-1),
                "params": {
                    "n_estimators": randint(100, 600),
                    "max_depth": randint(5, 25),
                    "min_samples_split": randint(2, 15),
                    "min_samples_leaf": randint(1, 8),
                    "max_features": ["sqrt", "log2"],
                },
            },
            "ExtraTrees": {
                "model": ExtraTreesClassifier(random_state=42, n_jobs=-1),
                "params": {
                    "n_estimators": randint(100, 600),
                    "max_depth": randint(5, 25),
                    "min_samples_split": randint(2, 15),
                    "min_samples_leaf": randint(1, 8),
                },
            },
            "AdaBoost": {
                "model": AdaBoostClassifier(random_state=42),
                "params": {
                    "n_estimators": randint(50, 400),
                    "learning_rate": uniform(0.01, 1.5),
                },
            },
            "KNN": {
                "model": KNeighborsClassifier(),
                "params": {
                    "n_neighbors": randint(3, 25),
                    "weights": ["uniform", "distance"],
                    "metric": ["euclidean", "manhattan", "minkowski"],
                    "p": randint(1, 5),
                },
            },
        }

    def train(self, X, y, feature_names, n_iter: int = 20, cv: int = 3):
        """Run AutoML search across all model families."""
        self.feature_names = feature_names
        search_space = self._get_search_space()

        logger.info(f"🤖 Starting AutoML search across {len(search_space)} model families...")

        results = []

        for name, config in search_space.items():
            logger.info(f"  Searching {name}...")
            try:
                search = RandomizedSearchCV(
                    config["model"],
                    config["params"],
                    n_iter=n_iter,
                    cv=cv,
                    scoring="accuracy",
                    random_state=42,
                    n_jobs=-1,
                    verbose=0,
                )
                search.fit(X, y)

                result = {
                    "name": name,
                    "best_score": float(search.best_score_),
                    "best_params": {k: (int(v) if isinstance(v, (np.integer,)) else
                                        float(v) if isinstance(v, (np.floating,)) else v)
                                   for k, v in search.best_params_.items()},
                    "model": search.best_estimator_,
                }
                results.append(result)
                logger.info(f"  {name}: accuracy={search.best_score_:.4f}")

            except Exception as e:
                logger.warning(f"  {name} failed: {e}")

        if not results:
            raise RuntimeError("All AutoML models failed to train")

        # Pick the best
        results.sort(key=lambda x: x["best_score"], reverse=True)
        self.search_results = [
            {"name": r["name"], "score": r["best_score"], "params": r["best_params"]}
            for r in results
        ]

        best = results[0]
        self.best_model = best["model"]
        self.best_model_name = best["name"]
        self.best_score = best["best_score"]
        self.is_trained = True

        logger.info(f"🏆 AutoML best model: {self.best_model_name} "
                     f"(accuracy={self.best_score:.4f})")

        return {
            "best_model": self.best_model_name,
            "best_score": self.best_score,
            "all_results": self.search_results,
        }

    def predict_proba(self, X) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("AutoML pipeline not trained")
        X = np.array(X).reshape(1, -1) if len(np.array(X).shape) == 1 else X
        if hasattr(self.best_model, "predict_proba"):
            return self.best_model.predict_proba(X)
        else:
            pred = self.best_model.predict(X)
            proba = np.zeros((X.shape[0], 4))
            for i, p in enumerate(pred):
                proba[i, int(p)] = 1.0
            return proba

    def predict(self, X) -> int:
        proba = self.predict_proba(X)
        return int(np.argmax(proba, axis=1)[0])

    def save(self, path: str):
        joblib.dump({
            "model": self.best_model,
            "model_name": self.best_model_name,
            "score": self.best_score,
            "results": self.search_results,
            "feature_names": self.feature_names,
            "is_trained": self.is_trained,
        }, path)

    def load(self, path: str):
        data = joblib.load(path)
        self.best_model = data["model"]
        self.best_model_name = data["model_name"]
        self.best_score = data["score"]
        self.search_results = data["results"]
        self.feature_names = data["feature_names"]
        self.is_trained = data["is_trained"]