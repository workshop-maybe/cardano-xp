import { useParams } from "next/navigation";
import { CARDANO_XP } from "~/config/cardano-xp";

/**
 * Typed params hook for learn route tree
 *
 * Uses the single course ID from CARDANO_XP config.
 * Module params come from URL.
 */
export function useLearnParams() {
  const params = useParams();

  return {
    courseId: CARDANO_XP.courseId,
    moduleCode: params.modulecode as string | undefined,
    moduleIndex: params.moduleindex
      ? parseInt(params.moduleindex as string)
      : undefined,
  };
}
