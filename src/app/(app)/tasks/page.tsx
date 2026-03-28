import { getQueryClient, HydrateClient } from "~/trpc/server";
import { projectKeys } from "~/hooks/api/project/use-project";
import { fetchProjectDetail, fetchProjectTasks } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { TasksContent } from "./tasks-content";

/**
 * Tasks page — server component that prefetches public data.
 *
 * Project detail and tasks are fetched server-side and dehydrated into
 * React Query's cache via HydrateClient. The client component hydrates
 * instantly from this cache — no loading spinner for public data.
 *
 * Auth-gated data (contributor commitments, student completions) is
 * fetched client-side after wallet connection.
 */
export default async function TasksPage() {
  const projectId = CARDANO_XP.projectId;
  const queryClient = getQueryClient();

  // Prefetch public data in parallel — these don't require authentication
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProjectDetail(projectId),
    }),
    queryClient.prefetchQuery({
      queryKey: projectKeys.tasks(projectId),
      queryFn: () => fetchProjectTasks(projectId),
    }),
  ]);

  return (
    <HydrateClient>
      <TasksContent />
    </HydrateClient>
  );
}
