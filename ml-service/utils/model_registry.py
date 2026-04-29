import os
import json
import joblib
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ModelRegistry:
    """Tracks all trained models, their metrics, and versions."""
    
    def __init__(self, model_dir: str = "./saved_models"):
        self.model_dir = model_dir
        self.registry_path = os.path.join(model_dir, "registry.json")
        self.registry = self._load_registry()
    
    def _load_registry(self) -> Dict:
        if os.path.exists(self.registry_path):
            with open(self.registry_path, "r") as f:
                return json.load(f)
        return {"models": {}, "active_ensemble": None}
    
    def _save_registry(self):
        os.makedirs(self.model_dir, exist_ok=True)
        with open(self.registry_path, "w") as f:
            json.dump(self.registry, f, indent=2, default=str)
    
    def register_model(self, name: str, version: str, metrics: Dict, path: str):
        if name not in self.registry["models"]:
            self.registry["models"][name] = []
        self.registry["models"][name].append({
            "version": version,
            "metrics": metrics,
            "path": path,
            "trained_at": datetime.utcnow().isoformat(),
            "active": True,
        })
        self._save_registry()
        logger.info(f"Registered model: {name} v{version}")
    
    def save_model(self, model: Any, name: str, version: str, metrics: Dict):
        os.makedirs(self.model_dir, exist_ok=True)
        filename = f"{name}_v{version}.joblib"
        path = os.path.join(self.model_dir, filename)
        joblib.dump(model, path)
        self.register_model(name, version, metrics, path)
        return path
    
    def load_model(self, name: str, version: Optional[str] = None) -> Any:
        if name not in self.registry["models"]:
            raise FileNotFoundError(f"No model registered with name: {name}")
        entries = self.registry["models"][name]
        if version:
            entry = next((e for e in entries if e["version"] == version), None)
        else:
            entry = entries[-1]  # Latest
        if not entry:
            raise FileNotFoundError(f"Model version not found: {name} v{version}")
        return joblib.load(entry["path"])
    
    def get_status(self) -> Dict:
        status = {}
        for name, entries in self.registry["models"].items():
            latest = entries[-1] if entries else None
            status[name] = {
                "versions": len(entries),
                "latest_version": latest["version"] if latest else None,
                "latest_metrics": latest["metrics"] if latest else None,
                "trained_at": latest["trained_at"] if latest else None,
            }
        return status