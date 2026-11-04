import React, { useRef } from 'react';
import { ChevronRight, Zap } from 'lucide-react';

export const EFFORT_LEVELS = [
  { id: 'low', label: 'Low', value: 'Low' },
  { id: 'medium', label: 'Medium', value: 'Medium' },
  { id: 'high', label: 'High', value: 'High' },
  { id: 'max', label: 'Max', value: 'Max' },
];

interface EffortSliderProps {
  value: string;
  onChange: (value: string) => void;
  showTitle?: boolean;
}

export const EffortSlider: React.FC<EffortSliderProps> = ({
  value,
  onChange,
  showTitle = true,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  // Normalize current value to one of the 4 steps
  const normalizedValue = value?.toLowerCase() || 'medium';
  let currentIndex = EFFORT_LEVELS.findIndex(
    (lvl) => lvl.id === normalizedValue || lvl.label.toLowerCase() === normalizedValue
  );
  if (currentIndex === -1) {
    // Default 'auto' maps to 'Medium' (index 1)
    currentIndex = 1;
  }

  const currentLevel = EFFORT_LEVELS[currentIndex];

  const handleSelectStep = (index: number) => {
    const clamped = Math.max(0, Math.min(EFFORT_LEVELS.length - 1, index));
    onChange(EFFORT_LEVELS[clamped].label);
  };

  const handleCycleNext = () => {
    const nextIndex = (currentIndex + 1) % EFFORT_LEVELS.length;
    handleSelectStep(nextIndex);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const stepIndex = Math.round(ratio * (EFFORT_LEVELS.length - 1));
    handleSelectStep(stepIndex);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleTrackClick(e);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const moveX = moveEvent.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, moveX / rect.width));
      const stepIndex = Math.round(ratio * (EFFORT_LEVELS.length - 1));
      handleSelectStep(stepIndex);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Percentages for the 4 steps: 0%, 33.333%, 66.666%, 100%
  const stepPercentages = [0, 33.333, 66.666, 100];
  const activePercent = stepPercentages[currentIndex];

  // Calculate purple bar width:
  // - Low (0): 0% (track is completely unfilled dark gray)
  // - Max (3): 100% (fills entire track smoothly inside rounded caps)
  // - Medium (1) & High (2): terminates slightly before the knob center so no purple ever leaks to the right of the circular knob
  const getBarWidth = () => {
    if (currentIndex === 0) return '0%';
    if (currentIndex === EFFORT_LEVELS.length - 1) return '100%';
    return `calc(${activePercent}% * (1 - 18px / 100%) + 8px)`;
  };

  return (
    <div className="w-56 select-none space-y-2.5">
      {/* Top Header Row matching Image: "Reasoning" on left, "Medium >" on right */}
      <div className="flex items-center justify-between">
        {showTitle ? (
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400 fill-amber-400/30" />
            <span>Reasoning</span>
          </span>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={handleCycleNext}
          className="text-xs font-semibold text-foreground flex items-center gap-0.5 hover:text-indigo-400 transition-colors cursor-pointer group"
          title="Click to cycle next effort level"
        >
          <span>{currentLevel.label}</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform text-foreground-muted" />
        </button>
      </div>

      {/* Stepped Slider Track matching reference images */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className="relative h-4 rounded-full bg-zinc-800/90 border border-white/10 cursor-pointer flex items-center shadow-inner"
      >
        {/* Active Purple/Indigo Bar container with rounded-full overflow-hidden so it clips cleanly */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[#5c60f5] transition-all duration-150"
            style={{
              width: getBarWidth(),
            }}
          />
        </div>

        {/* 4 Step Dots along the track placed precisely at step centers */}
        {EFFORT_LEVELS.map((lvl, idx) => {
          const pct = stepPercentages[idx];
          return (
            <span
              key={lvl.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors z-10 pointer-events-none ${
                idx === currentIndex
                  ? 'opacity-0'
                  : idx < currentIndex || (idx === currentIndex && currentIndex === EFFORT_LEVELS.length - 1)
                  ? 'bg-white/80'
                  : 'bg-white/25'
              }`}
              style={{
                left: `calc(${pct}% * (1 - 18px / 100%) + 9px)`,
              }}
            />
          );
        })}

        {/* White Circular Thumb Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-white shadow-md z-20 transition-all duration-150 pointer-events-none"
          style={{
            left: `calc(${activePercent}% * (1 - 18px / 100%) + 9px)`,
          }}
        />
      </div>

      {/* Discrete Step Labels underneath */}
      <div className="flex justify-between items-center text-[10px] text-foreground-muted font-mono px-0.5 pt-0.5">
        {EFFORT_LEVELS.map((lvl, idx) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => handleSelectStep(idx)}
            className={`cursor-pointer hover:text-foreground transition-colors ${
              idx === currentIndex ? 'text-[#5c60f5] font-semibold' : ''
            }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>
    </div>
  );
};
