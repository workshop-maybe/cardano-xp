"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals elements when they enter the viewport using IntersectionObserver.
 * CSS-only animation — zero Framer Motion overhead.
 *
 * Usage:
 *   const { ref, isVisible } = useScrollReveal();
 *   <div ref={ref} className={isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}>
 */
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
