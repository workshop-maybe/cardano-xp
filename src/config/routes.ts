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

  /** Course routes */
  courses: "/learn",
  courseDetail: (courseId: string) => `/learn/${courseId}`,
  moduleDetail: (courseId: string, moduleCode: string) =>
    `/learn/${courseId}/${moduleCode}`,
  lessonDetail: (courseId: string, moduleCode: string, lessonIndex: number) =>
    `/learn/${courseId}/${moduleCode}/${lessonIndex}`,
  assignment: (courseId: string, moduleCode: string) =>
    `/learn/${courseId}/${moduleCode}/assignment`,

  /** Project routes */
  projects: "/tasks",
  projectDetail: (projectId: string) => `/tasks/${projectId}`,
  taskDetail: (projectId: string, taskHash: string) =>
    `/tasks/${projectId}/${taskHash}`,

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
 * Studio routes - require authentication + ownership/role
 */
export const STUDIO_ROUTES = {
  /** Studio hub */
  hub: "/studio",

  /** Course studio */
  courses: "/studio/course",
  courseEditor: (courseId: string) => `/studio/course/${courseId}`,
  moduleWizard: (courseId: string, moduleCode: string) =>
    `/studio/course/${courseId}/${moduleCode}`,
  teacherDashboard: (courseId: string) =>
    `/studio/course/${courseId}/teacher`,

  /** Project studio */
  projects: "/studio/project",
  projectDashboard: (projectId: string) => `/studio/project/${projectId}`,
  projectManager: (projectId: string) => `/studio/project/${projectId}/manager`,
  commitments: (projectId: string) =>
    `/studio/project/${projectId}/commitments`,
  draftTasks: (projectId: string) => `/studio/project/${projectId}/draft-tasks`,
  newTask: (projectId: string) => `/studio/project/${projectId}/draft-tasks/new`,
  editTask: (projectId: string, taskIndex: number) =>
    `/studio/project/${projectId}/draft-tasks/${taskIndex}`,
  treasury: (projectId: string) =>
    `/studio/project/${projectId}/manage-treasury`,
  manageContributors: (projectId: string) =>
    `/studio/project/${projectId}/manage-contributors`,
  manageLearners: (courseId: string) =>
    `/studio/course/${courseId}/manage-learners`,
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

