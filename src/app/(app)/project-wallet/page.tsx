import { Suspense } from "react";
import { getQueryClient, HydrateClient } from "~/trpc/server";
import { projectKeys } from "~/hooks/api/project/use-project";
import { fetchProjectDetail } from "~/lib/gateway-server";
import { CARDANO_XP } from "~/config/cardano-xp";
import { AndamioPageLoading } from "~/components/andamio";
import { ProjectWalletContent } from "./project-wallet-content";

export default async function ProjectWalletPage() {
  const projectId = CARDANO_XP.projectId;
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProjectDetail(projectId),
    });
  } catch (err) {
    console.error("[ProjectWalletPage] Server prefetch failed:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <ProjectWalletContent />
      </Suspense>
    </HydrateClient>
  );
}
