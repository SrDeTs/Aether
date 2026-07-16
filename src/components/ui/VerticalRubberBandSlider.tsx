import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VerticalRubberBandSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

export function VerticalRubberBandSlider({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  className,
  trackClassName,
  rangeClassName,
  thumbClassName,
}: VerticalRubberBandSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [visualProgress, setVisualProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Keep visual progress in sync with the incoming value when not dragging
  useEffect(() => {
    if (!isDragging) {
      const range = max - min;
      const fraction = range === 0 ? 0 : (value - min) / range;
      setVisualProgress(fraction);
    }
  }, [value, min, max, isDragging]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only respond to primary (left) click
    
    const track = trackRef.current;
    if (!track) return;
    
    e.preventDefault();
    track.setPointerCapture(e.pointerId);
    
    const updatePosition = (clientY: number) => {
      const rect = track.getBoundingClientRect();
      const height = rect.height || 1;
      
      // For vertical slider: bottom is min, top is max
      const pointerY = rect.bottom - clientY;
      const fraction = pointerY / height;
      
      // Separate actual (clamped) value vs visual overshoot
      const clampedFraction = Math.max(0, Math.min(1, fraction));
      
      let visualFraction = fraction;
      if (fraction < 0) {
        // Exceeds the range on the bottom: add only ~32% of the overshoot
        visualFraction = fraction * 0.32;
      } else if (fraction > 1) {
        // Exceeds the range on the top: add only ~32% of the overshoot
        visualFraction = 1 + (fraction - 1) * 0.32;
      }
      
      setVisualProgress(visualFraction);
      
      // Map back to value
      const range = max - min;
      const rawValue = clampedFraction * range + min;
      
      // Round to nearest step
      const stepsCount = Math.round((rawValue - min) / step);
      const steppedValue = min + stepsCount * step;
      const finalValue = Math.max(min, Math.min(max, steppedValue));
      
      onChange(finalValue);
    };

    setIsDragging(true);
    updatePosition(e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePosition(moveEvent.clientY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      track.releasePointerCapture(upEvent.pointerId);
      track.removeEventListener("pointermove", handlePointerMove);
      track.removeEventListener("pointerup", handlePointerUp);
    };

    track.addEventListener("pointermove", handlePointerMove);
    track.addEventListener("pointerup", handlePointerUp);
  };

  // Squash and stretch calculations for the rubber band aesthetic (vertical orientation)
  let scaleX = 1;
  let scaleY = 1;
  let transformOrigin = "center center";

  if (visualProgress < 0) {
    const overshoot = Math.abs(visualProgress);
    scaleY = 1 + overshoot * 1.5;
    scaleX = 1 / scaleY;
    transformOrigin = "center bottom";
  } else if (visualProgress > 1) {
    const overshoot = visualProgress - 1;
    scaleY = 1 + overshoot * 1.5;
    scaleX = 1 / scaleY;
    transformOrigin = "center top";
  }

  // Smooth spring transition when released
  const transitionStyle = isDragging
    ? "none"
    : "bottom 400ms cubic-bezier(0.34, 1.56, 0.64, 1), height 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  const visualPercent = visualProgress * 100;

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative w-5 flex justify-center cursor-pointer select-none touch-none h-full active:scale-[0.99] transition-transform duration-100",
        className
      )}
    >
      {/* Track Background */}
      <div
        className={cn(
          "h-full w-1.5 rounded-full bg-white/10 border border-white/[0.04] relative flex flex-col justify-end",
          trackClassName
        )}
      >
        {/* Track Active Progress (Fill) */}
        <div
          className={cn(
            "absolute bottom-0 left-0 w-full rounded-full bg-primary",
            rangeClassName
          )}
          style={{
            height: `${Math.max(0, Math.min(1.5, visualProgress)) * 100}%`,
            transition: transitionStyle,
          }}
        />

        {/* Thumb */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-foreground shadow-lg shadow-black/50 border border-white/20 hover:scale-110 active:scale-95 transition-transform",
            thumbClassName
          )}
          style={{
            bottom: `${visualPercent}%`,
            marginBottom: "-7px", // Center thumb on point
            transform: `translateX(-50%) scaleX(${scaleX}) scaleY(${scaleY})`,
            transformOrigin,
            transition: transitionStyle,
          }}
        />
      </div>
    </div>
  );
}
