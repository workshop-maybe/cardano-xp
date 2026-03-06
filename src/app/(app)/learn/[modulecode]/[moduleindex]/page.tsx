import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { courseKeys } from "~/hooks/api/course/use-course";
import { courseModuleKeys } from "~/hooks/api/course/use-course-module";
import { sltKeys, lessonKeys } from "~/hooks/api/course/use-course-content";
import {
  fetchCourseDetail,
  fetchCourseModules,
  fetchSLTs,
  fetchLesson,
} from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { LessonContent } from "./lesson-content";

/**
 * Lesson detail page — server component that prefetches all public data.
 *
 * Course, modules, SLTs, and the specific lesson are all fetched
 * server-side in parallel. The module detail cache is seeded from the
 * list to avoid a duplicate API call. The client component hydrates instantly.
 */
export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ modulecode: string; moduleindex: string }>;
}) {
  const { modulecode: moduleCode, moduleindex: moduleIndexStr } = await params;
  const moduleIndex = parseInt(moduleIndexStr, 10);
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
      queryClient.prefetchQuery({
        queryKey: lessonKeys.detail(courseId, moduleCode, moduleIndex),
        queryFn: () => fetchLesson(courseId, moduleCode, moduleIndex),
      }),
    ]);

    // Seed the detail cache from the list — avoids a duplicate API call
    const targetModule = modules?.find((m) => m.moduleCode === moduleCode) ?? null;
    queryClient.setQueryData(courseModuleKeys.detail(courseId, moduleCode), targetModule);
  } catch (err) {
    console.error("[LearnLessonPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="content" />}>
        <LessonContent />
      </Suspense>
    </HydrateClient>
  );
}
