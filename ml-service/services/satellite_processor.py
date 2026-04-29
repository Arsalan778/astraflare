"""
Satellite Image Processor.
Detects fire-prone regions from satellite data indices.
"""

import numpy as np
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class SatelliteProcessor:
    """Processes satellite data to identify fire-prone areas."""

    # Thresholds for fire detection from satellite indices
    FIRE_BRIGHTNESS_THRESHOLD = 330  # Kelvin
    HIGH_LST_THRESHOLD = 40  # Celsius
    LOW_NDVI_THRESHOLD = 0.2
    LOW_MOISTURE_THRESHOLD = 0.15

    async def analyze_region(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 50,
        active_fires: List[Dict] = None,
    ) -> Dict:
        """Analyze satellite data for a region and classify fire proneness."""

        analysis = {
            "center": {"latitude": latitude, "longitude": longitude},
            "radius_km": radius_km,
            "fire_detections": [],
            "hotspots": [],
            "vegetation_stress": {},
            "thermal_anomalies": [],
            "overall_assessment": "",
        }

        # Analyze active fires
        if active_fires:
            for fire in active_fires:
                detection = {
                    "latitude": fire.get("latitude"),
                    "longitude": fire.get("longitude"),
                    "brightness": fire.get("brightness", 0),
                    "confidence": fire.get("confidence", 0),
                    "frp": fire.get("frp", 0),
                    "is_thermal_anomaly": fire.get("brightness", 0) > self.FIRE_BRIGHTNESS_THRESHOLD,
                }
                analysis["fire_detections"].append(detection)

                if fire.get("brightness", 0) > self.FIRE_BRIGHTNESS_THRESHOLD:
                    analysis["thermal_anomalies"].append(detection)

            analysis["hotspots"] = self._identify_clusters(active_fires)

        # Vegetation stress analysis (synthetic based on location)
        ndvi_estimate = self._estimate_regional_ndvi(latitude, longitude)
        analysis["vegetation_stress"] = {
            "average_ndvi": round(ndvi_estimate, 3),
            "stressed": ndvi_estimate < self.LOW_NDVI_THRESHOLD,
            "category": self._ndvi_category(ndvi_estimate),
        }

        # Overall assessment
        fire_count = len(analysis["fire_detections"])
        anomaly_count = len(analysis["thermal_anomalies"])
        veg_stressed = analysis["vegetation_stress"]["stressed"]

        if anomaly_count > 5 or (fire_count > 10 and veg_stressed):
            analysis["overall_assessment"] = "CRITICAL"
        elif anomaly_count > 2 or fire_count > 5:
            analysis["overall_assessment"] = "HIGH_RISK"
        elif fire_count > 0 or veg_stressed:
            analysis["overall_assessment"] = "MODERATE_RISK"
        else:
            analysis["overall_assessment"] = "LOW_RISK"

        analysis["summary"] = (
            f"Detected {fire_count} fire events, {anomaly_count} thermal anomalies. "
            f"Vegetation NDVI={ndvi_estimate:.2f} ({analysis['vegetation_stress']['category']}). "
            f"Assessment: {analysis['overall_assessment']}"
        )

        return analysis

    def _identify_clusters(self, fires: List[Dict], min_dist_km: float = 10) -> List[Dict]:
        """Simple clustering of fire detections into hotspot groups."""
        if not fires:
            return []

        clusters = []
        assigned = set()

        for i, fire in enumerate(fires):
            if i in assigned:
                continue

            cluster = [fire]
            assigned.add(i)

            for j, other in enumerate(fires):
                if j in assigned:
                    continue
                dist = self._quick_distance(
                    fire["latitude"], fire["longitude"],
                    other["latitude"], other["longitude"],
                )
                if dist < min_dist_km:
                    cluster.append(other)
                    assigned.add(j)

            if len(cluster) >= 2:
                avg_lat = np.mean([f["latitude"] for f in cluster])
                avg_lon = np.mean([f["longitude"] for f in cluster])
                avg_frp = np.mean([f.get("frp", 0) for f in cluster])
                clusters.append({
                    "center_lat": round(float(avg_lat), 4),
                    "center_lon": round(float(avg_lon), 4),
                    "fire_count": len(cluster),
                    "average_frp": round(float(avg_frp), 2),
                    "severity": "high" if len(cluster) > 5 else "moderate",
                })

        return clusters

    def _estimate_regional_ndvi(self, lat: float, lon: float) -> float:
        """Estimate regional NDVI based on geographic zone."""
        abs_lat = abs(lat)
        if abs_lat < 10:
            return float(np.random.beta(8, 2))
        elif abs_lat < 25:
            return float(np.random.beta(5, 4))
        elif abs_lat < 45:
            return float(np.random.beta(6, 4))
        elif abs_lat < 60:
            return float(np.random.beta(5, 5))
        else:
            return float(np.random.beta(2, 7))

    def _ndvi_category(self, ndvi: float) -> str:
        if ndvi < 0.1:
            return "barren"
        elif ndvi < 0.2:
            return "sparse_vegetation"
        elif ndvi < 0.4:
            return "moderate_vegetation"
        elif ndvi < 0.6:
            return "dense_vegetation"
        else:
            return "very_dense_vegetation"

    def _quick_distance(self, lat1, lon1, lat2, lon2) -> float:
        """Fast approximate distance in km."""
        import math
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
        return math.sqrt(dlat**2 + dlon**2) * 6371