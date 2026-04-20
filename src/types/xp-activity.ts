/**
 * Shared types for the XP activity dashboard API and client components.
 * Imported by src/lib/xp-activity.ts, the /api/xp-activity route, and both
 * surfaces that render activity data (landing strip + /xp/activity page).
 */

export interface RecentAcceptedEntry {
  /** On-chain alias of the submitter. Untrusted; render via JSX escaping only. */
  alias: string;
  /** XP awarded for this submission's task. */
  xpEarned: number;
  /** On-chain slot when the submission was posted. 0 if unavailable. */
  slot: number;
  /** ISO 8601 timestamp derived from slot + network. null if slot is missing/invalid
   *  or the network isn't supported. Kept as a string so the shape is identical
   *  whether hydrated via SuperJSON (server prefetch) or parsed from JSON (client refetch). */
  date: string | null;
  /** On-chain task hash. Used to keep React keys unique when one alias has
   *  multiple accepted submissions in the same slot. */
  taskHash: string;
}

export interface ActivityStats {
  /** Distinct aliases with XP > 0. */
  contributors: number;
  /** Count of accepted commitments (primary) or submissions whose task has any accepted assessment (fallback). */
  tasksCompleted: number;
  /** Sum of XP awarded across accepted work. */
  xpReleased: number;
  /** Fixed protocol supply. */
  xpTotalSupply: number;
  /** Count of assessments not (yet) in an ACCEPTED state. */
  pendingReviews: number;
  /** Up to 10 most-recent accepted submissions, slot-descending. */
  recentAccepted: RecentAcceptedEntry[];
}

export interface ActivityErrorResponse {
  error: string;
  details?: string;
}
