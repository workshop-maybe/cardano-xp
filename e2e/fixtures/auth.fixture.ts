/**
 * Auth Fixture for E2E Testing
 *
 * Provides pre-authenticated test state for tests that don't need
 * to test the authentication flow itself.
 */

import { test as base, type Page } from "@playwright/test";
import {
  injectMockWallet,
  type MockWalletConfig,
  DEFAULT_MOCK_WALLET,
  MOCK_WALLET_WITH_TOKEN,
} from "../mocks/mesh-wallet-mock";
import { setupGatewayMock, MOCK_DATA, generateMockJWT } from "../mocks/gateway-mock";

// Extended test fixtures
interface AuthFixtures {
  /** Page with mock wallet and API already set up */
  authenticatedPage: Page;

  /** Page with mock wallet that has an access token */
  authenticatedPageWithToken: Page;

  /** Page with unauthenticated state (wallet connected but not signed) */
  connectedPage: Page;

  /** Helper to inject JWT directly into localStorage */
  injectJWT: (page: Page, user?: typeof MOCK_DATA.user) => Promise<void>;

  /** Helper to clear auth state */
  clearAuth: (page: Page) => Promise<void>;
}

// Wallet fixture options
interface WalletFixtureOptions {
  walletConfig?: MockWalletConfig;
  autoAuthenticate?: boolean;
  hasAccessToken?: boolean;
}

/**
 * Inject a mock JWT directly into localStorage
 * This bypasses the authentication flow for faster test setup
 *
 * IMPORTANT: The app uses "andamio_jwt" (underscore) as the storage key
 */
async function injectJWTToStorage(page: Page, user = MOCK_DATA.user): Promise<void> {
  const jwt = generateMockJWT(user);

  await page.addInitScript(
    ({ jwt: jwtToken, user: userData }) => {
      // Store JWT in localStorage (matching the app's storage key - uses underscore!)
      localStorage.setItem("andamio_jwt", jwtToken);

      // Also store user data if the app uses it
      localStorage.setItem("andamio-user", JSON.stringify(userData));
    },
    { jwt, user }
  );
}

/**
 * Clear all auth-related storage
 * NOTE: The app uses "andamio_jwt" (underscore) - must clear both variants for safety
 */
async function clearAuthStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Clear BOTH variants to handle any inconsistencies
    localStorage.removeItem("andamio_jwt");   // Correct key (underscore)
    localStorage.removeItem("andamio-jwt");   // Legacy/incorrect variant (hyphen)
    localStorage.removeItem("andamio-user");
    sessionStorage.clear();
  });
}

/**
 * Setup a page with wallet and API mocking
 */
async function setupMockedPage(page: Page, options: WalletFixtureOptions = {}): Promise<void> {
  const { walletConfig = DEFAULT_MOCK_WALLET, autoAuthenticate = false, hasAccessToken = false } = options;

  // Use wallet with token if requested
  const effectiveWalletConfig = hasAccessToken ? { ...MOCK_WALLET_WITH_TOKEN, ...walletConfig } : walletConfig;

  // Inject mock wallet before page loads
  await injectMockWallet(page, effectiveWalletConfig);

  // Setup API mocking
  await setupGatewayMock(page, {
    mockData: hasAccessToken ? { user: MOCK_DATA.userWithToken } : undefined,
  });

  // Inject JWT for pre-authenticated tests
  if (autoAuthenticate) {
    const user = hasAccessToken ? MOCK_DATA.userWithToken : MOCK_DATA.user;
    await injectJWTToStorage(page, user);
  }
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated page fixture
   * - Mock wallet injected and "connected"
   * - Mock API responses configured
   * - JWT pre-injected in localStorage
   * - Ready for testing authenticated features
   */
  authenticatedPage: async ({ page }, use) => {
    await setupMockedPage(page, {
      autoAuthenticate: true,
      hasAccessToken: false,
    });

    await use(page);
  },

  /**
   * Authenticated page with access token
   * - Same as authenticatedPage but with access token in wallet
   * - User has accessTokenAlias in JWT
   */
  authenticatedPageWithToken: async ({ page }, use) => {
    await setupMockedPage(page, {
      autoAuthenticate: true,
      hasAccessToken: true,
    });

    await use(page);
  },

  /**
   * Connected but not authenticated page
   * - Mock wallet injected
   * - Mock API responses configured
   * - No JWT (user needs to authenticate)
   */
  connectedPage: async ({ page }, use) => {
    await setupMockedPage(page, {
      autoAuthenticate: false,
      hasAccessToken: false,
    });

    await use(page);
  },

  /**
   * Helper to inject JWT into any page
   */
  injectJWT: async ({}, use) => {
    await use(async (page: Page, user = MOCK_DATA.user) => {
      await injectJWTToStorage(page, user);
    });
  },

  /**
   * Helper to clear auth state
   */
  clearAuth: async ({}, use) => {
    await use(async (page: Page) => {
      await clearAuthStorage(page);
    });
  },
});

/**
 * Export expect for assertions
 */
export { expect } from "@playwright/test";

/**
 * Test configuration presets
 */
export const testPresets = {
  /**
   * Fast tests that skip authentication
   * Use for testing features after login
   */
  authenticated: {
    use: {
      // Skip authentication flow
      storageState: undefined,
    },
  },

  /**
   * Full flow tests including authentication
   * Use for testing the complete user journey
   */
  fullFlow: {
    use: {
      // No pre-set storage state
      storageState: undefined,
    },
  },

  /**
   * Visual regression tests
   */
  visual: {
    use: {
      // Disable animations for consistent screenshots
      launchOptions: {
        args: ["--disable-animations"],
      },
    },
  },
};

/**
 * Test helpers
 */
export const testHelpers = {
  /**
   * Wait for the app to be fully loaded
   */
  async waitForAppReady(page: Page): Promise<void> {
    // Wait for DOM content to load (networkidle hangs on Next.js apps with pending API calls)
    await page.waitForLoadState("domcontentloaded");

    // Wait for main content to be visible
    await page.waitForSelector("main", { state: "visible", timeout: 10000 }).catch(() => {
      // Main may not be visible on some pages - this is acceptable
    });
  },

  /**
   * Wait for authentication state to be established
   */
  async waitForAuthState(page: Page, authenticated: boolean): Promise<void> {
    if (authenticated) {
      // Wait for auth status indicator showing authenticated
      await page.waitForSelector('text="Auth"', { state: "visible", timeout: 10000 });
    } else {
      // Wait for unauthenticated state
      await page.waitForSelector('text="Unauth"', { state: "visible", timeout: 10000 });
    }
  },

  /**
   * Navigate and wait for page to be ready
   */
  async navigateTo(page: Page, path: string): Promise<void> {
    await page.goto(path);
    await testHelpers.waitForAppReady(page);
  },
};
