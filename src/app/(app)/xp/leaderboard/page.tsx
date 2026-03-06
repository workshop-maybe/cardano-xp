import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { AndamioPageLoading } from "~/components/andamio";
import { LeaderboardContent, leaderboardKeys } from "./leaderboard-content";
import { computeLeaderboard } from "~/lib/xp-leaderboard";

/**
 * Leaderboard page — server component that prefetches leaderboard data.
 *
 * Calls computeLeaderboard() directly (no self-fetch) to compute XP rankings
 * from manager commitments. Data is dehydrated into React Query's cache for
 * instant client render.
 */
export default async function LeaderboardPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: leaderboardKeys.all,
      queryFn: computeLeaderboard,
    });
  } catch (err) {
    console.error("[LeaderboardPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <LeaderboardContent />
      </Suspense>
    </HydrateClient>
  );
}
