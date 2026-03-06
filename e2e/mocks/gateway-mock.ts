/**
 * Gateway API Mock for E2E Testing
 *
 * Provides mock responses for the Andamio Gateway API
 * to enable fully isolated E2E testing without real API calls.
 */

import type { Page, Route } from "@playwright/test";

// Mock user data
export interface MockUser {
  id: string;
  cardanoBech32Addr: string;
  accessTokenAlias: string | null;
}

// Mock JWT payload
export interface MockJWTPayload {
  userId: string;
  cardanoBech32Addr: string;
  accessTokenAlias?: string;
  iat: number;
  exp: number;
}

// Mock course data
export interface MockCourse {
  id: string;
  title: string;
  description: string;
  policyId: string;
  status: "draft" | "published";
  modules: MockModule[];
}

// Mock module data
export interface MockModule {
  id: string;
  title: string;
  order: number;
  lessons: MockLesson[];
  assignments: MockAssignment[];
}

// Mock lesson data
export interface MockLesson {
  id: string;
  title: string;
  content: string;
  order: number;
}

// Mock assignment data
export interface MockAssignment {
  id: string;
  title: string;
  description: string;
  order: number;
  slt: string;
}

// Mock transaction response
export interface MockTxResponse {
  unsignedTx: string;
  txHash?: string;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Default mock data
 */
export const MOCK_DATA = {
  user: {
    id: "mock-user-id-123",
    cardanoBech32Addr:
      "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
    accessTokenAlias: null,
  } as MockUser,

  userWithToken: {
    id: "mock-user-id-123",
    cardanoBech32Addr:
      "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
    accessTokenAlias: "TestAlias",
  } as MockUser,

  courses: [
    {
      id: "course-1",
      title: "Introduction to Cardano",
      description: "Learn the basics of Cardano blockchain",
      policyId: "policy-id-1",
      status: "published",
      modules: [
        {
          id: "module-1",
          title: "Getting Started",
          order: 1,
          lessons: [
            {
              id: "lesson-1",
              title: "What is Cardano?",
              content: "Cardano is a proof-of-stake blockchain...",
              order: 1,
            },
          ],
          assignments: [
            {
              id: "assignment-1",
              title: "First Assignment",
              description: "Complete your first Cardano task",
              order: 1,
              slt: "SLT_001",
            },
          ],
        },
      ],
    },
  ] as MockCourse[],

  nonce: "mock-nonce-" + Date.now().toString(36),
};

/**
 * Generate a mock JWT token
 */
export function generateMockJWT(user: MockUser, expiresInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MockJWTPayload = {
    userId: user.id,
    cardanoBech32Addr: user.cardanoBech32Addr,
    accessTokenAlias: user.accessTokenAlias ?? undefined,
    iat: now,
    exp: now + expiresInSeconds,
  };

  // Create a mock JWT (not cryptographically valid, but parseable)
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = btoa("mock-signature");

  return `${header}.${payloadStr}.${signature}`;
}

/**
 * Gateway API route handlers
 */
const routeHandlers: Record<string, (route: Route, mockData: typeof MOCK_DATA) => Promise<void>> = {
  // Auth endpoints
  "**/auth/login/session": async (route, mockData) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        nonce: mockData.nonce,
      }),
    });
  },

  "**/auth/login/validate": async (route, mockData) => {
    const jwt = generateMockJWT(mockData.user);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jwt,
        user: mockData.user,
      }),
    });
  },

  "**/auth/login": async (route, mockData) => {
    // Check if request has access token indicator
    const request = route.request();
    const postData = request.postData();
    const hasToken = postData?.includes("access_token");

    const user = hasToken ? mockData.userWithToken : mockData.user;
    const jwt = generateMockJWT(user);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jwt,
        user,
      }),
    });
  },

  // Course endpoints
  "**/course/user/courses/list": async (route, mockData) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockData.courses),
    });
  },

  "**/course/user/course/*": async (route, mockData) => {
    const url = route.request().url();
    const courseId = url.split("/").pop();
    const course = mockData.courses.find((c) => c.id === courseId) || mockData.courses[0];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(course),
    });
  },

  // Transaction endpoints
  "**/tx/build/**": async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        unsignedTx: "mock-unsigned-tx-" + Date.now().toString(36),
        fee: "200000",
      }),
    });
  },

  "**/tx/submit": async (route) => {
    const txHash = "mock-tx-hash-" + Math.random().toString(36).substring(2, 15);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        txHash,
        status: "submitted",
      }),
    });
  },

  "**/tx/status/*": async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "confirmed",
        confirmations: 3,
      }),
    });
  },

  // Batch status endpoint
  "**/tx/batch-status": async (route) => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || "{}") as { txHashes?: string[] };
    const txHashes = postData.txHashes || [];

    const statuses = txHashes.reduce(
      (acc, hash) => {
        acc[hash] = { status: "confirmed", confirmations: 3 };
        return acc;
      },
      {} as Record<string, { status: string; confirmations: number }>
    );

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(statuses),
    });
  },

  // User endpoints
  "**/user/access-token-alias": async (route, mockData) => {
    const jwt = generateMockJWT(mockData.userWithToken);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: mockData.userWithToken,
        jwt,
      }),
    });
  },
};

