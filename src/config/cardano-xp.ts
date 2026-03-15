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
    course: `/course/${env.NEXT_PUBLIC_COURSE_ID}`,
    project: `/project/${env.NEXT_PUBLIC_PROJECT_ID}`,
  },
} as const;
