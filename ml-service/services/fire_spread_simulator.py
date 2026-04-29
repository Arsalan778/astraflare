"""
Fire Spread Simulation Engine.
Uses a cellular automaton approach with wind, slope, and vegetation factors.
"""

import numpy as np
import math
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class FireSpreadSimulator:
    """
    Simulates wildfire spread using a grid-based cellular automaton.
    Accounts for wind direction/speed, terrain slope, vegetation type, and humidity.
    """

    CELL_SIZE_KM = 0.5  # Each cell represents 0.5 km
    STATES = {"unburned": 0, "burning": 1, "burned": 2, "firebreak": 3}

    def __init__(self, grid_size: int = 100):
        self.grid_size = grid_size

    async def simulate(
        self,
        latitude: float,
        longitude: float,
        fire_intensity: float = 0.7,
        hours: int = 48,
        wind_speed: float = 20.0,
        wind_direction: float = 180.0,
        terrain_type: str = "mixed",
    ) -> Dict:
        """
        Run fire spread simulation and return time-series of spread polygons.
        """
        logger.info(
            f"Simulating fire spread at ({latitude}, {longitude}) "
            f"for {hours}h, wind={wind_speed}km/h@{wind_direction}°"
        )

        # Initialize grid
        grid = np.zeros((self.grid_size, self.grid_size), dtype=int)
        center = self.grid_size // 2

        # Ignition point
        grid[center, center] = self.STATES["burning"]

        # Generate terrain and vegetation maps
        vegetation = self._generate_vegetation_map(terrain_type)
        slope_map = self._generate_slope_map()
        moisture_map = self._generate_moisture_map()

        # Wind vector
        wind_rad = math.radians(wind_direction)
        wind_dx = math.sin(wind_rad) * wind_speed / 40.0
        wind_dy = -math.cos(wind_rad) * wind_speed / 40.0

        # Simulation loop
        snapshots = []
        time_step_minutes = 30
        steps = (hours * 60) // time_step_minutes

        for step in range(steps):
            hour = (step * time_step_minutes) / 60.0

            new_grid = grid.copy()
            burning_cells = np.argwhere(grid == self.STATES["burning"])

            for cell in burning_cells:
                r, c = cell

                # After burning for ~2 hours, cell becomes burned out
                new_grid[r, c] = self.STATES["burned"]

                # Spread to 8 neighbours
                for dr in [-1, 0, 1]:
                    for dc in [-1, 0, 1]:
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if (
                            0 <= nr < self.grid_size
                            and 0 <= nc < self.grid_size
                            and grid[nr, nc] == self.STATES["unburned"]
                        ):
                            spread_prob = self._calculate_spread_probability(
                                dr, dc, fire_intensity,
                                wind_dx, wind_dy,
                                vegetation[nr, nc],
                                slope_map[nr, nc],
                                moisture_map[nr, nc],
                            )
                            if np.random.random() < spread_prob:
                                new_grid[nr, nc] = self.STATES["burning"]

            grid = new_grid

            # Save snapshot every hour
            if step % (60 // time_step_minutes) == 0:
                burned_cells = np.argwhere(
                    (grid == self.STATES["burning"]) | (grid == self.STATES["burned"])
                )
                snapshot = self._cells_to_geo_polygons(
                    burned_cells, latitude, longitude, center
                )
                snapshots.append({
                    "hour": round(hour, 1),
                    "burned_area_km2": round(
                        len(burned_cells) * self.CELL_SIZE_KM**2, 2
                    ),
                    "active_fire_cells": int(
                        np.sum(grid == self.STATES["burning"])
                    ),
                    "total_burned_cells": int(
                        np.sum(grid == self.STATES["burned"])
                    ),
                    "perimeter_points": snapshot,
                })

            # Stop if fire is fully extinguished
            if np.sum(grid == self.STATES["burning"]) == 0:
                break

        total_burned = np.sum(
            (grid == self.STATES["burning"]) | (grid == self.STATES["burned"])
        )

        return {
            "snapshots": snapshots,
            "total_burned_area_km2": round(
                total_burned * self.CELL_SIZE_KM**2, 2
            ),
            "simulation_hours": hours,
            "wind_speed_kmh": wind_speed,
            "wind_direction_deg": wind_direction,
            "fire_intensity": fire_intensity,
            "center": {"latitude": latitude, "longitude": longitude},
            "grid_resolution_km": self.CELL_SIZE_KM,
        }

    def _calculate_spread_probability(
        self,
        dr: int, dc: int,
        intensity: float,
        wind_dx: float, wind_dy: float,
        vegetation: float,
        slope: float,
        moisture: float,
    ) -> float:
        """Calculate probability of fire spreading to a neighbor cell."""
        base_prob = 0.15 * intensity

        # Wind effect: fire spreads faster downwind
        direction_dot = (dc * wind_dx + dr * wind_dy)
        wind_factor = 1.0 + max(0, direction_dot) * 1.5

        # Vegetation: denser vegetation burns more easily
        veg_factor = 0.5 + vegetation * 1.0

        # Slope: fire goes uphill faster
        slope_factor = 1.0 + max(0, slope) * 0.3

        # Moisture: high moisture inhibits spread
        moisture_factor = max(0.1, 1.0 - moisture * 0.8)

        # Diagonal spread is slower
        diagonal_factor = 0.7 if (dr != 0 and dc != 0) else 1.0

        prob = (
            base_prob
            * wind_factor
            * veg_factor
            * slope_factor
            * moisture_factor
            * diagonal_factor
        )
        return min(max(prob, 0), 0.95)

    def _generate_vegetation_map(self, terrain_type: str) -> np.ndarray:
        """Generate a synthetic vegetation density map."""
        np.random.seed(None)
        if terrain_type == "forest":
            base = np.random.beta(7, 3, (self.grid_size, self.grid_size))
        elif terrain_type == "grassland":
            base = np.random.beta(5, 5, (self.grid_size, self.grid_size))
        elif terrain_type == "desert":
            base = np.random.beta(2, 8, (self.grid_size, self.grid_size))
        else:  # mixed
            base = np.random.beta(5, 4, (self.grid_size, self.grid_size))

        # Add spatial correlation (smoothing)
        from scipy.ndimage import gaussian_filter
        return gaussian_filter(base, sigma=3)

    def _generate_slope_map(self) -> np.ndarray:
        """Generate synthetic terrain slope map."""
        from scipy.ndimage import gaussian_filter
        elevation = np.random.randn(self.grid_size, self.grid_size) * 100
        elevation = gaussian_filter(elevation, sigma=5)
        gy, gx = np.gradient(elevation)
        slope = np.sqrt(gx**2 + gy**2)
        return slope / (slope.max() + 1e-10)

    def _generate_moisture_map(self) -> np.ndarray:
        """Generate synthetic moisture map."""
        from scipy.ndimage import gaussian_filter
        base = np.random.beta(3, 5, (self.grid_size, self.grid_size))
        return gaussian_filter(base, sigma=4)

    def _cells_to_geo_polygons(
        self,
        cells: np.ndarray,
        center_lat: float,
        center_lon: float,
        center_cell: int,
    ) -> List[Dict]:
        """Convert grid cells to geographic coordinates."""
        if len(cells) == 0:
            return []

        deg_per_cell_lat = self.CELL_SIZE_KM / 111.0
        deg_per_cell_lon = self.CELL_SIZE_KM / (
            111.0 * math.cos(math.radians(center_lat))
        )

        points = []
        # Sample boundary points for efficiency
        if len(cells) > 200:
            indices = np.random.choice(len(cells), 200, replace=False)
            cells = cells[indices]

        for r, c in cells:
            lat = center_lat + (r - center_cell) * deg_per_cell_lat
            lon = center_lon + (c - center_cell) * deg_per_cell_lon
            points.append({"lat": round(lat, 5), "lon": round(lon, 5)})

        return points