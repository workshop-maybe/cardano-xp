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
import { transformCourseModule, transformSLT, transformLesson, sortModulesByCode } from "~/hooks/api/course/use-course-module";
import type { ProjectDetail, Task } from "~/hooks/api/project/use-project";
import type { CourseDetail } from "~/hooks/api/course/use-course";
import type { CourseModule, SLT, Lesson } from "~/hooks/api/course/use-course-module";

/**
 * Server-side Gateway fetch utility
 *
 * Calls the Andamio Gateway API directly (not through the Next.js proxy)
 * for use in React Server Components. Returns the same transformed types
 * as the client-side hooks to ensure hydration compatibility.
 */

const GATEWAY_URL = env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL;
const API_KEY = env.ANDAMIO_API_KEY;

/** Validate a URL path segment to prevent path traversal */
function safePath(segment: string): string {
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(segment)) {
    throw new Error(`Invalid path segment: ${segment}`);
  }
  return segment;
}

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

/**
 * Fetch SLTs for a module (server-side)
 * Matches: useSLTs(courseId, moduleCode) from use-course-content.ts
 */
export async function fetchSLTs(courseId: string, moduleCode: string): Promise<SLT[]> {
  const response = await gatewayFetch(`/course/user/slts/${safePath(courseId)}/${safePath(moduleCode)}`);

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Failed to fetch SLTs: ${response.statusText}`);

  const result = (await response.json()) as unknown;

  let rawSlts: unknown[];
  if (Array.isArray(result)) {
    rawSlts = result;
  } else if (result && typeof result === "object" && "data" in result) {
    const dataValue = (result as { data?: unknown }).data;
    if (Array.isArray(dataValue)) {
      rawSlts = dataValue;
    } else if (dataValue && typeof dataValue === "object" && "slts" in dataValue) {
      const sltsValue = (dataValue as { slts?: unknown }).slts;
      rawSlts = Array.isArray(sltsValue) ? sltsValue : [];
    } else {
      rawSlts = [];
    }
  } else {
    rawSlts = [];
  }

  return rawSlts.map((raw) => transformSLT(raw as Record<string, unknown>));
}

/**
 * Fetch a single lesson (server-side)
 * Matches: useLesson(courseId, moduleCode, sltIndex) from use-course-content.ts
 */
export async function fetchLesson(courseId: string, moduleCode: string, sltIndex: number): Promise<Lesson | null> {
  if (!Number.isFinite(sltIndex) || sltIndex < 0) return null;
  const response = await gatewayFetch(`/course/user/lesson/${safePath(courseId)}/${safePath(moduleCode)}/${sltIndex}`);

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch lesson: ${response.statusText}`);

  const result = (await response.json()) as unknown;

  let raw: Record<string, unknown> | null = null;
  if (result && typeof result === "object") {
    if ("data" in result && (result as { data?: unknown }).data) {
      raw = (result as { data: Record<string, unknown> }).data;
    } else if (
      "title" in result ||
      "content_json" in result ||
      "slt_index" in result ||
      "content" in result
    ) {
      raw = result as Record<string, unknown>;
    }
  }

  return raw ? transformLesson(raw) : null;
}
