"use client";

import { useMotionValue, animate } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Smoothly animated progress value using Framer Motion.
 * Race-safe: interrupts in-flight animations on rapid updates,
 * animating from current position to new target.
 *
 * Usage:
 *   const progress = useAnimatedProgress(percentage);
 *   <motion.circle style={{ strokeDashoffset: useTransform(progress, ...) }} />
 */
export function useAnimatedProgress(target: number, duration = 0.6) {
  const motionValue = useMotionValue(0);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    controlsRef.current?.stop();
    controlsRef.current = animate(motionValue, target, {
      duration,
      ease: [0, 0, 0.2, 1],
    });
    return () => {
      controlsRef.current?.stop();
    };
  }, [motionValue, target, duration]);

  return motionValue;
}
