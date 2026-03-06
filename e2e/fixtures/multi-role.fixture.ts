/**
 * Multi-Role Fixture for E2E Testing
 *
 * Provides pre-configured page contexts for different user roles:
 * - Student: Can enroll in courses, submit assignments, claim credentials
 * - Teacher: Can assess assignments, manage course content
 * - Owner: Can create courses, manage teachers, publish modules
 *
 * Each role has its own browser context with appropriate wallet and auth state.
 */

import { test as base, type Page, type BrowserContext } from "@playwright/test";
import {
  injectMockWallet,
  type MockWalletConfig,
  createMockWalletConfig,
} from "../mocks/mesh-wallet-mock";
import { setupGatewayMock, generateMockJWT, type MockUser } from "../mocks/gateway-mock";
import {
  MockLedger,
  WALLET_PRESETS,
  type MockUTXO,
} from "../mocks/mock-ledger";

// Role definitions
export type UserRole = "student" | "teacher" | "owner" | "unauthenticated";

// Role configuration
export interface RoleConfig {
  alias: string;
  address: string;
  addressHex: string;
  accessTokenPolicyId: string;
  hasAccessToken: boolean;
  additionalAssets?: Array<{ policyId: string; assetName: string }>;
}

// Default test addresses (preprod format)
const TEST_ADDRESSES = {
  student: {
    bech32: "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
    hex: "00a4918d9a0bf9c6b77b85d8b2f4c5c5f0e8a3b1d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0",
  },
  teacher: {
    bech32: "addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7",
    hex: "005ce5f2f1d2a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4",
  },
  owner: {
    bech32: "addr_test1qr0c3frkem9cqn5f73dnvqpena27k2fgqew6wct9eaka03agfvkyvnjxqc8c4y65m2r7en39u2wy8vt6fkh7c7dwyads0ylyqx",
    hex: "00df88a476cedc80a74f68b66c00e67eabd6549038ed38b0b9cdb75f1ea125963265312063153526a51be67262e538e2c5e936bf63c6b893ad",
  },
};

// Test policy IDs (mock values for preprod)
const TEST_POLICIES = {
  accessToken: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  courseNft: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
  courseState: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
};

// Default role configurations
const DEFAULT_ROLE_CONFIGS: Record<Exclude<UserRole, "unauthenticated">, RoleConfig> = {
  student: {
    alias: "TestStudent",
    address: TEST_ADDRESSES.student.bech32,
    addressHex: TEST_ADDRESSES.student.hex,
    accessTokenPolicyId: TEST_POLICIES.accessToken,
    hasAccessToken: true,
  },
  teacher: {
    alias: "TestTeacher",
    address: TEST_ADDRESSES.teacher.bech32,
    addressHex: TEST_ADDRESSES.teacher.hex,
    accessTokenPolicyId: TEST_POLICIES.accessToken,
    hasAccessToken: true,
  },
  owner: {
    alias: "TestOwner",
    address: TEST_ADDRESSES.owner.bech32,
    addressHex: TEST_ADDRESSES.owner.hex,
    accessTokenPolicyId: TEST_POLICIES.accessToken,
    hasAccessToken: true,
    additionalAssets: [
      { policyId: TEST_POLICIES.courseNft, assetName: "TestCourse" },
    ],
  },
};

// Extended fixtures
interface MultiRoleFixtures {
  /** Shared mock ledger instance for transaction state */
  mockLedger: MockLedger;

  /** Page configured as a student */
  studentPage: Page;

  /** Page configured as a teacher */
  teacherPage: Page;

  /** Page configured as a course owner */
  ownerPage: Page;

  /** Helper to create a page with a specific role */
  createRolePage: (role: UserRole, config?: Partial<RoleConfig>) => Promise<Page>;

  /** Helper to switch roles on an existing page */
  switchRole: (page: Page, role: UserRole) => Promise<void>;

