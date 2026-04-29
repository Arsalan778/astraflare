import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Source, Layer } from 'react-map-gl';

const SPREAD_PALETTE = [
  'interpolate',
  ['linear'],
  ['get', 'intensity'],
  0, 'rgba(254, 240, 138, 0.3)',    // yellow-200
  0.25, 'rgba(253, 186, 116, 0.45)', // orange-300
  0.5, 'rgba(251, 146, 60, 0.6)',    // orange-400
  0.75, 'rgba(239, 68, 68, 0.7)',    // red-500
  1.0, 'rgba(168, 85, 247, 0.85)',   // purple-500
];

export default function FireSpreadLayer({ frames, currentTime }) {
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const animRef = useRef(null);

  // Determine which frame is closest to `currentTime`
  useEffect(() => {
    if (!frames || frames.length === 0) return;

    if (currentTime != null) {
      // Find closest frame by timestamp
      let closest = 0;
      let minDiff = Infinity;
      frames.forEach((f, i) => {
        const diff = Math.abs(new Date(f.timestamp).getTime() - new Date(currentTime).getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = i;
        }
      });
      setActiveFrameIdx(closest);
    }
  }, [currentTime, frames]);

  // Current frame GeoJSON
  const geojson = useMemo(() => {
    if (!frames || frames.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const frame = frames[activeFrameIdx];
    if (!frame) return { type: 'FeatureCollection', features: [] };

    // Frame can be a GeoJSON FeatureCollection itself
    if (frame.type === 'FeatureCollection') return frame;

    // Or frame.data holds the GeoJSON
    if (frame.data?.type === 'FeatureCollection') return frame.data;

    // Build from an array of polygons / cells
    const cells = frame.cells || frame.data || [];
    return {
      type: 'FeatureCollection',
      features: cells.map((cell, i) => ({
        type: 'Feature',
        id: cell.id || i,
        geometry: cell.geometry || {
          type: 'Polygon',
          coordinates: cell.coordinates || [],
        },
        properties: {
          intensity: cell.intensity ?? cell.burn_probability ?? 0,
          arrival_time: cell.arrival_time || null,
          flame_length: cell.flame_length || null,
          rate_of_spread: cell.rate_of_spread || null,
          hour: frame.hour || activeFrameIdx,
        },
      })),
    };
  }, [frames, activeFrameIdx]);

  // Perimeter line from the spread area
  const perimeterGeoJson = useMemo(() => {
    if (!frames || frames.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const frame = frames[activeFrameIdx];
    if (!frame) return { type: 'FeatureCollection', features: [] };

    // If frame has explicit perimeter
    if (frame.perimeter) {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: frame.perimeter,
            properties: { hour: frame.hour || activeFrameIdx },
          },
        ],
      };
    }

    return { type: 'FeatureCollection', features: [] };
  }, [frames, activeFrameIdx]);

  if (!geojson.features || geojson.features.length === 0) return null;

  return (
    <>
      {/* Fire spread cells / raster */}
      <Source id="fire-spread-source" type="geojson" data={geojson}>
        <Layer
          id="fire-spread-fill"
          type="fill"
          paint={{
            'fill-color': SPREAD_PALETTE,
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0, 0.1,
              0.5, 0.4,
              1, 0.7,
            ],
          }}
        />

        {/* Cell borders */}
        <Layer
          id="fire-spread-border"
          type="line"
          paint={{
            'line-color': [
              'interpolate',
              ['linear'],
              ['get', 'intensity'],
              0, 'rgba(253,186,116,0.2)',
              0.5, 'rgba(249,115,22,0.4)',
              1, 'rgba(239,68,68,0.6)',
            ],
            'line-width': 0.5,
            'line-opacity': 0.5,
          }}
        />

        {/* Rate of spread arrows at high zoom */}
        <Layer
          id="fire-spread-labels"
          type="symbol"
          minzoom={11}
          filter={['>', ['get', 'intensity'], 0.3]}
          layout={{
            'text-field': [
              'concat',
              ['to-string', ['round', ['*', ['get', 'intensity'], 100]]],
              '%',
            ],
            'text-size': 9,
            'text-allow-overlap': false,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          }}
          paint={{
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.8)',
            'text-halo-width': 1,
          }}
        />
      </Source>

      {/* Fire perimeter outline */}
      {perimeterGeoJson.features.length > 0 && (
        <Source id="fire-perimeter-source" type="geojson" data={perimeterGeoJson}>
          <Layer
            id="fire-perimeter-line"
            type="line"
            paint={{
              'line-color': '#ef4444',
              'line-width': 3,
              'line-opacity': 0.9,
              'line-dasharray': [3, 2],
            }}
          />
          <Layer
            id="fire-perimeter-glow"
            type="line"
            paint={{
              'line-color': '#f97316',
              'line-width': 8,
              'line-opacity': 0.15,
              'line-blur': 4,
            }}
          />
        </Source>
      )}

      {/* Frame indicator overlay */}
      {frames && frames.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-full px-4 py-1.5 flex items-center gap-2 z-10">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            T+{frames[activeFrameIdx]?.hour ?? activeFrameIdx}h
          </span>
          <span className="text-[10px] text-slate-500">
            Frame {activeFrameIdx + 1}/{frames.length}
          </span>
        </div>
      )}
    </>
  );
}