/**
 * Setup Gateway API mocking for a page
 */
export async function setupGatewayMock(
  page: Page,
  options: {
    /** Override default mock data */
    mockData?: Partial<typeof MOCK_DATA>;
    /** Additional custom route handlers */
    customHandlers?: Record<string, (route: Route) => Promise<void>>;
    /** Gateway base URL pattern (default: **\/api\/**) */
    baseUrlPattern?: string;
  } = {}
): Promise<void> {
  const mockData = {
    ...MOCK_DATA,
    ...options.mockData,
  };

  const basePattern = options.baseUrlPattern ?? "**/api/**";

  // Setup route interception for all API routes
  await page.route(basePattern, async (route) => {
    const url = route.request().url();

    // Check custom handlers first
    if (options.customHandlers) {
      for (const [pattern, handler] of Object.entries(options.customHandlers)) {
        if (url.includes(pattern) || new RegExp(pattern.replace(/\*/g, ".*")).test(url)) {
          await handler(route);
          return;
        }
      }
    }

    // Check built-in handlers
    for (const [pattern, handler] of Object.entries(routeHandlers)) {
      const regexPattern = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
      if (new RegExp(regexPattern).test(url)) {
        await handler(route, mockData);
        return;
      }
    }

    // Fallback: continue with real request (or return 404 for strict mocking)
    await route.continue();
  });
}

/**
 * Mock a specific transaction flow
 */
export async function mockTransactionFlow(
  page: Page,
  options: {
    /** Transaction type for logging */
    txType: string;
    /** Simulate transaction failure */
    shouldFail?: boolean;
    /** Failure error message */
    errorMessage?: string;
    /** Delay before response (ms) */
    delay?: number;
  }
): Promise<void> {
  const { shouldFail = false, errorMessage = "Transaction failed", delay = 0 } = options;

  // Override transaction endpoints with custom behavior
  await page.route("**/tx/build/**", async (route) => {
    if (delay) await new Promise((r) => setTimeout(r, delay));

    if (shouldFail) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: errorMessage }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          unsignedTx: `mock-unsigned-tx-${options.txType}-${Date.now()}`,
          fee: "200000",
        }),
      });
    }
  });

  await page.route("**/tx/submit", async (route) => {
    if (delay) await new Promise((r) => setTimeout(r, delay));

    if (shouldFail) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: errorMessage }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          txHash: `mock-tx-hash-${options.txType}-${Date.now()}`,
          status: "submitted",
        }),
      });
    }
  });
}

/**
 * Wait for a mocked API call to complete
 */
export async function waitForMockedApiCall(page: Page, urlPattern: string, timeout = 10000): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      const regexPattern = urlPattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
      return new RegExp(regexPattern).test(url);
    },
    { timeout }
  );
}

/**
 * Clear all route handlers
 */
export async function clearGatewayMock(page: Page): Promise<void> {
  await page.unrouteAll();
}
