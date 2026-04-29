import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  FastForward,
} from 'lucide-react';
import { setTimeRange } from '../../store/mapSlice';

const SPEED_OPTIONS = [
  { label: '0.5×', value: 2000 },
  { label: '1×', value: 1000 },
  { label: '2×', value: 500 },
  { label: '4×', value: 250 },
];

export default function TimeSlider() {
  const dispatch = useDispatch();
  const { timeRange, fireSpreadFrames } = useSelector((state) => state.map);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1×
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef(null);
  const sliderRef = useRef(null);

  const totalSteps = fireSpreadFrames?.length || 24;
  const speed = SPEED_OPTIONS[speedIdx].value;

  // Generate time labels
  const getTimeLabel = useCallback(
    (step) => {
      if (fireSpreadFrames && fireSpreadFrames[step]?.timestamp) {
        const d = new Date(fireSpreadFrames[step].timestamp);
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (timeRange?.start) {
        const start = new Date(timeRange.start);
        const hoursToAdd = step * (timeRange.stepHours || 1);
        const current = new Date(start.getTime() + hoursToAdd * 3600000);
        return current.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      return `T+${step}h`;
    },
    [fireSpreadFrames, timeRange]
  );

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, totalSteps]);

  // Dispatch time change
  useEffect(() => {
    if (fireSpreadFrames && fireSpreadFrames[currentStep]?.timestamp) {
      dispatch(
        setTimeRange({
          ...timeRange,
          current: fireSpreadFrames[currentStep].timestamp,
          currentStep,
        })
      );
    } else {
      dispatch(
        setTimeRange({
          ...timeRange,
          currentStep,
        })
      );
    }
  }, [currentStep, dispatch]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const stepBack = () => {
    setIsPlaying(false);
    setCurrentStep((p) => Math.max(0, p - 1));
  };

  const stepForward = () => {
    setIsPlaying(false);
    setCurrentStep((p) => Math.min(totalSteps - 1, p + 1));
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const cycleSpeed = () => {
    setSpeedIdx((p) => (p + 1) % SPEED_OPTIONS.length);
  };

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setCurrentStep(val);
  };

  const progressPercent = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-10">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-5 py-4 shadow-2xl">
        {/* Time display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">
              {getTimeLabel(currentStep)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPlaying && (
              <span className="flex items-center gap-1.5 text-[11px] text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Simulating
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              Step {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Slider track */}
        <div className="relative mb-3">
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Tick marks */}
            <div className="absolute inset-0 flex items-center">
              {Array.from({ length: Math.min(totalSteps, 25) }).map((_, i) => {
                const left = totalSteps > 1 ? (i / (totalSteps - 1)) * 100 : 0;
                const isMajor = i % Math.max(1, Math.floor(totalSteps / 6)) === 0;
                return (
                  <div
                    key={i}
                    className={`absolute w-px ${
                      isMajor ? 'h-2 bg-slate-500' : 'h-1 bg-slate-600'
                    }`}
                    style={{ left: `${left}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Range input overlay */}
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={handleSliderChange}
            onMouseDown={() => {
              setIsDragging(true);
              setIsPlaying(false);
            }}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => {
              setIsDragging(true);
              setIsPlaying(false);
            }}
            onTouchEnd={() => setIsDragging(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {/* Custom thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-orange-400 bg-slate-900 shadow-lg shadow-orange-500/30 transition-transform duration-100 pointer-events-none
              ${isDragging ? 'scale-125' : 'scale-100'}`}
            style={{ left: `${progressPercent}%` }}
          >
            <span className="absolute inset-1 rounded-full bg-orange-500" />
          </div>
        </div>

        {/* Time labels row */}
        <div className="flex justify-between mb-3 px-1">
          <span className="text-[10px] text-slate-500">{getTimeLabel(0)}</span>
          {totalSteps > 2 && (
            <span className="text-[10px] text-slate-500">
              {getTimeLabel(Math.floor(totalSteps / 2))}
            </span>
          )}
          <span className="text-[10px] text-slate-500">
            {getTimeLabel(totalSteps - 1)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Reset */}
          <button
            onClick={reset}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>

          {/* Step back */}
          <button
            onClick={stepBack}
            disabled={currentStep === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous step"
          >
            <SkipBack size={16} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className={`p-3 rounded-xl transition-all duration-200 shadow-lg
              ${
                isPlaying
                  ? 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600'
                  : 'bg-slate-700 text-white hover:bg-slate-600 shadow-slate-700/30'
              }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          {/* Step forward */}
          <button
            onClick={stepForward}
            disabled={currentStep >= totalSteps - 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next step"
          >
            <SkipForward size={16} />
          </button>

          {/* Speed toggle */}
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[52px] justify-center"
            title="Playback speed"
          >
            <FastForward size={12} />
            {SPEED_OPTIONS[speedIdx].label}
          </button>
        </div>
      </div>
    </div>
  );
}