export type AssignmentStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_APPROVAL"
  | "ASSIGNMENT_ACCEPTED"
  | "ASSIGNMENT_DENIED"
  | "CREDENTIAL_CLAIMED"
  | "UNKNOWN";

const STATUS_ALIASES: Record<string, AssignmentStatus> = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_SUBMISSION: "IN_PROGRESS",
  DRAFT: "IN_PROGRESS",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ASSIGNMENT_ACCEPTED: "ASSIGNMENT_ACCEPTED",
  ASSIGNMENT_DENIED: "ASSIGNMENT_DENIED",
  ASSIGNMENT_REFUSED: "ASSIGNMENT_DENIED",
  CREDENTIAL_CLAIMED: "CREDENTIAL_CLAIMED",
  ASSIGNMENT_LEFT: "NOT_STARTED",
  LEFT: "NOT_STARTED",
  // Andamioscan on-chain status values (for source: "chain_only" responses)
  COMPLETED: "CREDENTIAL_CLAIMED",
  CURRENT: "IN_PROGRESS",
  PENDING: "PENDING_APPROVAL",
  // Legacy (remove after migration confirmed)
  COMMITTED: "PENDING_APPROVAL",
  SAVE_FOR_LATER: "IN_PROGRESS",
  COMMITMENT: "IN_PROGRESS",
  NETWORK_READY: "IN_PROGRESS",
};

export function normalizeAssignmentStatus(
  rawStatus: string | null | undefined
): AssignmentStatus {
  if (!rawStatus) return "NOT_STARTED";

  const normalized = rawStatus.toUpperCase();

  if (normalized.includes("PENDING_TX")) {
    return "IN_PROGRESS";
  }

  const aliasedStatus = STATUS_ALIASES[normalized];
  if (aliasedStatus) {
    return aliasedStatus;
  }

  return "UNKNOWN";
}

export function isCompletedStatus(status: AssignmentStatus): boolean {
  return status === "ASSIGNMENT_ACCEPTED" || status === "CREDENTIAL_CLAIMED";
}

export function isClaimableStatus(status: AssignmentStatus): boolean {
  return status === "ASSIGNMENT_ACCEPTED";
}
