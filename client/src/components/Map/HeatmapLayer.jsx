import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl';

const HEATMAP_COLORS = [
  'interpolate',
  ['linear'],
  ['heatmap-density'],
  0, 'rgba(0,0,0,0)',
  0.1, 'rgba(34,197,94,0.3)',
  0.3, 'rgba(234,179,8,0.5)',
  0.5, 'rgba(249,115,22,0.6)',
  0.7, 'rgba(239,68,68,0.7)',
  0.9, 'rgba(168,85,247,0.8)',
  1, 'rgba(236,72,153,0.9)',
];

export default function HeatmapLayer({ data }) {
  const geojson = useMemo(() => {
    if (!data || data.type === 'FeatureCollection') {
      return data || { type: 'FeatureCollection', features: [] };
    }

    return {
      type: 'FeatureCollection',
      features: (data || []).map((point, i) => ({
        type: 'Feature',
        id: point.id || i,
        geometry: {
          type: 'Point',
          coordinates: [
            point.longitude || point.lng || point.lon,
            point.latitude || point.lat,
          ],
        },
        properties: {
          risk_score: point.risk_score || point.intensity || 0.5,
          temperature: point.temperature || null,
          humidity: point.humidity || null,
          wind_speed: point.wind_speed || null,
        },
      })),
    };
  }, [data]);

  if (!geojson.features || geojson.features.length === 0) return null;

  return (
    <Source id="heatmap-source" type="geojson" data={geojson}>
      {/* Heatmap layer – visible at lower zoom levels */}
      <Layer
        id="fire-risk-heatmap"
        type="heatmap"
        maxzoom={14}
        paint={{
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0, 0,
            0.5, 0.5,
            1, 1,
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 0.5,
            9, 2,
            14, 3,
          ],
          'heatmap-color': HEATMAP_COLORS,
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 8,
            5, 20,
            9, 40,
            14, 60,
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 0.85,
            14, 0.4,
          ],
        }}
      />

      {/* Circle layer – transitions in at higher zoom levels */}
      <Layer
        id="fire-risk-points"
        type="circle"
        minzoom={10}
        paint={{
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            16, 12,
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0, '#22c55e',
            0.3, '#eab308',
            0.5, '#f97316',
            0.7, '#ef4444',
            0.9, '#a855f7',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.4,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0,
            12, 0.8,
          ],
        }}
      />

      {/* Label layer – visible at high zoom */}
      <Layer
        id="fire-risk-labels"
        type="symbol"
        minzoom={13}
        layout={{
          'text-field': [
            'concat',
            ['to-string', ['round', ['*', ['get', 'risk_score'], 100]]],
            '%',
          ],
          'text-size': 11,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
          'text-allow-overlap': false,
        }}
        paint={{
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
}