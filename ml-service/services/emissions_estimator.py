"""
Environmental Impact & Emissions Estimator.
Predicts CO2 emissions, particulate matter, and forest loss from wildfires.
"""

import numpy as np
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class EmissionsEstimator:
    """
    Estimates environmental impact of potential or active wildfires.
    Based on published emission factors from wildfire research literature.
    """

    # Emission factors (tonnes per km² of burned area)
    EMISSION_FACTORS = {
        "forest": {
            "co2_tonnes_per_km2": 1800,
            "co_tonnes_per_km2": 90,
            "pm25_tonnes_per_km2": 15,
            "pm10_tonnes_per_km2": 20,
            "nox_tonnes_per_km2": 3.5,
            "ch4_tonnes_per_km2": 5.0,
            "biomass_tonnes_per_km2": 12000,
        },
        "grassland": {
            "co2_tonnes_per_km2": 400,
            "co_tonnes_per_km2": 20,
            "pm25_tonnes_per_km2": 5,
            "pm10_tonnes_per_km2": 7,
            "nox_tonnes_per_km2": 1.0,
            "ch4_tonnes_per_km2": 1.5,
            "biomass_tonnes_per_km2": 3000,
        },
        "shrubland": {
            "co2_tonnes_per_km2": 900,
            "co_tonnes_per_km2": 45,
            "pm25_tonnes_per_km2": 8,
            "pm10_tonnes_per_km2": 12,
            "nox_tonnes_per_km2": 2.0,
            "ch4_tonnes_per_km2": 3.0,
            "biomass_tonnes_per_km2": 6000,
        },
    }

    # Carbon sequestration recovery time (years)
    RECOVERY_YEARS = {"forest": 50, "grassland": 5, "shrubland": 15}

    async def estimate(
        self,
        latitude: float,
        longitude: float,
        risk_score: float,
        area_km2: float,
    ) -> Dict:
        """Estimate environmental impact for a potential wildfire."""

        # Determine vegetation type by latitude
        veg_type = self._infer_vegetation_type(latitude, longitude)

        # Adjust burned area by risk probability
        estimated_burned_area = area_km2 * risk_score * 0.3  # 30% of area at max risk

        factors = self.EMISSION_FACTORS.get(veg_type, self.EMISSION_FACTORS["shrubland"])

        # Calculate emissions
        emissions = {}
        for pollutant, factor in factors.items():
            if pollutant.endswith("_per_km2"):
                name = pollutant.replace("_tonnes_per_km2", "").replace("_per_km2", "")
                emissions[name] = round(factor * estimated_burned_area, 2)

        # Carbon impact
        co2_tonnes = emissions.get("co2", 0)
        carbon_tonnes = co2_tonnes / 3.67  # CO2 to C conversion

        # Trees equivalent (1 mature tree sequesters ~22 kg CO2/year)
        trees_equivalent = int(co2_tonnes * 1000 / 22)

        # Recovery estimate
        recovery_years = self.RECOVERY_YEARS.get(veg_type, 20)

        # Air quality impact radius
        pm25 = emissions.get("pm25", 0)
        air_quality_radius_km = min(pm25 * 2, 500)  # Rough estimate

        # Economic damage estimate (USD per km² based on land type)
        damage_per_km2 = {"forest": 500000, "grassland": 50000, "shrubland": 150000}
        economic_damage = estimated_burned_area * damage_per_km2.get(veg_type, 100000)

        return {
            "vegetation_type": veg_type,
            "estimated_burned_area_km2": round(estimated_burned_area, 2),
            "risk_score_used": round(risk_score, 4),
            "emissions": {
                "co2_tonnes": emissions.get("co2", 0),
                "co_tonnes": emissions.get("co", 0),
                "pm25_tonnes": emissions.get("pm25", 0),
                "pm10_tonnes": emissions.get("pm10", 0),
                "nox_tonnes": emissions.get("nox", 0),
                "methane_tonnes": emissions.get("ch4", 0),
            },
            "carbon_impact": {
                "carbon_released_tonnes": round(carbon_tonnes, 2),
                "trees_equivalent_destroyed": trees_equivalent,
                "recovery_time_years": recovery_years,
            },
            "air_quality": {
                "pm25_estimated_tonnes": emissions.get("pm25", 0),
                "affected_radius_km": round(air_quality_radius_km, 1),
                "health_advisory": self._health_advisory(emissions.get("pm25", 0)),
            },
            "economic_impact": {
                "estimated_damage_usd": round(economic_damage, 0),
                "damage_category": self._damage_category(economic_damage),
            },
            "biodiversity": {
                "habitat_loss_km2": round(estimated_burned_area * 0.7, 2),
                "species_affected_estimate": self._species_estimate(
                    estimated_burned_area, veg_type
                ),
            },
        }

    def _infer_vegetation_type(self, lat: float, lon: float) -> str:
        """Infer vegetation type from geographic location."""
        abs_lat = abs(lat)
        if abs_lat < 15:
            return "forest"  # Tropical
        elif abs_lat < 30:
            return "shrubland"
        elif abs_lat < 50:
            return "forest"  # Temperate
        elif abs_lat < 65:
            return "forest"  # Boreal
        else:
            return "grassland"  # Tundra/sparse

    def _health_advisory(self, pm25_tonnes: float) -> str:
        if pm25_tonnes > 50:
            return "HAZARDOUS - Stay indoors, use air purifiers"
        elif pm25_tonnes > 20:
            return "VERY_UNHEALTHY - Avoid outdoor activities"
        elif pm25_tonnes > 10:
            return "UNHEALTHY - Sensitive groups should limit exposure"
        elif pm25_tonnes > 5:
            return "MODERATE - Generally acceptable"
        else:
            return "GOOD - Minimal health impact expected"

    def _damage_category(self, damage_usd: float) -> str:
        if damage_usd > 100_000_000:
            return "CATASTROPHIC"
        elif damage_usd > 10_000_000:
            return "SEVERE"
        elif damage_usd > 1_000_000:
            return "SIGNIFICANT"
        elif damage_usd > 100_000:
            return "MODERATE"
        else:
            return "MINOR"

    def _species_estimate(self, area: float, veg_type: str) -> int:
        species_density = {"forest": 150, "shrubland": 60, "grassland": 30}
        density = species_density.get(veg_type, 50)
        return int(area * density * 0.1)