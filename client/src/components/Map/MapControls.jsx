import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Layers,
  MapPin,
  Crosshair,
  Mountain,
  Satellite,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Flame,
  Route,
  Grid3X3,
  Thermometer,
  Search,
  X,
  Download,
  Camera,
  LocateFixed,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  toggleLayer,
  setMapStyle,
  resetViewport,
} from '../../store/mapSlice';
import useDebounce from '../../hooks/useDebounce';

const LAYER_OPTIONS = [
  { id: 'heatmap', label: 'Risk Heatmap', icon: Thermometer, color: 'text-orange-400' },
  { id: 'riskZones', label: 'Risk Zones', icon: Grid3X3, color: 'text-amber-400' },
  { id: 'activeFires', label: 'Active Fires', icon: Flame, color: 'text-red-400' },
  { id: 'fireSpread', label: 'Fire Spread', icon: Eye, color: 'text-purple-400' },
  { id: 'evacuation', label: 'Evacuation Routes', icon: Route, color: 'text-emerald-400' },
];

const STYLE_OPTIONS = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'terrain', label: 'Terrain', icon: Mountain },
  { id: 'light', label: 'Light', icon: Sun },
];

const QUICK_LOCATIONS = [
  { label: 'California', lng: -119.4179, lat: 36.7783, zoom: 6 },
  { label: 'Amazon', lng: -60.0217, lat: -3.4653, zoom: 5 },
  { label: 'Australia', lng: 133.7751, lat: -25.2744, zoom: 4 },
  { label: 'Siberia', lng: 105.3188, lat: 61.524, zoom: 4 },
  { label: 'Mediterranean', lng: 14.5528, lat: 37.0902, zoom: 5 },
  { label: 'British Columbia', lng: -124.9535, lat: 54.7267, zoom: 5 },
];

