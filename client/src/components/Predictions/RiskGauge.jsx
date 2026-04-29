import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const RISK_LEVELS = [
  { label: 'None', min: 0, max: 10, color: '#94A3B8', bgColor: '#94A3B820' },
  { label: 'Minimal', min: 10, max: 20, color: '#3B82F6', bgColor: '#3B82F620' },
  { label: 'Low', min: 20, max: 40, color: '#22C55E', bgColor: '#22C55E20' },
  { label: 'Moderate', min: 40, max: 60, color: '#EAB308', bgColor: '#EAB30820' },
  { label: 'High', min: 60, max: 75, color: '#F97316', bgColor: '#F9731620' },
  { label: 'Very High', min: 75, max: 90, color: '#F43F5E', bgColor: '#F43F5E20' },
  { label: 'Extreme', min: 90, max: 101, color: '#EF4444', bgColor: '#EF444420' },
];

const getRiskLevel = (score) => {
  const s = score <= 1 ? score * 100 : score;
  return RISK_LEVELS.find((l) => s >= l.min && s < l.max) || RISK_LEVELS[0];
};

const RiskGauge = ({ score = 0, level, confidence = 0, size = 'lg' }) => {
  const canvasRef = useRef(null);
  const animatedScore = useSpring(0, { stiffness: 60, damping: 20 });
  const [displayScore, setDisplayScore] = useState(0);

  const normalizedScore = Math.min(Math.max(score <= 1 ? score * 100 : score, 0), 100);
  const riskInfo = getRiskLevel(normalizedScore);

  useEffect(() => {
    animatedScore.set(normalizedScore);
  }, [normalizedScore, animatedScore]);

  useEffect(() => {
    const unsubscribe = animatedScore.on('change', (v) => {
      setDisplayScore(Math.round(v));
    });
    return unsubscribe;
  }, [animatedScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const isLg = size === 'lg';
    const canvasSize = isLg ? 220 : 140;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * 0.65 * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize * 0.65}px`;
    ctx.scale(dpr, dpr);

    const centerX = canvasSize / 2;
    const centerY = canvasSize * 0.58;
    const radius = isLg ? 85 : 55;
    const lineWidth = isLg ? 14 : 10;

    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    RISK_LEVELS.forEach((rl) => {
      const segStart = startAngle + (rl.min / 100) * Math.PI;
      const segEnd = startAngle + (rl.max / 100) * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, segStart, segEnd);
      ctx.strokeStyle = rl.color + '30';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
    });

    const fillEnd = startAngle + (displayScore / 100) * Math.PI;
    const gradient = ctx.createLinearGradient(
      centerX - radius, centerY, centerX + radius, centerY
    );
    gradient.addColorStop(0, '#3B82F6');
    gradient.addColorStop(0.25, '#22C55E');
    gradient.addColorStop(0.5, '#EAB308');
    gradient.addColorStop(0.75, '#F97316');
    gradient.addColorStop(1, '#EF4444');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, fillEnd);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    const needleAngle = startAngle + (displayScore / 100) * Math.PI;
    const needleLength = radius - lineWidth - (isLg ? 8 : 4);
    const needleX = centerX + needleLength * Math.cos(needleAngle);
    const needleY = centerY + needleLength * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.arc(centerX, centerY, isLg ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#1F2937';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = riskInfo.color;
    ctx.lineWidth = isLg ? 2.5 : 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, isLg ? 4 : 3, 0, 2 * Math.PI);
    ctx.fillStyle = riskInfo.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(needleX, needleY, isLg ? 3 : 2, 0, 2 * Math.PI);
    ctx.fillStyle = riskInfo.color;
    ctx.shadowColor = riskInfo.color;
    ctx.shadowBlur = isLg ? 10 : 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i <= 10; i++) {
      const tickAngle = startAngle + (i / 10) * Math.PI;
      const outerR = radius + lineWidth / 2 + (isLg ? 4 : 2);
      const innerR =
        radius +
        lineWidth / 2 +
        (isLg ? (i % 5 === 0 ? 10 : 6) : i % 5 === 0 ? 6 : 3);

      const x1 = centerX + outerR * Math.cos(tickAngle);
      const y1 = centerY + outerR * Math.sin(tickAngle);
      const x2 = centerX + innerR * Math.cos(tickAngle);
      const y2 = centerY + innerR * Math.sin(tickAngle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i % 5 === 0 ? '#9CA3AF' : '#4B5563';
      ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
      ctx.stroke();

      if (i % 5 === 0 && isLg) {
        const labelR = innerR + 12;
        const lx = centerX + labelR * Math.cos(tickAngle);
        const ly = centerY + labelR * Math.sin(tickAngle);
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i * 10}`, lx, ly);
      }
    }
  }, [displayScore, size, riskInfo.color]);

  const isLg = size === 'lg';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas ref={canvasRef} />
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: '50%',
            bottom: isLg ? '8px' : '4px',
            transform: 'translateX(-50%)',
          }}
        >
          <motion.span
            className={`font-bold ${isLg ? 'text-3xl' : 'text-xl'}`}
            style={{ color: riskInfo.color }}
          >
            {displayScore}
          </motion.span>
          <span
            className={`text-gray-400 ${isLg ? 'text-xs' : 'text-[10px]'} -mt-1`}
          >
            / 100
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center mt-1 space-y-2">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: riskInfo.bgColor,
            color: riskInfo.color,
          }}
        >
          {level || riskInfo.label} Risk
        </div>

        {confidence > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <div className="flex items-center gap-1.5">
              <div
                className={`h-1.5 rounded-full bg-gray-700 overflow-hidden ${
                  isLg ? 'w-20' : 'w-14'
                }`}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: riskInfo.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: riskInfo.color }}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {isLg && (
          <div className="flex items-center gap-1 mt-1">
            {RISK_LEVELS.map((rl) => (
              <div key={rl.label} className="flex flex-col items-center group">
                <div
                  className={`w-8 h-1.5 rounded-full transition-all ${
                    riskInfo.label === rl.label
                      ? 'scale-y-150 shadow-md'
                      : 'opacity-40'
                  }`}
                  style={{
                    backgroundColor: rl.color,
                    boxShadow:
                      riskInfo.label === rl.label
                        ? `0 0 8px ${rl.color}60`
                        : 'none',
                  }}
                />
                <span
                  className={`text-[9px] mt-1 transition-colors ${
                    riskInfo.label === rl.label
                      ? 'text-gray-300'
                      : 'text-gray-600'
                  }`}
                >
                  {rl.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskGauge;