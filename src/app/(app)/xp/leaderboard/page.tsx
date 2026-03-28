import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { projectKeys } from "~/hooks/api/project/use-project";
import { fetchProjectDetail } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { LeaderboardContent } from "./leaderboard-content";

/**
 * Leaderboard page — server component that prefetches project data.
 *
 * Project detail (submissions, assessments, tasks, contributors) is fetched
 * server-side and dehydrated into React Query's cache. The client component
 * computes the leaderboard from the hydrated cache — no loading spinner.
 */
export default async function LeaderboardPage() {
  const projectId = CARDANO_XP.projectId;
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProjectDetail(projectId),
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