export default function MapControls({ mapRef, flyTo }) {
  const dispatch = useDispatch();
  const { activeLayers, mapStyle } = useSelector((state) => state.map);

  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [stylePanelOpen, setStylePanelOpen] = useState(false);
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);

  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const debouncedQuery = useDebounce(searchQuery, 400);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setLayerPanelOpen(false);
        setStylePanelOpen(false);
        setLocationSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Geocode search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const fetchResults = async () => {
      setSearchLoading(true);
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            debouncedQuery
          )}.json?access_token=${token}&limit=5&types=place,region,country`
        );
        const data = await resp.json();
        setSearchResults(
          (data.features || []).map((f) => ({
            label: f.place_name,
            lng: f.center[0],
            lat: f.center[1],
          }))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleLayerToggle = (layerId) => {
    dispatch(toggleLayer(layerId));
  };

  const handleStyleChange = (styleId) => {
    dispatch(setMapStyle(styleId));
    setStylePanelOpen(false);
  };

  const handleLocationSelect = (loc) => {
    flyTo(loc.lng, loc.lat, loc.zoom || 8);
    setLocationSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleReset = () => {
    dispatch(resetViewport());
    mapRef.current?.flyTo({
      center: [0, 20],
      zoom: 2.5,
      duration: 2000,
    });
  };

  const handleScreenshot = async () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const canvas = map.getCanvas();
    const link = document.createElement('a');
    link.download = `astraflare-map-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleGeolocate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          flyTo(pos.coords.longitude, pos.coords.latitude, 10);
        },
        () => {}
      );
    }
  };

  return (
    <div ref={panelRef} className="absolute top-3 left-3 z-10 flex flex-col gap-2">
      {/* Tools toggle (mobile) */}
      <button
        onClick={() => setToolsExpanded(!toolsExpanded)}
        className="sm:hidden bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-2 text-slate-300 hover:text-white transition-colors"
      >
        {toolsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      <div className={`flex flex-col gap-2 ${toolsExpanded ? '' : 'hidden sm:flex'}`}>
        {/* Layer control */}
        <div className="relative">
          <button
            onClick={() => {
              setLayerPanelOpen(!layerPanelOpen);
              setStylePanelOpen(false);
              setLocationSearchOpen(false);
            }}
            className={`flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border rounded-lg px-3 py-2.5 transition-all duration-200 shadow-lg
              ${
                layerPanelOpen
                  ? 'border-orange-500/50 text-orange-400'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            title="Map layers"
          >
            <Layers size={16} />
            <span className="text-xs font-medium hidden sm:inline">Layers</span>
            {Object.values(activeLayers).filter(Boolean).length > 0 && (
              <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {Object.values(activeLayers).filter(Boolean).length}
              </span>
            )}
          </button>

          {layerPanelOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Map Layers
                </h4>
              </div>
              <div className="p-2 space-y-0.5">
                {LAYER_OPTIONS.map((layer) => {
                  const isActive = activeLayers[layer.id];
                  return (
                    <button
                      key={layer.id}
                      onClick={() => handleLayerToggle(layer.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                        ${
                          isActive
                            ? 'bg-slate-800/80 text-white'
                            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                        }`}
                    >
                      <layer.icon
                        size={16}
                        className={isActive ? layer.color : 'text-slate-500'}
                      />
                      <span className="text-sm flex-1 text-left">{layer.label}</span>
                      <div
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${
                          isActive ? 'bg-orange-500' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                            isActive ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-4 py-2 border-t border-slate-800">
                <button
                  onClick={() => LAYER_OPTIONS.forEach((l) => {
                    if (activeLayers[l.id]) handleLayerToggle(l.id);
                  })}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear all layers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Map style control */}
        <div className="relative">
          <button
            onClick={() => {
              setStylePanelOpen(!stylePanelOpen);
              setLayerPanelOpen(false);
              setLocationSearchOpen(false);
            }}
            className={`flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border rounded-lg px-3 py-2.5 transition-all duration-200 shadow-lg
              ${
                stylePanelOpen
                  ? 'border-orange-500/50 text-orange-400'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            title="Map style"
          >
            <MapPin size={16} />
            <span className="text-xs font-medium hidden sm:inline capitalize">
              {mapStyle}
            </span>
          </button>

          {stylePanelOpen && (
            <div className="absolute top-full left-0 mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Map Style
                </h4>
              </div>
              <div className="p-2 grid grid-cols-2 gap-1.5 w-56">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg transition-all duration-200
                      ${
                        mapStyle === style.id
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                  >
                    <style.icon size={18} />
                    <span className="text-[11px] font-medium">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location search */}
        <div className="relative">
          <button
            onClick={() => {
              setLocationSearchOpen(!locationSearchOpen);
              setLayerPanelOpen(false);
              setStylePanelOpen(false);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className={`flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border rounded-lg px-3 py-2.5 transition-all duration-200 shadow-lg
              ${
                locationSearchOpen
                  ? 'border-orange-500/50 text-orange-400'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            title="Search location"
          >
            <Search size={16} />
            <span className="text-xs font-medium hidden sm:inline">Search</span>
          </button>

          {locationSearchOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-slate-800">
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                  <Search size={14} className="text-slate-500 ml-3" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search location..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 px-2 py-2 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setLocationSearchOpen(false);
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="p-2 text-slate-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleLocationSelect(result)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors text-left"
                    >
                      <MapPin size={12} className="text-slate-500 shrink-0" />
                      <span className="truncate">{result.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchLoading && (
                <div className="py-3 text-center text-xs text-slate-500">
                  Searching...
                </div>
              )}

              {/* Quick locations */}
              <div className="p-3 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-medium">
                  Fire Hotspots
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LOCATIONS.map((loc) => (
                    <button
                      key={loc.label}
                      onClick={() => handleLocationSelect(loc)}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-md transition-colors"
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-8 mx-auto border-t border-slate-800" />

        {/* Utility buttons */}
        <ToolButton
          icon={LocateFixed}
          title="My location"
          onClick={handleGeolocate}
        />
        <ToolButton
          icon={RotateCcw}
          title="Reset view"
          onClick={handleReset}
        />
        <ToolButton
          icon={Camera}
          title="Screenshot"
          onClick={handleScreenshot}
        />
        <ToolButton
          icon={Download}
          title="Export data"
          onClick={() => {
            // Trigger data download
            const blob = new Blob(
              [JSON.stringify({ activeLayers, timestamp: new Date().toISOString() })],
              { type: 'application/json' }
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `astraflare-data-${Date.now()}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }}
        />
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, title, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-10 h-10 bg-slate-900/90 backdrop-blur-sm border rounded-lg transition-all duration-200 shadow-lg
        ${
          active
            ? 'border-orange-500/50 text-orange-400'
            : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
        }`}
      title={title}
    >
      <Icon size={16} />
    </button>
  );
}