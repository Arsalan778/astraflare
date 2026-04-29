import { useMemo, useCallback } from 'react';
import { Source, Layer } from 'react-map-gl';

const RISK_COLORS = {
  extreme: '#a855f7',
  very_high: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

const RISK_OPACITIES = {
  extreme: 0.35,
  very_high: 0.28,
  high: 0.22,
  moderate: 0.16,
  low: 0.1,
};

export default function RiskZoneLayer({ data, hoveredFeature }) {
  const geojson = useMemo(() => {
    if (!data) return { type: 'FeatureCollection', features: [] };
    if (data.type === 'FeatureCollection') return data;

    // Convert array of zone objects to GeoJSON
    return {
      type: 'FeatureCollection',
      features: (data || []).map((zone, i) => ({
        type: 'Feature',
        id: zone.id || i,
        geometry: zone.geometry || {
          type: 'Polygon',
          coordinates: zone.coordinates || zone.boundary || [],
        },
        properties: {
          id: zone.id || i,
          name: zone.name || zone.region || `Zone ${i + 1}`,
          risk_level: zone.risk_level || 'moderate',
          risk_score: zone.risk_score || 0,
          area_km2: zone.area_km2 || null,
          population: zone.population || null,
          last_updated: zone.last_updated || null,
          vegetation_type: zone.vegetation_type || null,
          wind_speed: zone.wind_speed || null,
          temperature: zone.temperature || null,
          humidity: zone.humidity || null,
        },
      })),
    };
  }, [data]);

  const hoveredId = hoveredFeature?.properties?.id ?? null;

  // Build the fill-color expression from our risk-level map
  const fillColorExpr = useMemo(() => {
    const stops = [];
    Object.entries(RISK_COLORS).forEach(([level, color]) => {
      stops.push(level, color);
    });
    return ['match', ['get', 'risk_level'], ...stops, '#64748b'];
  }, []);

  const fillOpacityExpr = useMemo(() => {
    const stops = [];
    Object.entries(RISK_OPACITIES).forEach(([level, opacity]) => {
      stops.push(level, opacity);
    });
    return ['match', ['get', 'risk_level'], ...stops, 0.1];
  }, []);

  if (!geojson.features || geojson.features.length === 0) return null;

  return (
    <Source id="risk-zones-source" type="geojson" data={geojson}>
      {/* Fill layer */}
      <Layer
        id="risk-zones-fill"
        type="fill"
        paint={{
          'fill-color': fillColorExpr,
          'fill-opacity': [
            'case',
            ['==', ['get', 'id'], hoveredId ?? ''],
            0.45,
            fillOpacityExpr,
          ],
        }}
      />

      {/* Border layer */}
      <Layer
        id="risk-zones-border"
        type="line"
        paint={{
          'line-color': fillColorExpr,
          'line-width': [
            'case',
            ['==', ['get', 'id'], hoveredId ?? ''],
            3,
            1.5,
          ],
          'line-opacity': 0.7,
          'line-dasharray': [2, 1],
        }}
      />

      {/* Hover highlight outline */}
      <Layer
        id="risk-zones-highlight"
        type="line"
        filter={['==', ['get', 'id'], hoveredId ?? '']}
        paint={{
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.6,
        }}
      />

      {/* Zone labels */}
      <Layer
        id="risk-zones-labels"
        type="symbol"
        minzoom={7}
        layout={{
          'text-field': ['get', 'name'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 10,
            12, 14,
          ],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 10,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
          'text-opacity': 0.9,
        }}
      />

      {/* Risk score badges at higher zoom */}
      <Layer
        id="risk-zones-score"
        type="symbol"
        minzoom={9}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['*', ['get', 'risk_score'], 100]]],
            '%',
          ],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        }}
        paint={{
          'text-color': fillColorExpr,
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}