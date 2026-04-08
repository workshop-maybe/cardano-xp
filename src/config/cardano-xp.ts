import { env } from "~/env";
import { PUBLIC_ROUTES } from "./routes";

/**
 * Cardano XP — single course and project for this app.
 *
 * This app is not a general-purpose Andamio instance.
 * It serves one course and one project, configured via env vars.
 */
export const CARDANO_XP = {
  courseId: env.NEXT_PUBLIC_COURSE_ID,
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  /** Shorthand for the two main public routes. Derived from routes.ts. */
  routes: {
    course: PUBLIC_ROUTES.courses,
    project: PUBLIC_ROUTES.projects,
  },
  /** XP token identity on-chain */
  xpToken: {
    policyId: env.NEXT_PUBLIC_XP_POLICY_ID,
    assetName: "5850", // hex-encoded "XP"
    displayName: "XP",
  },
  /** Fixed ADA reward per task (2.5 ADA in lovelace) */
  fixedAdaPerTask: 2_500_000,
  /** Project wallet — public address for transparency and donations */
  projectWallet: {
    address: "addr_test1qzwnfx02qcss3uhktdk274nczndtp6ckdr45ukqhf0j2fjpqhthudm3knhnchrt8q2mcr5sex4gjwwhy99cs4d25q06q7xevf8",
    // mainnet: addr1qy39w3tupmhly3uw6lnp00pmkhyaa65x50vdkjd6yeykcnk5yd9w4hefkapj7zrcnvfq4drz0d2m26yvrpcythkf6ljq83edtg
  },
} as const;
