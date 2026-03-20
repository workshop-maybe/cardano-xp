/**
 * Mesh SDK Wallet Mock for E2E Testing
 *
 * Provides a mock implementation of the Mesh SDK wallet interface
 * that enables headless E2E testing without browser wallet extensions.
 *
 * Mock modes:
 * - 'approve': Auto-approve all signing requests
 * - 'reject': Simulate user rejection
 * - 'timeout': Simulate wallet timeout
 */

import type { Page } from "@playwright/test";

// Mock wallet configuration
export interface MockWalletConfig {
  /** Wallet name (e.g., "Eternl", "Nami") */
  name: string;
  /** Bech32 wallet address */
  address: string;
  /** Hex-encoded wallet address (some wallets return this) */
  addressHex?: string;
  /** Access token unit (policyId + assetName hex) */
  accessTokenUnit?: string;
  /** Signing behavior mode */
  mode: "approve" | "reject" | "timeout";
  /** Timeout duration in ms (for timeout mode) */
  timeoutMs?: number;
}

// Default mock wallet for testing
// IMPORTANT: addressHex must be the correct hex encoding of address (bech32).
// MeshCardanoBrowserWallet.getChangeAddressBech32() converts hex → bech32
// via Address.fromBytes(HexBlob(hex)).toBech32(). If these don't correspond,
// auth JWT validation will reject the session.
export const DEFAULT_MOCK_WALLET: MockWalletConfig = {
  name: "MockWallet",
  address:
    "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
  addressHex:
    "009493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc",
  mode: "approve",
};

// Mock wallet with access token
export const MOCK_WALLET_WITH_TOKEN: MockWalletConfig = {
  ...DEFAULT_MOCK_WALLET,
  accessTokenUnit:
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b254657374416c696173", // policyId + "TestAlias" hex
};

/**
 * Generate a mock signature for testing
 * Returns a valid-looking signature structure that the backend will accept in test mode
 */
function generateMockSignature(payload: string): string {
  // Create a deterministic mock signature based on the payload
  // This follows the CIP-8 signature format
  const mockKey =
    "a501010327200621582000000000000000000000000000000000000000000000000000000000deadbeef";
  const mockSig =
    "845846a201276761646472657373583900" +
    payload.slice(0, 64) +
    "a166686173686564f458";

  return JSON.stringify({
    signature: mockSig,
    key: mockKey,
  });
}

/**
 * Generate a mock signed transaction
 */
function generateMockSignedTx(unsignedTx: string): string {
  // Return the transaction with a mock witness set appended
  // In test mode, the backend accepts this without verification
  return unsignedTx + "_signed_mock";
}

/**
 * Generate a mock transaction hash
 */
function generateMockTxHash(): string {
  // Generate a random-looking but deterministic tx hash for testing
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Inject mock wallet into the page
 *
 * This replaces the useWallet hook's wallet object with a mock implementation
 * that doesn't require a browser wallet extension.
 */
export async function injectMockWallet(
  page: Page,
  config: MockWalletConfig = DEFAULT_MOCK_WALLET,
): Promise<void> {
  await page.addInitScript(
    ({ walletConfig }) => {
      // Store mock wallet config in window for access
      (
        window as unknown as { __mockWalletConfig: MockWalletConfig }
      ).__mockWalletConfig = walletConfig;

      // Create mock wallet object
      const mockWallet = {
        // Wallet identification
        name: walletConfig.name,

        // Address methods
        getChangeAddress: async () => {
          return walletConfig.addressHex ?? walletConfig.address;
        },

        getUsedAddresses: async () => {
          return [walletConfig.address];
        },

        getUnusedAddresses: async () => {
          return [];
        },

        getRewardAddresses: async () => {
          return [];
        },

        // Asset methods
        getAssets: async () => {
          if (walletConfig.accessTokenUnit) {
            return [
              {
                unit: walletConfig.accessTokenUnit,
                quantity: "1",
              },
            ];
          }
          return [];
        },

        getBalance: async () => {
          // CIP-30 requires CBOR-encoded Value. For lovelace-only, Value = coin = uint.
          // CBOR for 10000000000: major type 0 + 8-byte uint = 1b 00000002540be400
          return "1b00000002540be400";
        },

        getUtxos: async () => {
          // Return mock UTxOs for transaction building
          return [
            {
              input: {
                txHash: "0".repeat(64),
                outputIndex: 0,
              },
              output: {
                address: walletConfig.address,
                amount: [{ unit: "lovelace", quantity: "10000000000" }],
              },
            },
          ];
        },

        // Signing methods
        signData: async (payload: string, _address?: string) => {
          if (walletConfig.mode === "reject") {
            throw new Error("User rejected the signing request");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000),
            );
            throw new Error("Wallet signing timed out");
          }
          // Approve mode - return mock signature
          // Small delay to simulate user interaction
          await new Promise((resolve) => setTimeout(resolve, 100));
          return generateMockSignature(payload);
        },

        signTx: async (unsignedTx: string, _partialSign?: boolean) => {
          if (walletConfig.mode === "reject") {
            throw new Error("User rejected the transaction");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000),
            );
            throw new Error("Wallet signing timed out");
          }
          // Approve mode - return mock signed tx
          await new Promise((resolve) => setTimeout(resolve, 100));
          return generateMockSignedTx(unsignedTx);
        },

        submitTx: async (_signedTx: string) => {
          if (walletConfig.mode === "reject") {
            throw new Error("Transaction submission rejected");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000),
            );
            throw new Error("Transaction submission timed out");
          }
          // Approve mode - return mock tx hash
          await new Promise((resolve) => setTimeout(resolve, 200));
          return generateMockTxHash();
        },

        // Network methods
        getNetworkId: async () => {
          return 0; // Testnet/Preprod
        },

        // Collateral methods
        getCollateral: async () => {
          return [];
        },
      };

      // Store the mock wallet for injection
      (window as unknown as { __mockWallet: typeof mockWallet }).__mockWallet =
        mockWallet;

      // CIP-30 connector object — Mesh SDK's getInstalledWallets() scans
      // globalThis.cardano for entries with name, icon, and apiVersion.
      const cip30Connector = {
        name: walletConfig.name,
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiLz4=",
        apiVersion: "0.1.0",
        enable: async () => mockWallet,
        isEnabled: async () => true,
        supportedExtensions: [],
      };

      // Register the mock wallet in globalThis.cardano and PROTECT it
      // from being overridden by later scripts (e.g., Mesh SDK internal
      // Object.defineProperty calls that can replace window.cardano).
      //
      // writable: true — allows `window.cardano.nami = ...` (other wallets)
      // configurable: false — prevents `Object.defineProperty(window, "cardano", ...)`
      //   from replacing our object with a getter/setter or new value.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardanoObj: Record<string, any> = {
        mockwallet: cip30Connector,
      };
      Object.defineProperty(globalThis, "cardano", {
        value: cardanoObj,
        writable: true,
        enumerable: true,
        configurable: false,
      });

      // Persist wallet session so MeshProvider auto-reconnects on mount.
      // Requires ConnectWalletButton to call setPersist(true) (which it does).
      localStorage.setItem(
        "mesh-wallet-persist",
        JSON.stringify({ walletName: "mockwallet" }),
      );
    },
    { walletConfig: config },
  );
}

