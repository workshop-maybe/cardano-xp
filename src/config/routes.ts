/**
 * Route Configuration
 *
 * Centralized route definitions with metadata.
 * Use these constants instead of hardcoding paths.
 */

/**
 * Public routes - accessible without authentication
 */
export const PUBLIC_ROUTES = {
  /** Landing page */
  home: "/",

  /** Course routes — single-course app, no courseId in URL */
  courses: "/learn",
  module: (moduleCode: string) => `/learn/${moduleCode}`,
  lesson: (moduleCode: string, lessonIndex: number) =>
    `/learn/${moduleCode}/${lessonIndex}`,
  assignment: (moduleCode: string) =>
    `/learn/${moduleCode}/assignment`,

  /** Task routes — single-project app, no projectId in URL */
  projects: "/tasks",
  task: (taskHash: string) => `/tasks/${taskHash}`,

  /** XP leaderboard */
  leaderboard: "/xp/leaderboard",

  /** Sponsor pitch + donation */
  sponsors: "/sponsors",
  /** Public treasury transparency */
  transparency: "/transparency",

  /** Utility routes */
  sitemap: "/sitemap",
  components: "/components",
  editor: "/editor",
  apiSetup: "/api-setup",
} as const;

/**
 * Authenticated routes - require wallet connection
 */
export const AUTH_ROUTES = {
  /** User dashboard */
  dashboard: "/dashboard",

  /** Credentials */
  credentials: "/credentials",

  /** Contributor workflow */
  contributor: "/contributor",
} as const;

/**
 * Admin routes — require authentication + owner/manager role.
 * Single-course, single-project app — no dynamic IDs in URLs.
 */
export const ADMIN_ROUTES = {
  /** Admin hub — redirects to courseEditor */
  hub: "/admin",

  /** Course admin */
  courseEditor: "/admin/course",
  moduleWizard: (moduleCode: string) => `/admin/course/${moduleCode}`,
  teacherDashboard: "/admin/course/teacher",
  manageLearners: "/admin/course/manage-learners",

  /** Project admin */
  projectDashboard: "/admin/project",
  treasury: "/admin/project/treasury",
  commitments: "/admin/project/commitments",
  draftTasks: "/admin/project/draft-tasks",
  newTask: "/admin/project/draft-tasks/new",
  editTask: (taskIndex: number) => `/admin/project/draft-tasks/${taskIndex}`,
  manageContributors: "/admin/project/manage-contributors",
} as const;


/**
 * API routes
 */
export const API_ROUTES = {
  /** Gateway proxy */
  gateway: "/api/gateway",
  /** tRPC handler */
  trpc: "/api/trpc",
} as const;

