import "server-only";

import { env } from "~/env";
import type {
  MergedProjectDetailResponse,
  MergedTasksResponse,
  MergedTaskListItem,
  MergedCourseDetailResponse,
} from "~/types/generated/gateway";
import type { MergedCourseModulesResponse } from "~/types/generated/gateway";
import { transformProjectDetail, transformMergedTask } from "~/hooks/api/project/use-project";
import { transformCourseDetail } from "~/hooks/api/course/use-course";
import { transformCourseModule, sortModulesByCode } from "~/hooks/api/course/use-course-module";
import type { ProjectDetail, Task } from "~/hooks/api/project/use-project";
import type { CourseDetail } from "~/hooks/api/course/use-course";
import type { CourseModule } from "~/hooks/api/course/use-course-module";

/**
 * Server-side Gateway fetch utility
 *
 * Calls the Andamio Gateway API directly (not through the Next.js proxy)
 * for use in React Server Components. Returns the same transformed types
 * as the client-side hooks to ensure hydration compatibility.
 */

const GATEWAY_URL = env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL;
const API_KEY = env.ANDAMIO_API_KEY;

async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GATEWAY_URL}/api/v2${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Accept: "application/json;charset=utf-8",
      "X-API-Key": API_KEY,
      ...init?.headers,
    },
  });
}

/**
 * Fetch project detail (server-side)
 * Matches: useProject(projectId) from use-project.ts
 */
export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  const response = await gatewayFetch(`/project/user/project/${projectId}`);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch project: ${response.statusText}`);

  const result = (await response.json()) as MergedProjectDetailResponse;
  if (!result.data) return null;

  return transformProjectDetail(result.data);
}

/**
 * Fetch project tasks (server-side)
 * Matches: useProjectTasks(projectId) from use-project.ts
 */
export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const response = await gatewayFetch("/project/user/tasks/list", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId }),
  });

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.statusText}`);

  const result = (await response.json()) as MergedTasksResponse | MergedTaskListItem[];

  let items: MergedTaskListItem[];
  if (Array.isArray(result)) {
    items = result;
  } else {
    items = result.data ?? [];
  }

  return items.map(transformMergedTask);
}

/**
 * Fetch course detail (server-side)
 * Matches: useCourse(courseId) from use-course.ts
 */
export async function fetchCourseDetail(courseId: string): Promise<CourseDetail | null> {
  const response = await gatewayFetch(`/course/user/course/get/${courseId}`);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch course: ${response.statusText}`);

  const result = (await response.json()) as MergedCourseDetailResponse;
  if (!result.data) return null;

  return transformCourseDetail(result.data);
}

/**
 * Fetch course modules (server-side)
 * Matches: useCourseModules(courseId) from use-course-module.ts
 */
export async function fetchCourseModules(courseId: string): Promise<CourseModule[]> {
  const response = await gatewayFetch(`/course/user/modules/${courseId}`);

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Failed to fetch modules: ${response.statusText}`);

  const result = (await response.json()) as MergedCourseModulesResponse;
  const modules = (result.data ?? []).map(transformCourseModule);
  return sortModulesByCode(modules);
}
