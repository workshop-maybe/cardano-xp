import { getQueryClient, HydrateClient } from "~/trpc/server";
import { activityKeys } from "~/lib/xp-activity-client";
import { computeActivityStats } from "~/lib/xp-activity";
import { HomeContent } from "./page-content";

/**
 * Landing page — async server component that prefetches activity stats
 * server-side so the landing strip renders instantly with no client
 * loading spinner. Mirrors the /xp/page.tsx + xp-content.tsx pattern.
 */
export default async function Home() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: activityKeys.all,
      queryFn: computeActivityStats,
    });
  } catch (err) {
    console.error(
      "[Home] Server prefetch failed, falling back to client:",
      err,
    );
  }

  return (
    <HydrateClient>
      <HomeContent />
    </HydrateClient>
  );
}
