"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe relative-time renderer.
 *
 * Naive `new Date() - entryDate` inside render produces SSR/client
 * mismatches whenever the two clocks land on different sides of a
 * threshold (e.g. "59m ago" server vs "1h ago" client). This component
 * sidesteps that by rendering an absolute date on SSR + first paint,
 * then upgrading to a self-ticking relative string after mount.
 *
 * The tick interval (30s) matches the tightest threshold (&lt;1m) so a
 * row that crosses "just now" → "1m ago" refreshes within one tick.
 */

interface RelativeTimeProps {
  /** ISO 8601 timestamp or null. */
  date: string | null;
}

const TICK_MS = 30_000;

export function RelativeTime({ date }: RelativeTimeProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (!date) return <>—</>;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return <>—</>;

  // SSR + first client render: absolute date. No clock comparison means
  // no hydration mismatch.
  if (now === null) {
    return <>{formatAbsolute(parsed)}</>;
  }

  return <>{formatRelative(parsed, now)}</>;
}

function formatAbsolute(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatRelative(date: Date, now: number): string {
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatAbsolute(date);
}
