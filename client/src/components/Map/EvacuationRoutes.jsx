import { useMemo } from 'react';
import { Source, Layer, Marker } from 'react-map-gl';
import { ShieldCheck, Hospital, Tent, Navigation } from 'lucide-react';

const ROUTE_COLORS = {
  primary: '#22c55e',
  secondary: '#3b82f6',
  emergency: '#ef4444',
  blocked: '#64748b',
};

const SHELTER_ICONS = {
  hospital: Hospital,
  shelter: Tent,
  safe_zone: ShieldCheck,
  default: Navigation,
};

export default function EvacuationRoutes({ data }) {
  // Build routes GeoJSON
  const routesGeoJson = useMemo(() => {
    if (!data) return { type: 'FeatureCollection', features: [] };

    const routes = data.routes || data.features || data;

    if (data.type === 'FeatureCollection') return data;

    if (!Array.isArray(routes)) return { type: 'FeatureCollection', features: [] };

    return {
      type: 'FeatureCollection',
      features: routes.map((route, i) => ({
        type: 'Feature',
        id: route.id || i,
        geometry: route.geometry || {
          type: 'LineString',
          coordinates: route.coordinates || route.path || [],
        },
        properties: {
          id: route.id || i,
          name: route.name || `Route ${i + 1}`,
          type: route.type || 'primary',
          status: route.status || 'open',
          distance_km: route.distance_km || null,
          estimated_time: route.estimated_time || null,
          capacity: route.capacity || null,
          congestion: route.congestion || 0,
        },
      })),
    };
  }, [data]);

  // Shelter / safe points
  const shelters = useMemo(() => {
    if (!data?.shelters) return [];
    return data.shelters.map((s, i) => ({
      id: s.id || i,
      name: s.name || `Shelter ${i + 1}`,
      type: s.type || 'shelter',
      latitude: s.latitude || s.lat,
      longitude: s.longitude || s.lng || s.lon,
      capacity: s.capacity || null,
      occupancy: s.occupancy || 0,
      contact: s.contact || null,
      status: s.status || 'open',
    }));
  }, [data]);

  // Blocked-road points
  const blockedPoints = useMemo(() => {
    if (!data?.blocked_roads) return [];
    return data.blocked_roads;
  }, [data]);

  const getRouteColor = (type, status) => {
    if (status === 'blocked') return ROUTE_COLORS.blocked;
    return ROUTE_COLORS[type] || ROUTE_COLORS.primary;
  };

  if (
    routesGeoJson.features.length === 0 &&
    shelters.length === 0
  ) {
    return null;
  }

  return (
    <>
      {/* Evacuation route lines */}
      {routesGeoJson.features.length > 0 && (
        <Source id="evacuation-routes-source" type="geojson" data={routesGeoJson}>
          {/* Route glow */}
          <Layer
            id="evacuation-routes-glow"
            type="line"
            filter={['!=', ['get', 'status'], 'blocked']}
            paint={{
              'line-color': [
                'match',
                ['get', 'type'],
                'primary', ROUTE_COLORS.primary,
                'secondary', ROUTE_COLORS.secondary,
                'emergency', ROUTE_COLORS.emergency,
                ROUTE_COLORS.primary,
              ],
              'line-width': 12,
              'line-opacity': 0.12,
              'line-blur': 6,
            }}
          />

          {/* Main route line */}
          <Layer
            id="evacuation-routes-line"
            type="line"
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
            paint={{
              'line-color': [
                'match',
                ['get', 'type'],
                'primary', ROUTE_COLORS.primary,
                'secondary', ROUTE_COLORS.secondary,
                'emergency', ROUTE_COLORS.emergency,
                'blocked', ROUTE_COLORS.blocked,
                ROUTE_COLORS.primary,
              ],
              'line-width': [
                'match',
                ['get', 'type'],
                'primary', 4,
                'emergency', 4,
                'secondary', 3,
                2,
              ],
              'line-opacity': [
                'match',
                ['get', 'status'],
                'blocked', 0.3,
                0.85,
              ],
              'line-dasharray': [
                'match',
                ['get', 'status'],
                'blocked', ['literal', [2, 4]],
                ['literal', [1, 0]],
              ],
            }}
          />

          {/* Animated arrows */}
          <Layer
            id="evacuation-routes-arrows"
            type="symbol"
            filter={['!=', ['get', 'status'], 'blocked']}
            layout={{
              'symbol-placement': 'line',
              'symbol-spacing': 80,
              'icon-image': 'arrow',
              'icon-size': 0.6,
              'icon-allow-overlap': true,
              'icon-rotation-alignment': 'map',
              'text-field': '',
            }}
            paint={{
              'icon-opacity': 0.7,
            }}
          />

          {/* Route labels */}
          <Layer
            id="evacuation-routes-labels"
            type="symbol"
            minzoom={10}
            layout={{
              'symbol-placement': 'line-center',
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, -1],
              'text-allow-overlap': false,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': 'rgba(0,0,0,0.8)',
              'text-halo-width': 1.5,
            }}
          />

          {/* Distance labels */}
          <Layer
            id="evacuation-routes-distance"
            type="symbol"
            minzoom={11}
            filter={['has', 'distance_km']}
            layout={{
              'symbol-placement': 'line-center',
              'text-field': [
                'concat',
                ['to-string', ['round', ['get', 'distance_km']]],
                ' km',
              ],
              'text-size': 9,
              'text-offset': [0, 1],
              'text-allow-overlap': false,
              'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
            }}
            paint={{
              'text-color': '#94a3b8',
              'text-halo-color': 'rgba(0,0,0,0.7)',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}

      {/* Shelter markers */}
      {shelters.map((shelter) => {
        const IconComponent = SHELTER_ICONS[shelter.type] || SHELTER_ICONS.default;
        const isOpen = shelter.status === 'open';
        const occupancyPercent = shelter.capacity
          ? Math.round((shelter.occupancy / shelter.capacity) * 100)
          : null;

        return (
          <Marker
            key={shelter.id}
            longitude={shelter.longitude}
            latitude={shelter.latitude}
            anchor="center"
          >
            <div className="group relative cursor-pointer">
              {/* Marker circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform duration-200 group-hover:scale-110
                  ${
                    isOpen
                      ? 'bg-emerald-500/20 border-emerald-400 shadow-emerald-500/30'
                      : 'bg-slate-600/20 border-slate-500 shadow-slate-500/20'
                  }`}
              >
                <IconComponent
                  size={16}
                  className={isOpen ? 'text-emerald-400' : 'text-slate-400'}
                />
              </div>

              {/* Pulse ring for open shelters */}
              {isOpen && (
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-20" />
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                  <p className="text-xs font-semibold text-white truncate">
                    {shelter.name}
                  </p>
                  <p className="text-[10px] text-slate-500 capitalize mt-0.5">
                    {shelter.type.replace('_', ' ')} •{' '}
                    <span className={isOpen ? 'text-emerald-400' : 'text-red-400'}>
                      {shelter.status}
                    </span>
                  </p>
                  {occupancyPercent !== null && (
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Occupancy</span>
                        <span>
                          {shelter.occupancy}/{shelter.capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancyPercent > 90
                              ? 'bg-red-500'
                              : occupancyPercent > 60
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          </Marker>
        );
      })}

      {/* Blocked road markers */}
      {blockedPoints.map((point, i) => (
        <Marker
          key={`blocked-${i}`}
          longitude={point.longitude || point.lng}
          latitude={point.latitude || point.lat}
          anchor="center"
        >
          <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-red-400">✕</span>
          </div>
        </Marker>
      ))}
    </>
  );
}