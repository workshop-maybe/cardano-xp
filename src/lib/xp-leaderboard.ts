import "server-only";

import { env } from "~/env";
import type {
  ManagerCommitmentsResponse,
  ManagerCommitmentItem,
  MergedProjectDetailResponse,
} from "~/types/generated/gateway";
import type {
  LeaderboardEntry,
  LeaderboardResponse,
} from "~/types/xp-leaderboard";

/**
 * Server-only XP leaderboard computation.
 *
 * Fetches manager commitments and project detail from the gateway,
 * then computes per-alias XP totals with accurate per-submission attribution.
 *
 * Throws on errors — callers are responsible for error wrapping.
 */

const GATEWAY_URL = env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL;
const API_KEY = env.ANDAMIO_API_KEY;
const PROJECT_ID = env.NEXT_PUBLIC_PROJECT_ID;
const XP_POLICY_ID = env.NEXT_PUBLIC_XP_POLICY_ID;

/** Gateway fetch with 10s timeout to prevent hanging on slow/unresponsive upstream */
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

export async function computeLeaderboard(): Promise<LeaderboardResponse> {
  // Fetch commitments and project detail in parallel
  const [commitmentsRes, projectRes] = await Promise.all([
    gatewayFetch("/project/manager/commitments/list", {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_ID }),
    }),
    gatewayFetch(`/project/user/project/${PROJECT_ID}`),
  ]);

  // Parse project detail (required for tasks, contributors, credentialClaims)
  if (!projectRes.ok && projectRes.status !== 404) {
    throw new Error(`Failed to fetch project data: ${projectRes.status} ${projectRes.statusText}`);
  }

  const projectResult = projectRes.status === 404
    ? null
    : ((await projectRes.json()) as MergedProjectDetailResponse);
  const project = projectResult?.data ?? null;

  if (!project) {
    throw new Error(`Project not found: project_id ${PROJECT_ID}`);
  }

  const tasks = project.tasks ?? [];
  const contributors = project.contributors ?? [];
  const credentialClaims = project.credential_claims ?? [];

  // Build taskHash -> XP reward amount map
  // Match XP tokens on policyId ONLY (gateway returns decoded "XP" as name,
  // on-chain uses hex "5850")
  const taskXpMap = new Map<string, number>();
  for (const task of tasks) {
    const taskHash = task.task_hash ?? "";
    if (!taskHash || taskXpMap.has(taskHash)) continue;
    const xpAsset = task.assets?.find((a) => a.policy_id === XP_POLICY_ID);
    if (xpAsset) {
      taskXpMap.set(taskHash, Number(xpAsset.amount ?? 0));
    }
  }

  // Parse commitments
  let commitments: ManagerCommitmentItem[] = [];

  if (commitmentsRes.ok) {
    const commitmentsResult = (await commitmentsRes.json()) as ManagerCommitmentsResponse;
    commitments = commitmentsResult.data ?? [];
  } else if (commitmentsRes.status !== 404) {
    console.warn(
      "[xp-leaderboard] Commitments fetch failed, falling back to taskHash join:",
      commitmentsRes.status,
      commitmentsRes.statusText
    );
  }

  // Compute XP per alias
  const xpByAlias = new Map<string, number>();

  // Check if commitments have task_outcome data for accurate attribution
  const hasOutcomeData = commitments.some((c) => c.content?.task_outcome);

  if (commitments.length > 0 && hasOutcomeData) {
    // Primary path: use commitments with per-submission attribution
    for (const commitment of commitments) {
      const outcome = commitment.content?.task_outcome?.toUpperCase() ?? "";
      if (!outcome.startsWith("ACCEPT")) continue;

      const alias = commitment.submitted_by;
      const taskHash = commitment.task_hash;
      if (!alias || !taskHash) continue;

      const xpReward = taskXpMap.get(taskHash) ?? 0;
      if (xpReward === 0) continue;

      xpByAlias.set(alias, (xpByAlias.get(alias) ?? 0) + xpReward);
    }
  } else {
    // Fallback: commitments endpoint returned no outcome data
    // Use the existing taskHash join logic (submissions + assessments from project detail)
    if (commitments.length > 0) {
      console.warn(
        "[xp-leaderboard] Commitments lack task_outcome data, falling back to taskHash join"
      );
    }

    const submissions = project.submissions ?? [];
    const assessments = project.assessments ?? [];

    // Normalize assessment decisions
    const normalizeDecision = (raw: string | undefined): string => {
      if (!raw) return "";
      const upper = raw.toUpperCase();
      if (upper.startsWith("ACCEPT")) return "ACCEPTED";
      return upper;
    };

    // Build set of taskHashes with at least one ACCEPTED assessment
    const acceptedTaskHashes = new Set<string>();
    for (const a of assessments) {
      if (normalizeDecision(a.decision) === "ACCEPTED") {
        acceptedTaskHashes.add(a.task_hash ?? "");
      }
    }

    // Credit submitters for accepted tasks
    for (const sub of submissions) {
      const taskHash = sub.task_hash ?? "";
      if (!acceptedTaskHashes.has(taskHash)) continue;
      const xpReward = taskXpMap.get(taskHash) ?? 0;
      if (xpReward === 0) continue;
      const alias = sub.submitted_by ?? "";
      if (!alias) continue;
      xpByAlias.set(alias, (xpByAlias.get(alias) ?? 0) + xpReward);
    }
  }

  // Build enrollment status lookups
  const enrolledSet = new Set(contributors.map((c) => c.alias ?? "").filter(Boolean));
  const claimedSet = new Set(credentialClaims.map((c) => c.alias ?? "").filter(Boolean));

  // Build sorted entries (only >0 XP)
  const entries: LeaderboardEntry[] = Array.from(xpByAlias.entries())
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // XP descending
      return a[0].localeCompare(b[0]); // alias ascending for ties
    })
    .map(([alias, totalXp], index) => ({
      rank: index + 1,
      alias,
      totalXp,
      status: claimedSet.has(alias)
        ? ("claimed" as const)
        : enrolledSet.has(alias)
          ? ("enrolled" as const)
          : null,
    }));

  const totalXp = entries.reduce((sum, e) => sum + e.totalXp, 0);

  return {
    entries,
    stats: {
      totalXp,
      uniqueContributors: entries.length,
    },
  };
}
