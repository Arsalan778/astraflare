/**
 * Server-side pre-processing helpers that supplement the ML service.
 * These run before sending data to the Python ML service, or for
 * quick inline calculations in the Node layer.
 */

// ── Fire Weather Index ──────────────────────────────────────────

export function calculateFireWeatherIndex(temp, humidity, windSpeed, precipitation) {
  // Simplified FWI-like score (0–100)
  const tempFactor = Math.min(temp / 45, 1) * 30;
  const humidityFactor = Math.max(0, (100 - humidity) / 100) * 25;
  const windFactor = Math.min(windSpeed / 60, 1) * 25;
  const precipFactor = Math.max(0, 1 - precipitation / 20) * 20;

  return Math.round(tempFactor + humidityFactor + windFactor + precipFactor);
}

// ── Drought Index ───────────────────────────────────────────────

export function calculateDroughtIndex(precipLast30d, avgPrecip30d) {
  if (avgPrecip30d === 0) return 1;
  const ratio = precipLast30d / avgPrecip30d;
  return Math.max(0, Math.min(1, 1 - ratio));
}

// ── Feature Normalisation ───────────────────────────────────────

export function normalizeFeatures(features, ranges) {
  const normalised = {};
  for (const [key, value] of Object.entries(features)) {
    if (ranges[key]) {
      const { min, max } = ranges[key];
      normalised[key] = max !== min ? (value - min) / (max - min) : 0;
    } else {
      normalised[key] = value;
    }
  }
  return normalised;
}

// ── Vegetation Stress ───────────────────────────────────────────

export function deriveVegetationStress(ndvi, soilMoisture) {
  // Low NDVI + low moisture → high stress
  const ndviStress = 1 - Math.max(0, Math.min(1, ndvi));
  const moistureStress = 1 - Math.max(0, Math.min(1, soilMoisture));
  return (ndviStress * 0.6 + moistureStress * 0.4);
}

// ── Fuel Moisture Content ───────────────────────────────────────

export function estimateFuelMoisture(temperature, humidity, recentPrecip, daysSinceRain) {
  // Simplified dead-fuel moisture estimation
  const tempEffect = Math.max(0, 1 - temperature / 50) * 0.3;
  const humidityEffect = (humidity / 100) * 0.35;
  const precipEffect = Math.min(recentPrecip / 25, 1) * 0.2;
  const dryingEffect = Math.max(0, 1 - daysSinceRain / 14) * 0.15;

  const moisture = tempEffect + humidityEffect + precipEffect + dryingEffect;
  return Math.max(0, Math.min(1, moisture));
}

// ── Topographic Fire Spread Factor ──────────────────────────────

export function topographicSpreadFactor(slope, aspect, windDirection) {
  // Slope effect: steeper = faster uphill spread
  const slopeRad = (slope * Math.PI) / 180;
  const slopeFactor = 1 + Math.tan(slopeRad) * 2;

  // Aspect alignment with wind
  const aspectDiff = Math.abs(aspect - windDirection);
  const alignmentDeg = aspectDiff > 180 ? 360 - aspectDiff : aspectDiff;
  const windAlignmentFactor = 1 + (1 - alignmentDeg / 180) * 0.5;

  return slopeFactor * windAlignmentFactor;
}

// ── Wind Chill / Heat Factor ────────────────────────────────────

export function heatDryingFactor(temperature, humidity, windSpeed) {
  // How quickly fuels dry out
  const vpd = vaporPressureDeficit(temperature, humidity);
  const windDrying = Math.min(windSpeed / 30, 1) * 0.3;
  const vpdNorm = Math.min(vpd / 4, 1) * 0.7;

  return vpdNorm + windDrying;
}

export function vaporPressureDeficit(temperature, humidity) {
  // Tetens formula for saturation vapor pressure (kPa)
  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const avp = svp * (humidity / 100);
  return Math.max(0, svp - avp);
}

