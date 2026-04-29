"""
Model Explainability Service using SHAP and LIME.
"""

import numpy as np
import shap
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class ExplainabilityService:
    """Provides SHAP and LIME explanations for model predictions."""

    def __init__(self):
        self.shap_explainer = None

    async def explain(self, features: np.ndarray, feature_names: List[str],
                      model: Any) -> Dict:
        """Generate combined SHAP + feature importance explanation."""
        try:
            shap_result = await self.explain_shap(features, feature_names, model)
            return {
                "shap": shap_result,
                "top_factors": shap_result.get("top_features", []),
                "method": "shap_tree",
            }
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")
            return await self._fallback_explanation(features, feature_names, model)

    async def explain_shap(self, features: np.ndarray,
                           feature_names: List[str],
                           model: Any) -> Dict:
        """Generate SHAP values for prediction explanation."""
        try:
            features = np.array(features).reshape(1, -1)

            # Use the first base model (gradient boosting) for SHAP
            base_model = model.base_models[0]

            if hasattr(base_model, 'lgb_model') and base_model.lgb_model is not None:
                explainer = shap.TreeExplainer(base_model.lgb_model)
                shap_values = explainer.shap_values(features)
            else:
                return await self._fallback_explanation(features, feature_names, model)

            # shap_values is list of arrays (one per class) or a single array
            if isinstance(shap_values, list):
                # Average absolute SHAP across all classes
                shap_abs = np.abs(np.array(shap_values))
                avg_shap = np.mean(shap_abs, axis=0).flatten()
            else:
                avg_shap = np.abs(shap_values).flatten()

            # Build feature importance ranking
            feature_shap = {}
            for i, name in enumerate(feature_names):
                if i < len(avg_shap):
                    val = avg_shap[i]
                    feature_shap[name] = float(val) if np.isscalar(val) else float(val.item() if hasattr(val, 'item') else val[0])

            # Sort by importance
            sorted_features = sorted(
                feature_shap.items(), key=lambda x: x[1], reverse=True
            )

            top_features = [
                {
                    "feature": name,
                    "importance": round(val, 6),
                    "value": float(features[0][i]) if i < features.shape[1] else 0,
                    "direction": "increases_risk" if val > np.mean(list(feature_shap.values())) else "decreases_risk",
                }
                for i, (name, val) in enumerate(sorted_features[:10])
            ]

            return {
                "feature_importance": feature_shap,
                "top_features": top_features,
                "method": "shap_tree",
                "total_features": len(feature_names),
            }

        except Exception as e:
            logger.warning(f"SHAP failed: {e}")
            return await self._fallback_explanation(features, feature_names, model)

    async def explain_lime(self, features: np.ndarray,
                           feature_names: List[str],
                           model: Any) -> Dict:
        """Generate LIME explanation (perturbation-based)."""
        try:
            features = np.array(features).reshape(1, -1)
            n_features = features.shape[1]

            # Manual LIME-like perturbation analysis
            base_proba = model.predict_proba(features)[0]
            base_pred = int(np.argmax(base_proba))

            perturbation_impacts = {}
            for i, name in enumerate(feature_names):
                if i >= n_features:
                    break

                perturbed = features.copy()
                # Perturb feature by ±20%
                original_val = perturbed[0, i]
                if abs(original_val) > 1e-6:
                    perturbed[0, i] = original_val * 1.2
                else:
                    perturbed[0, i] = 1.0

                new_proba = model.predict_proba(perturbed)[0]
                impact = float(new_proba[base_pred] - base_proba[base_pred])

                perturbation_impacts[name] = {
                    "impact": round(impact, 6),
                    "original_value": float(original_val),
                    "direction": "positive" if impact > 0 else "negative",
                }

            sorted_impacts = sorted(
                perturbation_impacts.items(),
                key=lambda x: abs(x[1]["impact"]),
                reverse=True,
            )

            return {
                "impacts": dict(sorted_impacts[:15]),
                "base_prediction": base_pred,
                "base_confidence": float(base_proba[base_pred]),
                "method": "lime_perturbation",
            }

        except Exception as e:
            logger.warning(f"LIME explanation failed: {e}")
            return {"error": str(e), "method": "lime_perturbation"}

    async def _fallback_explanation(self, features: np.ndarray,
                                     feature_names: List[str],
                                     model: Any) -> Dict:
        """Fallback feature importance using model's built-in importance."""
        try:
            base_model = model.base_models[0]
            importance = base_model.get_feature_importance()

            features_flat = np.array(features).flatten()
            top_features = [
                {
                    "feature": name,
                    "importance": round(imp, 6),
                    "value": float(features_flat[i]) if i < len(features_flat) else 0,
                    "direction": "contributing_factor",
                }
                for i, (name, imp) in enumerate(
                    sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]
                )
            ]

            return {
                "feature_importance": importance,
                "top_features": top_features,
                "method": "model_builtin",
            }
        except Exception as e:
            return {
                "error": str(e),
                "method": "fallback",
                "top_features": [],
            }