/**
 * Set mock wallet mode during test execution
 * Useful for testing different wallet behaviors mid-test
 */
export async function setMockWalletMode(
  page: Page,
  mode: MockWalletConfig["mode"],
): Promise<void> {
  await page.evaluate((newMode) => {
    const config = (
      window as unknown as { __mockWalletConfig: MockWalletConfig }
    ).__mockWalletConfig;
    if (config) {
      config.mode = newMode;
    }
  }, mode);
}

/**
 * Set mock wallet access token during test execution
 */
export async function setMockWalletAccessToken(
  page: Page,
  accessTokenUnit: string | undefined,
): Promise<void> {
  await page.evaluate((unit) => {
    const config = (
      window as unknown as { __mockWalletConfig: MockWalletConfig }
    ).__mockWalletConfig;
    if (config) {
      config.accessTokenUnit = unit;
    }
  }, accessTokenUnit);
}

/**
 * Create a mock wallet config with custom settings
 */
export function createMockWalletConfig(
  overrides: Partial<MockWalletConfig>,
): MockWalletConfig {
  return {
    ...DEFAULT_MOCK_WALLET,
    ...overrides,
  };
}

/**
 * Simulate wallet connection in the app
 * This triggers the same flow as clicking the wallet connect button
 */
export async function simulateWalletConnect(page: Page): Promise<void> {
  // Dispatch a custom event that the auth provider can listen for
  await page.evaluate(() => {
    const mockWallet = (window as unknown as { __mockWallet: unknown })
      .__mockWallet;
    const config = (
      window as unknown as { __mockWalletConfig: MockWalletConfig }
    ).__mockWalletConfig;

    // Dispatch wallet connected event
    window.dispatchEvent(
      new CustomEvent("mesh:wallet:connected", {
        detail: {
          wallet: mockWallet,
          name: config.name,
        },
      }),
    );
  });
}

/**
 * Connect the mock wallet through the app's UI.
 *
 * After navigating to a page behind RequireAuth, the app shows a
 * ConnectWalletGate. This helper clicks "Connect Wallet", selects the
 * mock wallet from the dialog, and waits for the auth context to
 * resolve the JWT into an authenticated session.
 *
 * Prerequisites:
 *   - injectMockWallet() was called before navigation
 *   - JWT was injected into localStorage (via injectJWTToStorage)
 *   - Gateway mock is active (auth validation routes intercepted)
 */
export async function connectMockWalletViaUI(page: Page): Promise<void> {
  // Click any visible "Connect Wallet" button. There may be multiple
  // (sidebar header + inline ConnectWalletPrompt), so use .first().
  const connectTrigger = page
    .getByRole("button", { name: "Connect Wallet" })
    .first();
  await connectTrigger.waitFor({ state: "visible", timeout: 10000 });
  await connectTrigger.click();

  // The ConnectWalletButton dialog renders wallet icons.
  // Our mock wallet's icon has alt="MockWallet".
  const mockWalletIcon = page.locator('img[alt="MockWallet"]');
  await mockWalletIcon.waitFor({ state: "visible", timeout: 5000 });
  await mockWalletIcon.click();

  // Wait for the Mesh SDK to connect and the auth context to validate
  // the stored JWT against the wallet. The page should re-render with
  // authenticated content once isAuthenticated flips to true.
  // Give React time to process state updates and re-render.
  await page.waitForTimeout(3000);
}
