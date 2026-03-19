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
  contributor: (projectId: string) => `/tasks/${projectId}/contributor`,
} as const;

/**
 * Admin routes - require authentication + manager role
 */
export const ADMIN_ROUTES = {
  /** Project admin — manage tasks, treasury, XP distribution */
  project: "/admin/project",
} as const;

/**
 * Studio routes - require authentication + ownership/role
 * Single-course, single-project app — no dynamic IDs in URLs.
 */
export const STUDIO_ROUTES = {
  /** Studio hub — redirects to courseEditor */
  hub: "/studio",

  /** Course studio */
  courseEditor: "/studio/course",
  moduleWizard: (moduleCode: string) => `/studio/course/${moduleCode}`,
  teacherDashboard: "/studio/course/teacher",
  manageLearners: "/studio/course/manage-learners",

  /** Project studio */
  projectDashboard: "/studio/project",
  commitments: "/studio/project/commitments",
  draftTasks: "/studio/project/draft-tasks",
  newTask: "/studio/project/draft-tasks/new",
  editTask: (taskIndex: number) => `/studio/project/draft-tasks/${taskIndex}`,
  manageContributors: "/studio/project/manage-contributors",
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

