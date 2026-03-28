import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { projectKeys } from "~/hooks/api/project/use-project";
import { fetchProjectDetail } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { XPContent } from "./xp-content";

/**
 * XP Tokenomics page — server component that prefetches project data.
 *
 * Project detail (treasury balance, assets) is fetched server-side and
 * dehydrated into React Query's cache. The client component hydrates
 * instantly — no loading spinner for public data.
 */
export default async function XPPage() {
  const projectId = CARDANO_XP.projectId;
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProjectDetail(projectId),
    });
  } catch (err) {
    console.error("[XPPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <XPContent />
      </Suspense>
    </HydrateClient>
  );
}