// ── Keetch-Byram Drought Index (simplified) ─────────────────────

export function calculateKBDI(prevKBDI, maxTemp, dailyPrecip, meanAnnualPrecip) {
  // Simplified KBDI calculation (range 0–800)
  const netPrecip = Math.max(0, dailyPrecip - 5.08); // 5.08mm threshold
  let kbdi = prevKBDI - netPrecip * 100;

  // Drought factor
  const dryingFactor =
    ((800 - kbdi) * (0.968 * Math.exp(0.0875 * maxTemp + 1.5552) - 8.3)) /
    (1 + 10.88 * Math.exp(-0.001736 * meanAnnualPrecip));

  kbdi = kbdi + dryingFactor / 1000;
  return Math.max(0, Math.min(800, kbdi));
}

// ── Beaufort Wind Scale ─────────────────────────────────────────

export function beaufortScale(windSpeedKmh) {
  if (windSpeedKmh < 1) return { force: 0, description: 'Calm' };
  if (windSpeedKmh < 6) return { force: 1, description: 'Light air' };
  if (windSpeedKmh < 12) return { force: 2, description: 'Light breeze' };
  if (windSpeedKmh < 20) return { force: 3, description: 'Gentle breeze' };
  if (windSpeedKmh < 29) return { force: 4, description: 'Moderate breeze' };
  if (windSpeedKmh < 39) return { force: 5, description: 'Fresh breeze' };
  if (windSpeedKmh < 50) return { force: 6, description: 'Strong breeze' };
  if (windSpeedKmh < 62) return { force: 7, description: 'Near gale' };
  if (windSpeedKmh < 75) return { force: 8, description: 'Gale' };
  if (windSpeedKmh < 89) return { force: 9, description: 'Strong gale' };
  if (windSpeedKmh < 103) return { force: 10, description: 'Storm' };
  if (windSpeedKmh < 118) return { force: 11, description: 'Violent storm' };
  return { force: 12, description: 'Hurricane force' };
}

// ── Composite Risk Feature Vector ───────────────────────────────

export function buildFeatureVector(raw) {
  const {
    temperature = 25,
    humidity = 50,
    windSpeed = 10,
    windDirection = 180,
    precipitation = 0,
    ndvi = 0.5,
    soilMoisture = 0.5,
    elevation = 500,
    slope = 5,
    aspect = 180,
    recentPrecip = 0,
    daysSinceRain = 3,
    prevKBDI = 200,
    meanAnnualPrecip = 800,
  } = raw;

  const fwi = calculateFireWeatherIndex(temperature, humidity, windSpeed, precipitation);
  const droughtIdx = calculateDroughtIndex(recentPrecip, meanAnnualPrecip / 12);
  const vegStress = deriveVegetationStress(ndvi, soilMoisture);
  const fuelMoisture = estimateFuelMoisture(temperature, humidity, recentPrecip, daysSinceRain);
  const topoFactor = topographicSpreadFactor(slope, aspect, windDirection);
  const heatDrying = heatDryingFactor(temperature, humidity, windSpeed);
  const vpd = vaporPressureDeficit(temperature, humidity);
  const kbdi = calculateKBDI(prevKBDI, temperature, precipitation, meanAnnualPrecip);
  const beaufort = beaufortScale(windSpeed);

  return {
    // Raw inputs
    temperature,
    humidity,
    windSpeed,
    windDirection,
    precipitation,
    ndvi,
    soilMoisture,
    elevation,
    slope,
    aspect,

    // Derived features
    fireWeatherIndex: fwi,
    droughtIndex: parseFloat(droughtIdx.toFixed(4)),
    vegetationStress: parseFloat(vegStress.toFixed(4)),
    fuelMoisture: parseFloat(fuelMoisture.toFixed(4)),
    topographicSpreadFactor: parseFloat(topoFactor.toFixed(4)),
    heatDryingFactor: parseFloat(heatDrying.toFixed(4)),
    vaporPressureDeficit: parseFloat(vpd.toFixed(4)),
    kbdi: Math.round(kbdi),
    beaufortForce: beaufort.force,

    // Interaction features
    tempHumidityInteraction: parseFloat(
      ((temperature / 50) * ((100 - humidity) / 100)).toFixed(4)
    ),
    windSlopeInteraction: parseFloat(
      ((windSpeed / 60) * (slope / 45)).toFixed(4)
    ),
    dryVegetationRisk: parseFloat(
      (vegStress * (1 - fuelMoisture)).toFixed(4)
    ),
  };
}