  /** Get role configuration */
  getRoleConfig: (role: Exclude<UserRole, "unauthenticated">) => RoleConfig;
}

/**
 * Create wallet config for a role
 */
function createWalletConfigForRole(role: UserRole, config?: Partial<RoleConfig>): MockWalletConfig {
  if (role === "unauthenticated") {
    return createMockWalletConfig({
      name: "MockWallet",
      address: TEST_ADDRESSES.student.bech32,
      addressHex: TEST_ADDRESSES.student.hex,
      mode: "approve",
      accessTokenUnit: undefined,
    });
  }

  const roleConfig = { ...DEFAULT_ROLE_CONFIGS[role], ...config };
  const accessTokenUnit = roleConfig.hasAccessToken
    ? roleConfig.accessTokenPolicyId + Buffer.from(roleConfig.alias).toString("hex")
    : undefined;

  return createMockWalletConfig({
    name: `${role}Wallet`,
    address: roleConfig.address,
    addressHex: roleConfig.addressHex,
    mode: "approve",
    accessTokenUnit,
  });
}

/**
 * Create mock user data for JWT (matches MockUser type from gateway-mock)
 */
function createMockUserForRole(role: UserRole, config?: Partial<RoleConfig>): MockUser | null {
  if (role === "unauthenticated") {
    return null;
  }

  const roleConfig = { ...DEFAULT_ROLE_CONFIGS[role], ...config };
  return {
    id: `mock-${role}-id-${roleConfig.alias.toLowerCase()}`,
    cardanoBech32Addr: roleConfig.address,
    accessTokenAlias: roleConfig.hasAccessToken ? roleConfig.alias : null,
  };
}

/**
 * Initialize ledger with UTXOs for a role
 */
function initializeLedgerForRole(
  ledger: MockLedger,
  role: UserRole,
  config?: Partial<RoleConfig>
): void {
  if (role === "unauthenticated") {
    return;
  }

  const roleConfig = { ...DEFAULT_ROLE_CONFIGS[role], ...config };
  let utxos: MockUTXO[];

  switch (role) {
    case "student":
      utxos = WALLET_PRESETS.authenticatedUser(
        roleConfig.address,
        roleConfig.accessTokenPolicyId,
        roleConfig.alias
      );
      break;
    case "teacher":
      utxos = WALLET_PRESETS.authenticatedUser(
        roleConfig.address,
        roleConfig.accessTokenPolicyId,
        roleConfig.alias
      );
      break;
    case "owner":
      utxos = WALLET_PRESETS.courseOwner(
        roleConfig.address,
        roleConfig.accessTokenPolicyId,
        roleConfig.alias,
        TEST_POLICIES.courseNft
      );
      break;
  }

  ledger.initializeWallet(roleConfig.address, utxos);
}

/**
 * Setup a page with role-specific configuration
 */
async function setupRolePage(
  context: BrowserContext,
  ledger: MockLedger,
  role: UserRole,
  config?: Partial<RoleConfig>
): Promise<Page> {
  const page = await context.newPage();
  const walletConfig = createWalletConfigForRole(role, config);
  const user = createMockUserForRole(role, config);

  // Inject mock wallet
  await injectMockWallet(page, walletConfig);

  // Setup gateway mock with role-appropriate responses
  await setupGatewayMock(page, {
    mockData: user ? { user } : undefined,
  });

  // Initialize ledger state for this role
  initializeLedgerForRole(ledger, role, config);

  // Inject JWT for authenticated roles
  if (user) {
    const jwt = generateMockJWT(user);
    // Store user data in the format the app expects
    const userData = {
      address: user.cardanoBech32Addr,
      alias: user.accessTokenAlias,
      accessTokenAlias: user.accessTokenAlias,
    };
    await page.addInitScript(
      ({ jwt: jwtToken, userData: userDataObj }) => {
        localStorage.setItem("andamio_jwt", jwtToken);
        localStorage.setItem("andamio-user", JSON.stringify(userDataObj));
      },
      { jwt, userData }
    );
  }

  return page;
}

