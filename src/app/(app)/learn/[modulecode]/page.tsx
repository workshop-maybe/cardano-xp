import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { courseKeys } from "~/hooks/api/course/use-course";
import { courseModuleKeys } from "~/hooks/api/course/use-course-module";
import { sltKeys } from "~/hooks/api/course/use-course-content";
import { fetchCourseDetail, fetchCourseModules, fetchSLTs } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { ModuleContent } from "./module-content";

/**
 * Module detail page — server component that prefetches public data.
 *
 * Course detail, modules, and SLTs are fetched server-side in parallel.
 * The module detail cache is seeded from the list to avoid a duplicate
 * API call. Auth-gated data (commitments, credentials) is fetched client-side.
 */
export default async function LearnModulePage({
  params,
}: {
  params: Promise<{ modulecode: string }>;
}) {
  const { modulecode: moduleCode } = await params;
  const courseId = CARDANO_XP.courseId;
  const queryClient = getQueryClient();

  try {
    const [, modules] = await Promise.all([
      queryClient.prefetchQuery({
        queryKey: courseKeys.detail(courseId),
        queryFn: () => fetchCourseDetail(courseId),
      }),
      queryClient.fetchQuery({
        queryKey: courseModuleKeys.list(courseId),
        queryFn: () => fetchCourseModules(courseId),
      }),
      queryClient.prefetchQuery({
        queryKey: sltKeys.list(courseId, moduleCode),
        queryFn: () => fetchSLTs(courseId, moduleCode),
      }),
    ]);

    // Seed the detail cache from the list — avoids a duplicate API call
    const targetModule = modules?.find((m) => m.moduleCode === moduleCode) ?? null;
    queryClient.setQueryData(courseModuleKeys.detail(courseId, moduleCode), targetModule);
  } catch (err) {
    console.error("[LearnModulePage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <ModuleContent />
      </Suspense>
    </HydrateClient>
  );
}
