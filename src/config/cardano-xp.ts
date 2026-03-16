import { env } from "~/env";

/**
 * Cardano XP — single course and project for this app.
 *
 * This app is not a general-purpose Andamio instance.
 * It serves one course and one project, configured via env vars.
 */
export const CARDANO_XP = {
  courseId: env.NEXT_PUBLIC_COURSE_ID,
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  routes: {
    course: `/learn`,
    project: `/tasks`,
  },
  /** XP token identity on-chain */
  xpToken: {
    policyId: env.NEXT_PUBLIC_XP_POLICY_ID,
    assetName: "5850", // hex-encoded "XP"
    displayName: "XP",
  },
  /** Fixed ADA reward per task (2.5 ADA in lovelace) */
  fixedAdaPerTask: 2_500_000,
} as const;
