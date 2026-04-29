import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';

import { fetchHeatmapData, fetchRiskZones } from '@store/mapSlice';
import WildfireMap from '@components/Map/WildfireMap';
import MapControls from '@components/Map/MapControls';
import TimeSlider from '@components/Map/TimeSlider';
import LoadingSpinner from '@components/Common/LoadingSpinner';

export default function MapView() {
  const dispatch = useDispatch();
  const { isLoading, activeLayers } = useSelector((state) => state.map);

  useEffect(() => {
    dispatch(fetchHeatmapData());
    dispatch(fetchRiskZones());
  }, [dispatch]);

  const isAnyLoading = Object.values(isLoading).some(Boolean);

  return (
    <motion.div
      className="relative h-[calc(100vh-var(--header-height))] w-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Loading Overlay */}
      {isAnyLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-dark-300">Loading map data...</span>
          </div>
        </div>
      )}

      {/* Map */}
      <WildfireMap />

      {/* Controls */}
      <div className="absolute top-4 right-4 z-40">
        <MapControls />
      </div>

      {/* Time Slider */}
      {(activeLayers.fireSpread || activeLayers.heatmap) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4">
          <TimeSlider />
        </div>
      )}
    </motion.div>
  );
}