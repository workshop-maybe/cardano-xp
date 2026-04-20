import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { AndamioPageLoading } from "~/components/andamio";
import { ActivityContent } from "./activity-content";
import { activityKeys } from "~/lib/xp-activity-client";
import { getCachedActivityStats } from "~/lib/xp-activity";
import { withTimeout } from "~/lib/with-timeout";

/** Bound SSR TTFB under gateway stress. Race the cached prefetch against a
 *  3s ceiling; on timeout the client takes over via useQuery. */
const SSR_PREFETCH_TIMEOUT_MS = 3_000;

/**
 * /xp/activity — public page that prefetches activity stats server-side
 * and hydrates into React Query for instant client render.
 *
 * Mirrors the `/xp/leaderboard` pattern: prefetch via getCachedActivityStats,
 * wrap in HydrateClient + Suspense, hand off to the client content.
 */
export default async function ActivityPage() {
  const queryClient = getQueryClient();

  try {
    await withTimeout(
      queryClient.prefetchQuery({
        queryKey: activityKeys.all,
        queryFn: getCachedActivityStats,
      }),
      SSR_PREFETCH_TIMEOUT_MS,
      "ActivityPage prefetch",
    );
  } catch (err) {
    console.error(
      "[ActivityPage] Server prefetch failed, falling back to client:",
      err,
    );
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <ActivityContent />
      </Suspense>
    </HydrateClient>
  );
}
