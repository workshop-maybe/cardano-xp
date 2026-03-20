/**
 * React Query hook for fetching all student assignment commitments for a course.
 *
 * Returns a flat list of commitments with normalized status values,
 * plus a helper to derive per-module status from the list.
 *
 * @example
 * ```tsx
 * function CourseProgress({ courseId }: { courseId: string }) {
 *   const { data: commitments } = useStudentAssignmentCommitments(courseId);
 *   const moduleStatus = getModuleCommitmentStatus(
 *     commitments?.filter(c => c.moduleCode === "101") ?? []
 *   );
 *   // moduleStatus: "ASSIGNMENT_ACCEPTED" | "PENDING_APPROVAL" | ...
 * }
 * ```
 */

import { useQuery } from "@tanstack/react-query";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { GATEWAY_API_BASE } from "~/lib/api-utils";
import { courseStudentKeys } from "./use-course-student";

// =============================================================================
// Types
// =============================================================================

/**
 * App-level student commitment summary with camelCase fields.
 */
export interface StudentCommitmentSummary {
  courseId: string;
  moduleCode: string;
  sltHash: string | null;
  networkStatus: string;
  source: "merged" | "chain_only" | "db_only";
}

/** Raw API response shape from the commitments list endpoint */
interface RawStudentCommitment {
  course_id?: string;
  course_module_code?: string;
  slt_hash?: string;
  on_chain_status?: string;
  commitment_status?: string;
  content?: {
    commitment_status?: string;
  };
  source?: string;
}

// =============================================================================
// Status Normalization (shared with use-assignment-commitment.ts)
// =============================================================================

const STATUS_MAP: Record<string, string> = {
  SUBMITTED: "PENDING_APPROVAL",
  ACCEPTED: "ASSIGNMENT_ACCEPTED",
  REFUSED: "ASSIGNMENT_REFUSED",
  CREDENTIAL_CLAIMED: "CREDENTIAL_CLAIMED",
  LEFT: "NOT_STARTED",
  AWAITING_SUBMISSION: "IN_PROGRESS",
  // Legacy aliases (gateway may still send these)
  APPROVED: "ASSIGNMENT_ACCEPTED",
  REJECTED: "ASSIGNMENT_REFUSED",
  // Legacy (backwards compat during rollout — remove after migration confirmed)
  COMMITTED: "PENDING_APPROVAL",
};

function normalizeStatus(raw: RawStudentCommitment): string {
  const rawStatus =
    raw.commitment_status ??
    raw.content?.commitment_status ??
    raw.on_chain_status ??
    "PENDING_APPROVAL";
  return STATUS_MAP[rawStatus] ?? rawStatus;
}

// =============================================================================
// Transform
// =============================================================================

function transformStudentCommitment(
  raw: RawStudentCommitment,
  fallbackCourseId: string,
): StudentCommitmentSummary {
  const source =
    raw.source === "chain_only" || raw.source === "db_only"
      ? raw.source
      : "merged";

  return {
    courseId: raw.course_id ?? fallbackCourseId,
    moduleCode: raw.course_module_code ?? "",
    sltHash: raw.slt_hash ?? null,
    networkStatus: normalizeStatus(raw),
    source,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/** Status priority: higher index = higher priority */
const STATUS_PRIORITY: string[] = [
  "ASSIGNMENT_REFUSED",
  "IN_PROGRESS",
  "PENDING_APPROVAL",
  "ASSIGNMENT_ACCEPTED",
  "CREDENTIAL_CLAIMED",
];

/**
 * Derive a single status string for a module from its commitments.
 *
 * Priority (highest wins): ACCEPTED > PENDING_APPROVAL > CONFIRMING > REFUSED
 * Returns null when the array is empty.
 */
export function getModuleCommitmentStatus(
  commitments: StudentCommitmentSummary[],
): string | null {
  if (commitments.length === 0) return null;

  let best: string | null = null;
  let bestPriority = -1;

  for (const c of commitments) {
    const idx = STATUS_PRIORITY.indexOf(c.networkStatus);
    const priority = idx === -1 ? 0 : idx;
    if (priority > bestPriority) {
      bestPriority = priority;
      best = c.networkStatus;
    }
  }

  return best;
}

/**
 * Group commitments by module code, filtering to a specific course.
 * Prevents cross-course contamination (see #116).
 */
export function groupCommitmentsByModule(
  commitments: StudentCommitmentSummary[],
  courseId: string,
): Map<string, StudentCommitmentSummary[]> {
  const map = new Map<string, StudentCommitmentSummary[]>();
  for (const c of commitments) {
    if (c.courseId !== courseId) continue;
    const existing = map.get(c.moduleCode) ?? [];
    existing.push(c);
    map.set(c.moduleCode, existing);
  }
  return map;
}

// =============================================================================
// Shared Query Key + Fetch (reusable by useStudentCompletionsForPrereqs)
// =============================================================================

/**
 * Build the query key for student commitments for a specific course.
 * Exported so parallel-query hooks can share cache entries.
 */
export function studentCommitmentsQueryKey(courseId: string) {
  return [...courseStudentKeys.commitments(), courseId] as const;
}

/**
 * Fetch student commitments for a course (standalone function).
 * Exported so `useQueries()` callers can reuse without duplicating logic.
 */
export async function fetchStudentCommitments(
  courseId: string,
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>,
): Promise<StudentCommitmentSummary[]> {
  const response = await authenticatedFetch(
    `${GATEWAY_API_BASE}/course/student/assignment-commitments/list`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId }),
    },
  );

  // 404 means no commitments — return empty
  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch student commitments: ${response.statusText}`,
    );
  }

  const result: unknown = await response.json();

  let rawCommitments: RawStudentCommitment[];
  if (Array.isArray(result)) {
    rawCommitments = result as RawStudentCommitment[];
  } else if (result && typeof result === "object" && "data" in result) {
    const wrapped = result as {
      data?: RawStudentCommitment[];
      warning?: string;
    };
    if (wrapped.warning) {
      console.warn(
        "[useStudentCommitments] API warning:",
        wrapped.warning,
      );
    }
    rawCommitments = Array.isArray(wrapped.data) ? wrapped.data : [];
  } else {
    console.warn(
      "[useStudentCommitments] Unexpected response shape:",
      result,
    );
    rawCommitments = [];
  }

  return rawCommitments.map((r) =>
    transformStudentCommitment(r, courseId),
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Fetch all student assignment commitments for a course.
 *
 * Uses `courseStudentKeys.commitments()` so it can be invalidated alongside
 * other student queries after a new submission.
 *
 * @param courseId - Course NFT policy ID
 */
export function useStudentAssignmentCommitments(courseId: string | undefined) {
  const { isAuthenticated, authenticatedFetch } = useAndamioAuth();

  return useQuery({
    queryKey: studentCommitmentsQueryKey(courseId ?? ""),
    queryFn: () => fetchStudentCommitments(courseId ?? "", authenticatedFetch),
    enabled: isAuthenticated && !!courseId,

  });
}