/**
 * Extended test with multi-role fixtures
 *
 * Note: Each role gets its own browser context to ensure isolated localStorage/auth state.
 */
export const test = base.extend<MultiRoleFixtures>({
  /**
   * Shared mock ledger for all roles
   * Reset before each test
   */
  mockLedger: async ({}, use) => {
    const ledger = new MockLedger();
    await use(ledger);
    ledger.reset();
  },

  /**
   * Student page fixture (own context for isolated auth)
   */
  studentPage: async ({ browser, mockLedger }, use) => {
    const context = await browser.newContext();
    const page = await setupRolePage(context, mockLedger, "student");
    await use(page);
    await context.close();
  },

  /**
   * Teacher page fixture (own context for isolated auth)
   */
  teacherPage: async ({ browser, mockLedger }, use) => {
    const context = await browser.newContext();
    const page = await setupRolePage(context, mockLedger, "teacher");
    await use(page);
    await context.close();
  },

  /**
   * Owner page fixture (own context for isolated auth)
   */
  ownerPage: async ({ browser, mockLedger }, use) => {
    const context = await browser.newContext();
    const page = await setupRolePage(context, mockLedger, "owner");
    await use(page);
    await context.close();
  },

  /**
   * Helper to create a page with any role (creates new context)
   */
  createRolePage: async ({ browser, mockLedger }, use) => {
    const contexts: BrowserContext[] = [];

    const createPage = async (role: UserRole, config?: Partial<RoleConfig>) => {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await setupRolePage(context, mockLedger, role, config);
      return page;
    };

    await use(createPage);

    // Cleanup all contexts
    for (const context of contexts) {
      await context.close();
    }
  },

  /**
   * Helper to switch roles on an existing page
   *
   * IMPORTANT: Due to how addInitScript works (persists across reloads),
   * this helper does NOT reload the page. The calling test should navigate
   * to a new URL after calling switchRole for the app to pick up new auth state.
   *
   * For completely isolated role switching, use createRolePage instead.
   */
  switchRole: async ({ mockLedger }, use) => {
    await use(async (page: Page, role: UserRole, config?: Partial<RoleConfig>) => {
      // Clear existing auth via page.evaluate
      await page.evaluate(() => {
        localStorage.removeItem("andamio_jwt");
        localStorage.removeItem("andamio-jwt");
        localStorage.removeItem("andamio-user");
      });

      if (role === "unauthenticated") {
        // For unauthenticated, just clear storage - caller should navigate
        return;
      }

      const user = createMockUserForRole(role, config);
      if (user) {
        const jwt = generateMockJWT(user);
        const userData = {
          address: user.cardanoBech32Addr,
          alias: user.accessTokenAlias,
          accessTokenAlias: user.accessTokenAlias,
        };
        await page.evaluate(
          ({ jwt: jwtToken, userData: userDataObj }) => {
            localStorage.setItem("andamio_jwt", jwtToken);
            localStorage.setItem("andamio-user", JSON.stringify(userDataObj));
          },
          { jwt, userData }
        );
      }

      // Initialize ledger for new role
      initializeLedgerForRole(mockLedger, role, config);

      // Note: We don't reload here because addInitScript would overwrite our changes.
      // The caller should navigate to a new URL to pick up the new auth state.
    });
  },

  /**
   * Get configuration for a role
   */
  getRoleConfig: async ({}, use) => {
    await use((role: Exclude<UserRole, "unauthenticated">) => {
      return DEFAULT_ROLE_CONFIGS[role];
    });
  },
});

export { expect } from "@playwright/test";

// Export utilities (RoleConfig is already exported at definition)
export { TEST_ADDRESSES, TEST_POLICIES, DEFAULT_ROLE_CONFIGS };
