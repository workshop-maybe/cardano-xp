import "server-only";

import { env } from "~/env";
import type {
  ManagerCommitmentsResponse,
  MergedProjectDetailResponse,
} from "~/types/generated/gateway";
import type { ActivityStats, RecentAcceptedEntry } from "~/types/xp-activity";
import { slotToDate } from "~/lib/cardano-utils";

/**
 * Server-only XP activity aggregation.
 *
 * Fetches manager commitments + project detail from the gateway, then
 * derives stats and a recent-accepted-assessments list for the public
 * activity dashboard.
 *
 * Mirrors `src/lib/xp-leaderboard.ts` in shape and error behavior —
 * throws on upstream failure; callers wrap via React Query.
 */

const GATEWAY_URL = env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL;
const API_KEY = env.ANDAMIO_API_KEY;
const PROJECT_ID = env.NEXT_PUBLIC_PROJECT_ID;
const XP_POLICY_ID = env.NEXT_PUBLIC_XP_POLICY_ID;
const NETWORK = env.NEXT_PUBLIC_CARDANO_NETWORK;

/** Fixed total supply from docs/tokenomics.md. */
const XP_TOTAL_SUPPLY = 100_000;

/** Gateway fetch with 10s timeout to prevent hanging on slow upstream. */
async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GATEWAY_URL}/api/v2${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Accept: "application/json;charset=utf-8",
      "X-API-Key": API_KEY,
      ...init?.headers,
    },
  });
}

export async function computeActivityStats(): Promise<ActivityStats> {
  const [commitmentsRes, projectRes] = await Promise.all([
    gatewayFetch("/project/manager/commitments/list", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_ID }),
    }),
    gatewayFetch(`/project/user/project/${PROJECT_ID}`),
  ]);

  if (!projectRes.ok && projectRes.status !== 404) {
    throw new Error(
      `Failed to fetch project data: ${projectRes.status} ${projectRes.statusText}`,
    );
  }

  const projectResult =
    projectRes.status === 404
      ? null
      : ((await projectRes.json()) as MergedProjectDetailResponse);
  const project = projectResult?.data ?? null;

  if (!project) {
    throw new Error(`Project not found: project_id ${PROJECT_ID}`);
  }

  const tasks = project.tasks ?? [];
  const submissions = project.submissions ?? [];
  const assessments = project.assessments ?? [];

  // Build taskHash -> XP reward map (match on policy ID; gateway decodes the
  // asset name to "XP" while on-chain uses hex "5850").
  const taskXpMap = new Map<string, number>();
  for (const task of tasks) {
    const taskHash = task.task_hash ?? "";
    if (!taskHash || taskXpMap.has(taskHash)) continue;
    const xpAsset = task.assets?.find((a) => a.policy_id === XP_POLICY_ID);
    if (xpAsset) {
      taskXpMap.set(taskHash, Number(xpAsset.amount ?? 0));
    }
  }

  // --- XP per alias + tasks-completed count via commitments (primary path) ---
  const xpByAlias = new Map<string, number>();
  let tasksCompleted = 0;

  let hasOutcomeData = false;
  if (commitmentsRes.ok) {
    const commitmentsJson =
      (await commitmentsRes.json()) as ManagerCommitmentsResponse;
    const commitments = commitmentsJson.data ?? [];
    hasOutcomeData = commitments.some((c) => c.content?.task_outcome);

    if (hasOutcomeData) {
      for (const c of commitments) {
        const outcome = c.content?.task_outcome?.toUpperCase() ?? "";
        if (!outcome.startsWith("ACCEPT")) continue;

        const alias = c.submitted_by;
        const taskHash = c.task_hash;
        if (!alias || !taskHash) continue;

        const xpReward = taskXpMap.get(taskHash) ?? 0;
        tasksCompleted += 1;
        if (xpReward > 0) {
          xpByAlias.set(alias, (xpByAlias.get(alias) ?? 0) + xpReward);
        }
      }
    }
  }

  // --- Fallback path: derive from submissions + assessments join ---
  // Used when commitments are unavailable or lack outcome data. Same logic
  // as the leaderboard fallback — credit submitters whose task has any
  // accepted assessment. Less precise for multi-submitter tasks, but the
  // activity dashboard tolerates the approximation and the primary path is
  // expected to succeed in practice.
  if (!hasOutcomeData) {
    const acceptedTaskHashes = new Set<string>();
    for (const a of assessments) {
      if (a.decision?.toUpperCase().startsWith("ACCEPT")) {
        acceptedTaskHashes.add(a.task_hash);
      }
    }

    for (const sub of submissions) {
      const taskHash = sub.task_hash ?? "";
      if (!acceptedTaskHashes.has(taskHash)) continue;
      tasksCompleted += 1;
      const xpReward = taskXpMap.get(taskHash) ?? 0;
      const alias = sub.submitted_by ?? "";
      if (!alias || xpReward === 0) continue;
      xpByAlias.set(alias, (xpByAlias.get(alias) ?? 0) + xpReward);
    }
  }

  // --- Derived stats ---
  const contributors = Array.from(xpByAlias.entries()).filter(
    ([, xp]) => xp > 0,
  ).length;
  const xpReleased = Array.from(xpByAlias.values()).reduce(
    (sum, xp) => sum + xp,
    0,
  );
  const pendingReviews = assessments.filter(
    (a) => !a.decision?.toUpperCase().startsWith("ACCEPT"),
  ).length;

  // --- Recent accepted submissions (display-oriented) ---
  // Strategy: iterate submissions, keep those whose task_hash has at least
  // one accepted assessment, sort by submission slot descending, take top N.
  // Timestamp = submission slot (when the work happened, not when it was
  // reviewed), which reads more intuitively as "recent activity."
  const acceptedTaskHashes = new Set<string>();
  for (const a of assessments) {
    if (a.decision?.toUpperCase().startsWith("ACCEPT")) {
      acceptedTaskHashes.add(a.task_hash);
    }
  }

  const recentAccepted: RecentAcceptedEntry[] = submissions
    .filter((s) => acceptedTaskHashes.has(s.task_hash ?? ""))
    .map((s) => {
      const slot = s.slot ?? 0;
      return {
        alias: s.submitted_by ?? "",
        xpEarned: taskXpMap.get(s.task_hash ?? "") ?? 0,
        slot,
        date: slot > 0 ? slotToDate(slot, NETWORK) : null,
      };
    })
    .filter((e) => e.alias)
    .sort((a, b) => b.slot - a.slot)
    .slice(0, 10);

  return {
    contributors,
    tasksCompleted,
    xpReleased,
    xpTotalSupply: XP_TOTAL_SUPPLY,
    pendingReviews,
    recentAccepted,
  };
}
