import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  XMarkIcon,
  MapIcon,
  CursorArrowRaysIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import useDebounce from '../../hooks/useDebounce';
import useGeolocation from '../../hooks/useGeolocation';
import { searchRegions } from '../../api/predictions';

// Predefined notable fire-prone regions
const PRESET_REGIONS = [
  {
    id: 'ca-sierra-nevada',
    name: 'Sierra Nevada',
    state: 'California, USA',
    coordinates: { lat: 37.5, lng: -119.5 },
    geometry: { type: 'Point', coordinates: [-119.5, 37.5] },
    bounds: { north: 39.0, south: 36.0, east: -118.0, west: -121.0 },
    category: 'north-america',
  },
  {
    id: 'ca-socal',
    name: 'Southern California',
    state: 'California, USA',
    coordinates: { lat: 34.0, lng: -118.2 },
    geometry: { type: 'Point', coordinates: [-118.2, 34.0] },
    bounds: { north: 35.0, south: 33.0, east: -117.0, west: -119.5 },
    category: 'north-america',
  },
  {
    id: 'or-cascades',
    name: 'Oregon Cascades',
    state: 'Oregon, USA',
    coordinates: { lat: 43.5, lng: -122.0 },
    geometry: { type: 'Point', coordinates: [-122.0, 43.5] },
    bounds: { north: 45.0, south: 42.0, east: -121.0, west: -123.0 },
    category: 'north-america',
  },
  {
    id: 'au-nsw',
    name: 'New South Wales',
    state: 'Australia',
    coordinates: { lat: -33.0, lng: 147.0 },
    geometry: { type: 'Point', coordinates: [147.0, -33.0] },
    bounds: { north: -28.0, south: -38.0, east: 154.0, west: 141.0 },
    category: 'australia',
  },
  {
    id: 'au-victoria',
    name: 'Victoria',
    state: 'Australia',
    coordinates: { lat: -37.0, lng: 145.0 },
    geometry: { type: 'Point', coordinates: [145.0, -37.0] },
    bounds: { north: -34.0, south: -39.0, east: 150.0, west: 141.0 },
    category: 'australia',
  },
  {
    id: 'pt-algarve',
    name: 'Algarve',
    state: 'Portugal',
    coordinates: { lat: 37.2, lng: -8.0 },
    geometry: { type: 'Point', coordinates: [-8.0, 37.2] },
    bounds: { north: 37.5, south: 36.9, east: -7.4, west: -8.9 },
    category: 'europe',
  },
  {
    id: 'gr-attica',
    name: 'Attica',
    state: 'Greece',
    coordinates: { lat: 38.0, lng: 23.7 },
    geometry: { type: 'Point', coordinates: [23.7, 38.0] },
    bounds: { north: 38.5, south: 37.5, east: 24.2, west: 23.2 },
    category: 'europe',
  },
  {
    id: 'br-amazon',
    name: 'Amazon Basin',
    state: 'Brazil',
    coordinates: { lat: -3.0, lng: -60.0 },
    geometry: { type: 'Point', coordinates: [-60.0, -3.0] },
    bounds: { north: 2.0, south: -8.0, east: -50.0, west: -70.0 },
    category: 'south-america',
  },
  {
    id: 'ca-bc',
    name: 'British Columbia',
    state: 'Canada',
    coordinates: { lat: 53.7, lng: -127.6 },
    geometry: { type: 'Point', coordinates: [-127.6, 53.7] },
    bounds: { north: 60.0, south: 48.3, east: -114.0, west: -139.0 },
    category: 'north-america',
  },
  {
    id: 'id-kalimantan',
    name: 'Kalimantan',
    state: 'Indonesia',
    coordinates: { lat: 0.0, lng: 114.0 },
    geometry: { type: 'Point', coordinates: [114.0, 0.0] },
    bounds: { north: 4.0, south: -4.0, east: 118.0, west: 109.0 },
    category: 'asia',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Regions' },
  { id: 'north-america', label: 'North America' },
  { id: 'europe', label: 'Europe' },
  { id: 'australia', label: 'Australia' },
  { id: 'south-america', label: 'South America' },
  { id: 'asia', label: 'Asia' },
];

const RegionSelector = ({ selectedRegion, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favoriteRegions') || '[]');
    } catch {
      return [];
    }
  });
  const [mode, setMode] = useState('preset'); // 'preset' | 'search' | 'custom'
  const [customCoords, setCustomCoords] = useState({ lat: '', lng: '' });
  const [customRadius, setCustomRadius] = useState(50);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { position, requestPosition, loading: geoLoading } = useGeolocation();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, mode]);

  // Search API
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setSearching(true);
      try {
        const results = await searchRegions(debouncedSearch);
        setSearchResults(results.data || []);
      } catch (err) {
        console.error('Region search failed:', err);
        // Fallback to local search
        const filtered = PRESET_REGIONS.filter(
          (r) =>
            r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.state.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
        setSearchResults(filtered);
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Use geolocation
  useEffect(() => {
    if (position) {
      setCustomCoords({
        lat: position.latitude.toFixed(4),
        lng: position.longitude.toFixed(4),
      });
    }
  }, [position]);

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'all') return PRESET_REGIONS;
    return PRESET_REGIONS.filter((r) => r.category === activeCategory);
  }, [activeCategory]);

  const toggleFavorite = (regionId) => {
    setFavorites((prev) => {
      const newFavs = prev.includes(regionId)
        ? prev.filter((id) => id !== regionId)
        : [...prev, regionId];
      localStorage.setItem('favoriteRegions', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const handleSelectRegion = (region) => {
    onSelect(region);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomRegion = () => {
    if (!customCoords.lat || !customCoords.lng) return;

    const customRegion = {
      id: `custom-${Date.now()}`,
      name: `Custom Area (${parseFloat(customCoords.lat).toFixed(2)}, ${parseFloat(customCoords.lng).toFixed(2)})`,
      coordinates: {
        lat: parseFloat(customCoords.lat),
        lng: parseFloat(customCoords.lng),
      },
      bounds: {
        north: parseFloat(customCoords.lat) + customRadius / 111,
        south: parseFloat(customCoords.lat) - customRadius / 111,
        east: parseFloat(customCoords.lng) + customRadius / 111,
        west: parseFloat(customCoords.lng) - customRadius / 111,
      },
    };

    handleSelectRegion(customRegion);
  };

  const handleUseMyLocation = async () => {
    try {
      await requestPosition();
    } catch (error) {
      console.error('Geolocation error:', error);
    }
  };

  // Sorted presets: favorites first
  const sortedPresets = useMemo(() => {
    return [...filteredPresets].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? -1 : 0;
      const bFav = favorites.includes(b.id) ? -1 : 0;
      return aFav - bFav;
    });
  }, [filteredPresets, favorites]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
          isOpen
            ? 'border-orange-500/50 bg-gray-800/80 ring-1 ring-orange-500/20'
            : selectedRegion
            ? 'border-gray-600/50 bg-gray-800/50 hover:border-gray-500'
            : 'border-dashed border-gray-600/50 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              selectedRegion ? 'bg-orange-500/20' : 'bg-gray-700/50'
            }`}
          >
            <MapPinIcon
              className={`h-5 w-5 ${
                selectedRegion ? 'text-orange-400' : 'text-gray-500'
              }`}
            />
          </div>
          <div className="text-left">
            {selectedRegion ? (
              <>
                <p className="text-sm font-medium text-white">
                  {selectedRegion.name}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedRegion.state ||
                    `${selectedRegion.coordinates.lat.toFixed(
                      2
                    )}°, ${selectedRegion.coordinates.lng.toFixed(2)}°`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">Select a Region</p>
                <p className="text-xs text-gray-500">
                  Choose an area to analyze
                </p>
              </>
            )}
          </div>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
            style={{ maxHeight: '460px' }}
          >
            {/* Mode Tabs */}
            <div className="flex border-b border-gray-700/50">
              {[
                { id: 'preset', label: 'Presets', icon: MapIcon },
                {
                  id: 'search',
                  label: 'Search',
                  icon: MagnifyingGlassIcon,
                },
                {
                  id: 'custom',
                  label: 'Custom',
                  icon: CursorArrowRaysIcon,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    mode === tab.id
                      ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: '380px' }}
            >
              {/* Preset Mode */}
              {mode === 'preset' && (
                <div>
                  {/* Category Filter */}
                  <div className="flex gap-1 p-2 overflow-x-auto scrollbar-none">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:text-gray-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Region List */}
                  <div className="p-1">
                    {sortedPresets.map((region) => (
                      <div
                        key={region.id}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group cursor-pointer ${
                          selectedRegion?.id === region.id
                            ? 'bg-orange-500/10 text-white'
                            : 'text-gray-300 hover:bg-gray-800/50'
                        }`}
                        onClick={() => handleSelectRegion(region)}
                      >
                        <div className="flex items-center gap-3">
                          <MapPinIcon
                            className={`h-4 w-4 flex-shrink-0 ${
                              selectedRegion?.id === region.id
                                ? 'text-orange-400'
                                : 'text-gray-500'
                            }`}
                          />
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {region.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {region.state}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(region.id);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {favorites.includes(region.id) ? (
                            <StarIconSolid className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <StarIcon className="h-4 w-4 text-gray-500 hover:text-yellow-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Mode */}
              {mode === 'search' && (
                <div>
                  <div className="p-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search regions, cities, coordinates..."
                        className="w-full pl-9 pr-8 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                  </div>

                  {searching && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full" />
                    </div>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className="p-1">
                      {searchResults.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => handleSelectRegion(region)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors"
                        >
                          <GlobeAltIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {region.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {region.state ||
                                `${region.coordinates.lat.toFixed(
                                  2
                                )}°, ${region.coordinates.lng.toFixed(2)}°`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searching &&
                    searchQuery.length >= 2 &&
                    searchResults.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          No regions found
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Try a different search term or use custom coordinates
                        </p>
                      </div>
                    )}

                  {searchQuery.length < 2 && (
                    <div className="text-center py-8">
                      <MagnifyingGlassIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Type at least 2 characters to search
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Coordinates Mode */}
              {mode === 'custom' && (
                <div className="p-3 space-y-3">
                  {/* Use My Location Button */}
                  <button
                    onClick={handleUseMyLocation}
                    disabled={geoLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                  >
                    {geoLoading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                    ) : (
                      <CursorArrowRaysIcon className="h-4 w-4" />
                    )}
                    <span>Use My Location</span>
                  </button>

                  {/* Coordinate Inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="-90"
                        max="90"
                        value={customCoords.lat}
                        onChange={(e) =>
                          setCustomCoords((prev) => ({
                            ...prev,
                            lat: e.target.value,
                          }))
                        }
                        placeholder="-90 to 90"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="-180"
                        max="180"
                        value={customCoords.lng}
                        onChange={(e) =>
                          setCustomCoords((prev) => ({
                            ...prev,
                            lng: e.target.value,
                          }))
                        }
                        placeholder="-180 to 180"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  {/* Radius Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">
                        Analysis Radius
                      </label>
                      <span className="text-xs text-orange-400 font-mono">
                        {customRadius} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="10"
                      value={customRadius}
                      onChange={(e) =>
                        setCustomRadius(parseInt(e.target.value))
                      }
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>10 km</span>
                      <span>200 km</span>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={handleCustomRegion}
                    disabled={!customCoords.lat || !customCoords.lng}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-all bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use These Coordinates
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

RegionSelector.displayName = 'RegionSelector';

export default RegionSelector;