// ── Default feature ranges for normalisation ────────────────────

export const DEFAULT_FEATURE_RANGES = {
  temperature: { min: -20, max: 55 },
  humidity: { min: 0, max: 100 },
  windSpeed: { min: 0, max: 120 },
  windDirection: { min: 0, max: 360 },
  precipitation: { min: 0, max: 100 },
  ndvi: { min: -1, max: 1 },
  soilMoisture: { min: 0, max: 1 },
  elevation: { min: 0, max: 5000 },
  slope: { min: 0, max: 90 },
  aspect: { min: 0, max: 360 },
  fireWeatherIndex: { min: 0, max: 100 },
  droughtIndex: { min: 0, max: 1 },
  vegetationStress: { min: 0, max: 1 },
  fuelMoisture: { min: 0, max: 1 },
  topographicSpreadFactor: { min: 0.5, max: 5 },
  heatDryingFactor: { min: 0, max: 1 },
  vaporPressureDeficit: { min: 0, max: 6 },
  kbdi: { min: 0, max: 800 },
  beaufortForce: { min: 0, max: 12 },
};

// ── Risk score quick estimator (heuristic) ──────────────────────

export function quickRiskEstimate(featureVector) {
  const weights = {
    fireWeatherIndex: 0.20,
    droughtIndex: 0.12,
    vegetationStress: 0.12,
    fuelMoisture: -0.15, // higher moisture = lower risk
    heatDryingFactor: 0.10,
    vaporPressureDeficit: 0.08,
    tempHumidityInteraction: 0.08,
    windSlopeInteraction: 0.07,
    dryVegetationRisk: 0.10,
    kbdi: 0.08,
  };

  const norm = normalizeFeatures(featureVector, DEFAULT_FEATURE_RANGES);

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = norm[key] ?? featureVector[key] ?? 0;
    score += value * weight;
  }

  return Math.max(0, Math.min(1, parseFloat(score.toFixed(4))));
}

// ── Temporal feature extraction ─────────────────────────────────

export function extractTemporalFeatures(date) {
  const d = new Date(date);
  const dayOfYear = Math.floor(
    (d - new Date(d.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );

  return {
    month: d.getMonth() + 1,
    dayOfYear,
    dayOfWeek: d.getDay(),
    hour: d.getHours(),
    isFireSeason: dayOfYear >= 120 && dayOfYear <= 305, // May–Oct (Northern Hemisphere)
    seasonalFactor: parseFloat(
      (Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI) * 0.5 + 0.5).toFixed(4)
    ),
  };
}

// ── Spatial clustering helper ───────────────────────────────────

export function spatialDensity(points, targetLat, targetLng, radiusKm) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;

  let count = 0;
  let totalWeight = 0;

  for (const point of points) {
    const dLat = toRad(point.lat - targetLat);
    const dLng = toRad(point.lng - targetLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(targetLat)) *
        Math.cos(toRad(point.lat)) *
        Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (dist <= radiusKm) {
      count++;
      // Inverse-distance weighting
      const weight = 1 / (1 + dist);
      totalWeight += (point.value || 1) * weight;
    }
  }

  return {
    count,
    density: count / (Math.PI * radiusKm * radiusKm),
    weightedScore: parseFloat(totalWeight.toFixed(4)),
  };
}