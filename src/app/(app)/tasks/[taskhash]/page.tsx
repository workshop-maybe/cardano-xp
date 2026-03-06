import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { projectKeys } from "~/hooks/api/project/use-project";
import { fetchProjectDetail, fetchProjectTasks } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { TaskDetailContent } from "./task-detail-content";

/**
 * Task detail page — server component that prefetches public data.
 *
 * Project detail and tasks list are fetched server-side in parallel.
 * useProjectTask on the client uses `select` from the tasks cache,
 * so prefetching the tasks list covers individual task lookups too.
 *
 * Auth-gated data (commitments, eligibility) is fetched client-side.
 */
export default async function TaskDetailPage() {
  const projectId = CARDANO_XP.projectId;
  const queryClient = getQueryClient();

  try {
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
  } catch (err) {
    console.error("[TaskDetailPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="content" />}>
        <TaskDetailContent />
      </Suspense>
    </HydrateClient>
  );
}
