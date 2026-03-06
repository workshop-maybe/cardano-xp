/**
 * Human-readable labels for commitment and task status codes.
 * Replaces the `.replace(/_/g, " ")` pattern that leaks machine strings into UI.
 */

const COMMITMENT_STATUS_LABELS: Record<string, string> = {
  AWAITING_SUBMISSION: "Awaiting Submission",
  COMMITTED: "Committed",
  SUBMITTED: "Committed", // Legacy alias (pre-v2.1.4)
  PENDING_TX_COMMIT: "Joining...",
  PENDING_TX_ASSESS: "Under Review",
  ACCEPTED: "Accepted",
  REFUSED: "Needs Revision",
  DENIED: "Denied",
  PENDING_APPROVAL: "Pending Review",
  ASSIGNMENT_ACCEPTED: "Completed",
  ASSIGNMENT_DENIED: "Needs Revision",
  CREDENTIAL_CLAIMED: "Credential Earned",
  REWARDS_CLAIMED: "Rewards Claimed",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_TX: "Publishing...",
  PUBLISHED: "Published",
  FUNDED: "Funded",
  ON_CHAIN: "Live",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

/**
 * Convert a raw commitment status code to a human-readable label.
 * Falls back to title-cased version if unknown.
 */
export function formatCommitmentStatus(status: string): string {
  return (
    COMMITMENT_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Map a commitment status to a badge variant for visual styling.
 * Extracted from tasks/[taskhash]/page.tsx for reuse across pages.
 */
export function getCommitmentStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status.includes("ACCEPTED") || status === "REWARDS_CLAIMED") return "default";
  if (status.includes("DENIED") || status.includes("REFUSED")) return "destructive";
  if (status.includes("PENDING")) return "outline";
  return "secondary";
}

/**
 * Convert a raw task status code to a human-readable label.
 * Falls back to title-cased version if unknown.
 */
export function formatTaskStatus(status: string): string {
  return (
    TASK_STATUS_LABELS[status] ??
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
