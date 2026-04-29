import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MapGL, {
  NavigationControl,
  ScaleControl,
  Popup,
  GeolocateControl,
  Source,
  Layer,
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import HeatmapLayer from './HeatmapLayer';
import RiskZoneLayer from './RiskZoneLayer';
import FireSpreadLayer from './FireSpreadLayer';
import EvacuationRoutes from './EvacuationRoutes';
import LoadingSpinner from '../Common/LoadingSpinner';
import {
  setViewport,
  setSelectedPoint,
  fetchMapData,
} from '../../store/mapSlice';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const isPlaceholderToken = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here';

const OSM_STYLE = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

const MAP_STYLES = {
  dark: isPlaceholderToken ? OSM_STYLE : 'mapbox://styles/mapbox/dark-v11',
  satellite: isPlaceholderToken ? OSM_STYLE : 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: isPlaceholderToken ? OSM_STYLE : 'mapbox://styles/mapbox/outdoors-v12',
  light: isPlaceholderToken ? OSM_STYLE : 'mapbox://styles/mapbox/light-v11',
};

export default function WildfireMap({ compact = false }) {
  const dispatch = useDispatch();
  const mapRef = useRef(null);

  const {
    viewState,
    activeLayers,
    heatmapData,
    riskZones,
    fireSpreadFrames,
    evacuationRoutes,
    activeFirePoints,
    selectedPoint,
    mapStyle,
    timeRange,
    loading,
  } = useSelector((state) => state.map);

  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [cursorCoords, setCursorCoords] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);

  // Fetch map data on mount
  useEffect(() => {
    dispatch(fetchMapData());
  }, [dispatch]);

  const onMove = useCallback(
    (evt) => {
      dispatch(setViewport(evt.viewState));
    },
    [dispatch]
  );

  const onMouseMove = useCallback((evt) => {
    setCursorCoords({
      lat: evt.lngLat.lat.toFixed(4),
      lng: evt.lngLat.lng.toFixed(4),
    });

    const map = evt.target;
    const layersToQuery = ['risk-zones-fill', 'active-fires-circle'].filter(
      (layerId) => map.getLayer(layerId)
    );

    if (layersToQuery.length === 0) {
      setHoveredFeature(null);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
      return;
    }

    try {
      const features = map.queryRenderedFeatures(evt.point, {
        layers: layersToQuery,
      });

      if (features.length > 0) {
        setHoveredFeature(features[0]);
        map.getCanvas().style.cursor = 'pointer';
      } else {
        setHoveredFeature(null);
        map.getCanvas().style.cursor = '';
      }
    } catch (e) {
      // Ignore errors when querying layers that aren't loaded yet
    }
  }, []);

  const onClick = useCallback(
    (evt) => {
      const map = evt.target;
      const layersToQuery = ['risk-zones-fill', 'active-fires-circle'].filter(
        (layerId) => map.getLayer(layerId)
      );

      if (layersToQuery.length === 0) {
        setPopupInfo(null);
        dispatch(setSelectedPoint(null));
        return;
      }

      try {
        const features = map.queryRenderedFeatures(evt.point, {
          layers: layersToQuery,
        });

        if (features.length > 0) {
          const feature = features[0];
          const info = {
            longitude: evt.lngLat.lng,
            latitude: evt.lngLat.lat,
            properties: feature.properties,
            layer: feature.layer.id,
          };
          setPopupInfo(info);
          dispatch(setSelectedPoint(info));
        } else {
          setPopupInfo(null);
          dispatch(setSelectedPoint(null));
        }
      } catch (e) {
        // Ignore errors when querying layers that aren't loaded yet
      }
    },
    [dispatch]
  );

  const flyTo = useCallback(
    (lng, lat, zoom = 10) => {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom,
        duration: 2000,
        essential: true,
      });
    },
    []
  );

  const getRiskColor = (level) => {
    const colors = {
      extreme: '#a855f7',
      very_high: '#ef4444',
      high: '#f97316',
      moderate: '#eab308',
      low: '#22c55e',
    };
    return colors[level] || '#64748b';
  };

  return (
    <div className={`relative w-full ${compact ? 'h-[400px]' : 'h-full min-h-[calc(100vh-10rem)]'} rounded-xl overflow-hidden border border-slate-800`}>
      {loading && (
        <div className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <span className="text-sm text-slate-300">Loading fire data...</span>
          </div>
        </div>
      )}

      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onMouseMove={onMouseMove}
        onClick={onClick}
        mapboxAccessToken={isPlaceholderToken ? undefined : MAPBOX_TOKEN}
        mapStyle={MAP_STYLES[mapStyle] || MAP_STYLES.dark}
        attributionControl={false}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
        fog={{
          color: 'rgb(15, 23, 42)',
          'high-color': 'rgb(30, 41, 59)',
          'horizon-blend': 0.02,
          'star-intensity': 0.6,
        }}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.2 }}
      >
        <NavigationControl position="top-right" showCompass showZoom />
        <ScaleControl position="bottom-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation
          showAccuracyCircle={false}
        />

        {/* Map layers - order matters for z-index */}
        {activeLayers.heatmap && (
          <HeatmapLayer data={heatmapData} />
        )}

        {activeLayers.riskZones && (
          <RiskZoneLayer data={riskZones} hoveredFeature={hoveredFeature} />
        )}

        {activeLayers.fireSpread && (
          <FireSpreadLayer
            frames={fireSpreadFrames}
            currentTime={timeRange.current}
          />
        )}

        {activeLayers.evacuation && (
          <EvacuationRoutes data={evacuationRoutes} />
        )}

        {/* Active fires point layer */}
        {activeLayers.activeFires && activeFirePoints?.features && (
          <>
            <Source
              id="active-fires"
              type="geojson"
              data={activeFirePoints}
            >
              <Layer
                id="active-fires-glow"
                type="circle"
                paint={{
                  'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    4, 6,
                    10, 20,
                  ],
                  'circle-color': '#ef4444',
                  'circle-opacity': 0.2,
                  'circle-blur': 1,
                }}
              />
              <Layer
                id="active-fires-circle"
                type="circle"
                paint={{
                  'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    4, 3,
                    10, 8,
                  ],
                  'circle-color': [
                    'interpolate', ['linear'], ['get', 'confidence'],
                    0, '#fbbf24',
                    50, '#f97316',
                    80, '#ef4444',
                  ],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-opacity': 0.5,
                }}
              />
            </Source>
          </>
        )}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => {
              setPopupInfo(null);
              dispatch(setSelectedPoint(null));
            }}
            closeButton
            closeOnClick={false}
            className="wildfire-popup"
            maxWidth="320px"
          >
            <div className="text-white min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRiskColor(popupInfo.properties?.risk_level) }}
                />
                <h4 className="font-semibold text-sm capitalize">
                  {popupInfo.properties?.name || popupInfo.properties?.region || 'Location Detail'}
                </h4>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                {popupInfo.properties?.risk_score != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="font-medium">
                      {(popupInfo.properties.risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {popupInfo.properties?.confidence != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Confidence</span>
                    <span>{popupInfo.properties.confidence}%</span>
                  </div>
                )}
                {popupInfo.properties?.temperature != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Temperature</span>
                    <span>{popupInfo.properties.temperature}°C</span>
                  </div>
                )}
                {popupInfo.properties?.brightness != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brightness</span>
                    <span>{popupInfo.properties.brightness}K</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span>
                    {popupInfo.latitude.toFixed(4)}, {popupInfo.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {popupInfo.properties?.risk_level && (
                <div className="mt-3 pt-2 border-t border-slate-700">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(popupInfo.properties.risk_score || 0) * 100}%`,
                        backgroundColor: getRiskColor(popupInfo.properties.risk_level),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Popup>
        )}
      </MapGL>


      {/* Coordinates display */}
      {cursorCoords && !compact && (
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-[11px] text-slate-400 px-2 py-1 rounded-md border border-slate-800">
          {cursorCoords.lat}°N, {cursorCoords.lng}°E
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="absolute bottom-16 left-3 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-800 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">
            Risk Level
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Extreme', color: '#a855f7' },
              { label: 'Very High', color: '#ef4444' },
              { label: 'High', color: '#f97316' },
              { label: 'Moderate', color: '#eab308' },
              { label: 'Low', color: '#22c55e' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}