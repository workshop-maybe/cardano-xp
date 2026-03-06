/**
 * Unified Andamio Gateway API Client
 *
 * Single client for all Andamio API calls through the unified gateway.
 * Consolidates DB API, Andamioscan, and TX API into one interface.
 *
 * Uses the Next.js API proxy at /api/gateway which forwards to the
 * Unified Andamio API Gateway with the app's API key.
 *
 * @see /src/app/api/gateway/[...path]/route.ts - Proxy implementation
 * @see .claude/skills/audit-api-coverage/unified-api-endpoints.md - Full endpoint list
 */

export const PROXY_BASE = "/api/gateway";

// =============================================================================
// Types
// =============================================================================

/**
 * Gateway API Error
 */
export class GatewayError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

/**
 * Request options for gateway calls (excluding method and body which are handled separately)
 */
export type GatewayRequestOptions = Omit<RequestInit, "method" | "body">;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Make a GET request to the gateway
 *
 * @param path - API path (e.g., "/api/v2/courses" or "/v2/courses/{id}/details")
 * @returns Parsed JSON response
 *
 * @example
 * ```typescript
 * const courses = await gateway<CourseResponse[]>("/api/v2/course/user/courses/list");
 * ```
 */
export async function gateway<T>(path: string): Promise<T> {
  const url = `${PROXY_BASE}${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { details?: string };
    throw new GatewayError(
      `Gateway API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make a POST request to the gateway
 *
 * @param path - API path (e.g., "/api/v2/course/owner/course/create")
 * @param body - Request body (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 *
 * @example
 * ```typescript
 * const result = await gatewayPost<CourseResponse>(
 *   "/api/v2/course/owner/course/create",
 *   { title: "My Course", policy_id: "..." }
 * );
 * ```
 */
export async function gatewayPost<T>(
  path: string,
  body?: unknown,
  options?: GatewayRequestOptions
): Promise<T> {
  const url = `${PROXY_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { details?: string };
    throw new GatewayError(
      `Gateway API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make an authenticated POST request to the gateway
 *
 * @param path - API path
 * @param jwt - User JWT token
 * @param body - Request body (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 *
 * @example
 * ```typescript
 * const result = await gatewayAuthPost<CourseResponse>(
 *   "/api/v2/course/owner/course/create",
 *   userJwt,
 *   { title: "My Course", policy_id: "..." }
 * );
 * ```
 */
export async function gatewayAuthPost<T>(
  path: string,
  jwt: string,
  body?: unknown,
  options?: GatewayRequestOptions
): Promise<T> {
  const url = `${PROXY_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      ...options?.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { details?: string };
    throw new GatewayError(
      `Gateway API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make an authenticated GET request to the gateway
 *
 * @param path - API path
 * @param jwt - User JWT token
 * @returns Parsed JSON response
 *
 * @example
 * ```typescript
 * const courses = await gatewayAuth<CourseResponse[]>(
 *   "/api/v2/course/owner/courses/list",
 *   userJwt
 * );
 * ```
 */
export async function gatewayAuth<T>(path: string, jwt: string): Promise<T> {
  const url = `${PROXY_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { details?: string };
    throw new GatewayError(
      `Gateway API error: ${response.status} ${response.statusText}`,
      response.status,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if an error is a GatewayError
 */
export function isGatewayError(error: unknown): error is GatewayError {
  return error instanceof GatewayError;
}

/**
 * Check if an error is a 404 Not Found
 */
export function isNotFound(error: unknown): boolean {
  return isGatewayError(error) && error.status === 404;
}

/**
 * Check if an error is a 401 Unauthorized
 */
export function isUnauthorized(error: unknown): boolean {
  return isGatewayError(error) && error.status === 401;
}

/**
 * Check if an error is a 403 Forbidden
 */
export function isForbidden(error: unknown): boolean {
  return isGatewayError(error) && error.status === 403;
}
