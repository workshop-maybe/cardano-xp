import { getQueryClient, HydrateClient } from "~/trpc/server";
import { activityKeys } from "~/lib/xp-activity-client";
import { getCachedActivityStats } from "~/lib/xp-activity";
import { withTimeout } from "~/lib/with-timeout";
import { HomeContent } from "./page-content";

/** Bound SSR TTFB under gateway stress. The cached function itself has a
 *  10s gateway AbortSignal, which is fine for API-route use but too long
 *  for the landing page. A race cap keeps landing TTFB predictable; the
 *  client-side useQuery takes over on the race-loss path. */
const SSR_PREFETCH_TIMEOUT_MS = 3_000;

/**
 * Landing page — async server component that prefetches activity stats
 * server-side so the landing strip renders instantly with no client
 * loading spinner. Mirrors the /xp/page.tsx + xp-content.tsx pattern.
 */
export default async function Home() {
  const queryClient = getQueryClient();

  try {
    await withTimeout(
      queryClient.prefetchQuery({
        queryKey: activityKeys.all,
        queryFn: getCachedActivityStats,
      }),
      SSR_PREFETCH_TIMEOUT_MS,
      "Home prefetch",
    );
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
