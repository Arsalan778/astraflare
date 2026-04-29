"""
Data preprocessing pipeline for wildfire feature data.
Handles cleaning, normalization, encoding, and transformation.
"""

import numpy as np
import pandas as pd
import logging
import joblib
import os
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import StandardScaler, RobustScaler, LabelEncoder
from sklearn.impute import KNNImputer
from sklearn.feature_selection import SelectKBest, mutual_info_classif

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """Full preprocessing pipeline for wildfire prediction features."""

    def __init__(self):
        self.scaler = RobustScaler()
        self.imputer = KNNImputer(n_neighbors=5)
        self.feature_selector = None
        self.selected_features = None
        self.is_fitted = False
        self.feature_stats = {}
        self.outlier_bounds = {}

    def fit(self, df: pd.DataFrame, target_col: str = "risk_label",
            select_k_best: Optional[int] = None) -> "DataPreprocessor":
        """Fit the preprocessing pipeline on training data."""
        logger.info("Fitting preprocessing pipeline...")

        feature_cols = [c for c in df.columns if c != target_col]

        # Compute feature statistics for monitoring drift
        for col in feature_cols:
            if df[col].dtype in [np.float64, np.int64, float, int]:
                self.feature_stats[col] = {
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "median": float(df[col].median()),
                    "q1": float(df[col].quantile(0.25)),
                    "q3": float(df[col].quantile(0.75)),
                }
                iqr = self.feature_stats[col]["q3"] - self.feature_stats[col]["q1"]
                self.outlier_bounds[col] = {
                    "lower": self.feature_stats[col]["q1"] - 3 * iqr,
                    "upper": self.feature_stats[col]["q3"] + 3 * iqr,
                }

        X = df[feature_cols].values.astype(np.float64)
        y = df[target_col].values

        # Fit imputer
        self.imputer.fit(X)
        X_imputed = self.imputer.transform(X)

        # Fit scaler
        self.scaler.fit(X_imputed)

        # Feature selection
        if select_k_best and select_k_best < len(feature_cols):
            self.feature_selector = SelectKBest(
                mutual_info_classif, k=select_k_best
            )
            self.feature_selector.fit(X_imputed, y)
            mask = self.feature_selector.get_support()
            self.selected_features = [
                feature_cols[i] for i in range(len(feature_cols)) if mask[i]
            ]
            logger.info(f"Selected {len(self.selected_features)} features: "
                        f"{self.selected_features}")
        else:
            self.selected_features = feature_cols

        self.is_fitted = True
        logger.info("Preprocessing pipeline fitted successfully")
        return self

    def transform(self, df: pd.DataFrame,
                  target_col: Optional[str] = "risk_label") -> Tuple[np.ndarray, Optional[np.ndarray], List[str]]:
        """Transform data using the fitted pipeline."""
        if not self.is_fitted:
            raise ValueError("Preprocessor not fitted. Call fit() first.")

        feature_cols = [c for c in df.columns if c != target_col]

        X = df[feature_cols].values.astype(np.float64)

        # Handle missing values
        X = self.imputer.transform(X)

        # Clip outliers
        for i, col in enumerate(feature_cols):
            if col in self.outlier_bounds:
                bounds = self.outlier_bounds[col]
                X[:, i] = np.clip(X[:, i], bounds["lower"], bounds["upper"])

        # Scale
        X_scaled = self.scaler.transform(X)

        # Feature selection
        if self.feature_selector is not None:
            X_scaled = self.feature_selector.transform(X_scaled)
            out_features = self.selected_features
        else:
            out_features = feature_cols

        y = None
        if target_col and target_col in df.columns:
            y = df[target_col].values

        return X_scaled, y, out_features

    def fit_transform(self, df: pd.DataFrame,
                      target_col: str = "risk_label",
                      select_k_best: Optional[int] = None) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Fit and transform in one step."""
        self.fit(df, target_col, select_k_best)
        return self.transform(df, target_col)

    def transform_single(self, features: Dict) -> Tuple[np.ndarray, List[str]]:
        """Transform a single sample (dict of feature values) for prediction."""
        if not self.is_fitted:
            raise ValueError("Preprocessor not fitted")

        if self.selected_features:
            feature_names = self.selected_features
        else:
            feature_names = list(self.feature_stats.keys())

        values = []
        for name in feature_names:
            val = features.get(name, self.feature_stats.get(name, {}).get("median", 0))
            values.append(float(val))

        X = np.array(values).reshape(1, -1)

        # Clip outliers
        for i, col in enumerate(feature_names):
            if col in self.outlier_bounds:
                bounds = self.outlier_bounds[col]
                X[0, i] = np.clip(X[0, i], bounds["lower"], bounds["upper"])

        # Scale (we need to map selected features back to full feature space for scaler)
        # For simplicity, we apply a standalone scaling here
        for i, col in enumerate(feature_names):
            if col in self.feature_stats:
                stats = self.feature_stats[col]
                iqr = stats["q3"] - stats["q1"]
                if iqr > 0:
                    X[0, i] = (X[0, i] - stats["median"]) / iqr

        return X, feature_names

    def detect_drift(self, new_data: pd.DataFrame, threshold: float = 2.0) -> Dict:
        """Detect data distribution drift compared to training stats."""
        drift_report = {}
        for col in new_data.columns:
            if col in self.feature_stats:
                stats = self.feature_stats[col]
                new_mean = float(new_data[col].mean())
                new_std = float(new_data[col].std())

                z_score = abs(new_mean - stats["mean"]) / max(stats["std"], 1e-10)
                drifted = z_score > threshold

                drift_report[col] = {
                    "training_mean": stats["mean"],
                    "current_mean": new_mean,
                    "z_score": float(z_score),
                    "drifted": drifted,
                }
        return drift_report

    def save(self, path: str):
        """Save the preprocessor to disk."""
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
        joblib.dump({
            "scaler": self.scaler,
            "imputer": self.imputer,
            "feature_selector": self.feature_selector,
            "selected_features": self.selected_features,
            "feature_stats": self.feature_stats,
            "outlier_bounds": self.outlier_bounds,
            "is_fitted": self.is_fitted,
        }, path)
        logger.info(f"Preprocessor saved to {path}")

    def load(self, path: str):
        """Load preprocessor from disk."""
        data = joblib.load(path)
        self.scaler = data["scaler"]
        self.imputer = data["imputer"]
        self.feature_selector = data["feature_selector"]
        self.selected_features = data["selected_features"]
        self.feature_stats = data["feature_stats"]
        self.outlier_bounds = data["outlier_bounds"]
        self.is_fitted = data["is_fitted"]
        logger.info(f"Preprocessor loaded from {path}")