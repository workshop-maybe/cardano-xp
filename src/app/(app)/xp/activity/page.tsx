import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { AndamioPageLoading } from "~/components/andamio";
import { ActivityContent } from "./activity-content";
import { activityKeys } from "~/lib/xp-activity-client";
import { computeActivityStats } from "~/lib/xp-activity";

/**
 * /xp/activity — public page that prefetches activity stats server-side
 * and hydrates into React Query for instant client render.
 *
 * Mirrors the `/xp/leaderboard` pattern: prefetch via computeActivityStats,
 * wrap in HydrateClient + Suspense, hand off to the client content.
 */
export default async function ActivityPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: activityKeys.all,
      queryFn: computeActivityStats,
    });
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
