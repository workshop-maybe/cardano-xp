import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { courseKeys } from "~/hooks/api/course/use-course";
import { courseModuleKeys } from "~/hooks/api/course/use-course-module";
import { fetchCourseDetail, fetchCourseModules } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { LearnContent } from "./learn-content";

/**
 * Learn page — server component that prefetches course and module data.
 *
 * Course detail and modules are fetched server-side and dehydrated into
 * React Query's cache. The client component hydrates instantly.
 *
 * searchParams.preview is read server-side and passed as a prop,
 * replacing the client-side useSearchParams() call.
 */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preview = params.preview === "teacher";
  const courseId = CARDANO_XP.courseId;
  const queryClient = getQueryClient();

  // Prefetch public data in parallel.
  // Wrapped in try/catch so Gateway failures fall back to client-side fetching.
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: courseKeys.detail(courseId),
        queryFn: () => fetchCourseDetail(courseId),
      }),
      queryClient.prefetchQuery({
        queryKey: courseModuleKeys.list(courseId),
        queryFn: () => fetchCourseModules(courseId),
      }),
    ]);
  } catch (err) {
    console.error("[LearnPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <LearnContent preview={preview} />
      </Suspense>
    </HydrateClient>
  );
}
