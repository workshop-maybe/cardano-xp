import type { ActivityStats } from "~/types/xp-activity";

/**
 * Client-side helpers for the XP activity query. Shared between the landing
 * strip (src/app/page-content.tsx) and the dedicated activity page
 * (src/app/(app)/xp/activity/activity-content.tsx) so both surfaces agree on
 * the query key and the fetch error contract.
 *
 * Server pages import `activityKeys` for prefetch; they should not import
 * `fetchActivity` (the server path calls `computeActivityStats()` directly).
 */

export const activityKeys = {
  all: ["xp-activity"] as const,
};

export async function fetchActivity(): Promise<ActivityStats> {
  const response = await fetch("/api/xp-activity");

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    throw new Error(
      errorData.error ?? `Failed to fetch activity: ${response.statusText}`,
    );
  }

  return response.json() as Promise<ActivityStats>;
}
