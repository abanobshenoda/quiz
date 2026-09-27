"use client";

import { useState, useRef, useCallback } from "react";

type WheelSlice = {
  id: string;
  label: string;
};

type SpinningWheelProps = {
  slices: WheelSlice[];
  onLanded: (slice: WheelSlice) => void;
  disabled?: boolean;
};

const SLICE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#EC4899", "#F97316",
  "#14B8A6", "#6366F1", "#84CC16", "#E11D48",
];

const SpinningWheel = ({ slices, onLanded, disabled = false }: SpinningWheelProps) => {
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const wheelRef = useRef<SVGGElement>(null);

  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 10;
  const sliceAngle = 360 / slices.length;

  const handleSpin = useCallback(() => {
    if (isSpinning || disabled || slices.length === 0) return;

    setIsSpinning(true);

    const fullRotations = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.random() * 360;
    const totalRotation = currentRotation + fullRotations * 360 + randomAngle;

    setCurrentRotation(totalRotation);

    setTimeout(() => {
      const normalizedAngle = totalRotation % 360;
      const pointerAngle = (360 - normalizedAngle + 270) % 360;
      const landedIndex = Math.floor(pointerAngle / sliceAngle) % slices.length;

      setIsSpinning(false);
      onLanded(slices[landedIndex]);
    }, 4500);
  }, [isSpinning, disabled, slices, currentRotation, sliceAngle, onLanded]);

  const getSlicePath = (index: number): string => {
    const startAngle = (index * sliceAngle * Math.PI) / 180;
    const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index: number) => {
    const midAngle = ((index + 0.5) * sliceAngle * Math.PI) / 180;
    const textRadius = radius * 0.65;
    const x = center + textRadius * Math.cos(midAngle);
    const y = center + textRadius * Math.sin(midAngle);
    const rotation = (index + 0.5) * sliceAngle;
    return { x, y, rotation };
  };

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-96">
        <p className="text-slate-400 text-lg">No questions available for this category.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        {/* Pointer Triangle */}
        <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[30px] border-t-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
        </div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-[-8px] rounded-full bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-400/20 blur-md" />
        
        {/* Wheel Border */}
        <div className="relative rounded-full p-2 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rounded-full overflow-hidden"
          >
            <g
              ref={wheelRef}
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transformOrigin: "center",
                transition: isSpinning
                  ? "transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                  : "none",
              }}
            >
              {slices.map((slice, i) => (
                <g key={slice.id}>
                  <path
                    d={getSlicePath(i)}
                    fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                    stroke="#1e293b"
                    strokeWidth="2"
                  />
                  <text
                    x={getTextPosition(i).x}
                    y={getTextPosition(i).y}
                    fill="white"
                    fontSize={slices.length > 10 ? "14" : "20"}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${getTextPosition(i).rotation}, ${getTextPosition(i).x}, ${getTextPosition(i).y})`}
                    className="drop-shadow-md"
                  >
                    {slice.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Center hub */}
            <circle cx={center} cy={center} r="30" fill="#0f172a" stroke="#fbbf24" strokeWidth="4" />
            <circle cx={center} cy={center} r="18" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || disabled}
        tabIndex={0}
        aria-label="Spin the wheel"
        className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400 text-slate-900 font-extrabold text-xl rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400/50 uppercase tracking-widest"
      >
        {isSpinning ? "Spinning..." : "🎰 SPIN"}
      </button>
    </div>
  );
};

export default SpinningWheel;
