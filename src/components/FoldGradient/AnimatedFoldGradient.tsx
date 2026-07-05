import { useState, useRef, useEffect, useCallback } from "react";
import FoldGradient, { type FoldGradientProps } from "./FoldGradient";

// ── Color interpolation utilities ──

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.round(Math.max(0, Math.min(1, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Animated wrapper ──

/**
 * Wraps FoldGradient and smoothly interpolates between settings changes
 * using requestAnimationFrame. Transition duration ~800ms with cubic ease-out.
 */
export default function AnimatedFoldGradient(props: FoldGradientProps) {
  const {
    colors: targetColors = ["#700000", "#008cff", "#75daff", "#ff0026", "#ff3626"],
    bgColor: targetBg = "#121212",
    shadowColor: targetShadow = "#0a1c2a",
    softness: targetSoftness = 1,
    saturation: targetSaturation = 1,
    rotation: targetRotation = 52,
    zoom: targetZoom = 9,
    ribbon: targetRibbon = 0,
    ribbonWidth: targetRibbonWidth = 1,
    speed: targetSpeed = 1,
    style,
  } = props;

  // Store target in a ref so the rAF callback can read the latest
  const targetRef = useRef({
    colors: targetColors,
    bg: targetBg,
    shadow: targetShadow,
    softness: targetSoftness,
    saturation: targetSaturation,
    rotation: targetRotation,
    zoom: targetZoom,
    ribbon: targetRibbon,
    ribbonWidth: targetRibbonWidth,
    speed: targetSpeed,
  });
  targetRef.current = {
    colors: targetColors,
    bg: targetBg,
    shadow: targetShadow,
    softness: targetSoftness,
    saturation: targetSaturation,
    rotation: targetRotation,
    zoom: targetZoom,
    ribbon: targetRibbon,
    ribbonWidth: targetRibbonWidth,
    speed: targetSpeed,
  };

  // Current animated state (what we actually render)
  const [animated, setAnimated] = useState({
    colors: targetColors,
    bgColor: targetBg,
    shadowColor: targetShadow,
    softness: targetSoftness,
    saturation: targetSaturation,
    rotation: targetRotation,
    zoom: targetZoom,
    ribbon: targetRibbon,
    ribbonWidth: targetRibbonWidth,
    speed: targetSpeed,
  });

  const animRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    from: typeof animated;
    to: typeof animated;
  }>({ active: false, startTime: 0, duration: 800, from: { ...animated }, to: { ...animated } });

  // Ref to restart the RAF loop — shared between the detection effect and the RAF effect
  const restartRafRef = useRef<() => void>(() => {});

  // Detect target changes and start animation
  useEffect(() => {
    const t = targetRef.current;
    const current = animRef.current;
    const from = { ...animated };

    const to = {
      colors: t.colors,
      bgColor: t.bg,
      shadowColor: t.shadow,
      softness: t.softness,
      saturation: t.saturation,
      rotation: t.rotation,
      zoom: t.zoom,
      ribbon: t.ribbon,
      ribbonWidth: t.ribbonWidth,
      speed: t.speed,
    };

    // If nothing changed, skip
    const sameColors =
      from.colors.length === to.colors.length &&
      from.colors.every((c, i) => c === to.colors[i]);
    if (
      sameColors &&
      from.bgColor === to.bgColor &&
      from.shadowColor === to.shadowColor &&
      from.softness === to.softness &&
      from.saturation === to.saturation &&
      from.rotation === to.rotation &&
      from.zoom === to.zoom &&
      from.ribbon === to.ribbon &&
      from.ribbonWidth === to.ribbonWidth &&
      from.speed === to.speed
    ) {
      return;
    }

    current.active = true;
    current.startTime = performance.now();
    current.duration = 800;
    current.from = from;
    current.to = to;

    // Restart RAF loop immediately (zero delay)
    restartRafRef.current();
  }, [targetColors, targetBg, targetShadow, targetSoftness, targetSaturation, targetRotation, targetZoom, targetRibbon, targetRibbonWidth, targetSpeed]);

  // Animation loop — only runs when anim.active is true
  useEffect(() => {
    let rafId: number;

    function tick(now: number) {
      const anim = animRef.current;
      if (!anim.active) {
        return; // Stop loop when idle — no unnecessary re-renders
      }

      const elapsed = now - anim.startTime;
      const rawT = Math.min(elapsed / anim.duration, 1);
      const t = easeOutCubic(rawT);

      const from = anim.from;
      const to = anim.to;

      // Interpolate colors (element-wise)
      const maxLen = Math.max(from.colors.length, to.colors.length);
      const interpolatedColors: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const fc = from.colors[i] || from.colors[from.colors.length - 1];
        const tc = to.colors[i] || to.colors[to.colors.length - 1];
        interpolatedColors.push(lerpColor(fc, tc, t));
      }

      setAnimated({
        colors: interpolatedColors,
        bgColor: lerpColor(from.bgColor, to.bgColor, t),
        shadowColor: lerpColor(from.shadowColor, to.shadowColor, t),
        softness: lerp(from.softness, to.softness, t),
        saturation: lerp(from.saturation, to.saturation, t),
        rotation: lerp(from.rotation, to.rotation, t),
        zoom: lerp(from.zoom, to.zoom, t),
        ribbon: lerp(from.ribbon, to.ribbon, t),
        ribbonWidth: lerp(from.ribbonWidth, to.ribbonWidth, t),
        speed: lerp(from.speed, to.speed, t),
      });

      if (rawT >= 1) {
        anim.active = false;
        // Snap to exact target values
        setAnimated({
          colors: [...to.colors],
          bgColor: to.bgColor,
          shadowColor: to.shadowColor,
          softness: to.softness,
          saturation: to.saturation,
          rotation: to.rotation,
          zoom: to.zoom,
          ribbon: to.ribbon,
          ribbonWidth: to.ribbonWidth,
          speed: to.speed,
        });
        return; // Stop the loop
      }

      rafId = requestAnimationFrame(tick);
    }

    // Expose restart function so the detection effect can call it
    restartRafRef.current = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    // Initial start if already animating
    if (animRef.current.active) {
      restartRafRef.current();
    }

    return () => {
      cancelAnimationFrame(rafId);
      restartRafRef.current = () => {};
    };
  }, []);

  return (
    <FoldGradient
      colors={animated.colors}
      bgColor={animated.bgColor}
      shadowColor={animated.shadowColor}
      softness={animated.softness}
      saturation={animated.saturation}
      rotation={animated.rotation}
      zoom={animated.zoom}
      ribbon={animated.ribbon}
      ribbonWidth={animated.ribbonWidth}
      speed={animated.speed}
      style={style}
    />
  );
}
