/**
 * Real Wallet Integration for E2E Testing
 *
 * Uses MeshCardanoHeadlessWallet with a test mnemonic to perform
 * actual on-chain transactions during E2E tests.
 *
 * IMPORTANT: Only use test mnemonics with preprod funds!
 * Never commit real mainnet mnemonics.
 *
 * @see https://meshjs.dev/apis/wallets/meshwallet
 */

import type { Page } from "@playwright/test";

// =============================================================================
// Configuration
// =============================================================================

export interface RealWalletConfig {
  /** 24-word mnemonic phrase (test wallet only!) */
  mnemonic: string[];
  /** Network ID: 0 = preprod/preview, 1 = mainnet */
  networkId: 0 | 1;
  /** Blockfrost API key for preprod */
  blockfrostApiKey: string;
  /** Human-readable name for the wallet */
  name: string;
}

// =============================================================================
// Role-Based Wallet Configuration
// =============================================================================

export type TestRole = "student" | "teacher" | "owner" | "contributor" | "manager";

/**
 * Get mnemonic for a specific role from environment variables
 *
 * Environment variable format: TEST_WALLET_{ROLE}_MNEMONIC
 * Example: TEST_WALLET_STUDENT_MNEMONIC="word1 word2 ... word24"
 *
 * Generate wallets with: npx ts-node e2e/scripts/generate-test-wallets.ts --save
 */
export function getRoleMnemonic(role: TestRole): string[] | null {
  const envKey = `TEST_WALLET_${role.toUpperCase()}_MNEMONIC`;
  const mnemonic = process.env[envKey];

  if (!mnemonic) {
    return null;
  }

  return mnemonic.split(" ");
}

/**
 * Get wallet config for a specific role
 */
export function getRoleWalletConfig(role: TestRole): RealWalletConfig | null {
  const mnemonic = getRoleMnemonic(role);

  if (!mnemonic) {
    console.warn(`[RealWallet] No mnemonic found for role: ${role}`);
    console.warn(`[RealWallet] Set TEST_WALLET_${role.toUpperCase()}_MNEMONIC in environment`);
    return null;
  }

  return {
    mnemonic,
    networkId: 0,
    blockfrostApiKey: process.env.BLOCKFROST_PREPROD_API_KEY ?? "",
    name: `${role.charAt(0).toUpperCase() + role.slice(1)}Wallet`,
  };
}

/**
 * Check if role-based wallets are configured
 */
export function hasRoleWallets(): boolean {
  return (
    !!process.env.TEST_WALLET_STUDENT_MNEMONIC ||
    !!process.env.TEST_WALLET_TEACHER_MNEMONIC ||
    !!process.env.TEST_WALLET_OWNER_MNEMONIC
  );
}

/**
 * Get all configured role wallets
 */
export function getConfiguredRoles(): TestRole[] {
  const roles: TestRole[] = ["student", "teacher", "owner", "contributor", "manager"];
  return roles.filter((role) => getRoleMnemonic(role) !== null);
}

// =============================================================================
// Legacy Default Configuration (fallback)
// =============================================================================

// Default test wallet mnemonic (well-known "abandon" wallet - shared/public)
// Only used if role-specific mnemonics are not configured
const DEFAULT_MNEMONIC = [
  "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
  "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
  "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
  "abandon", "abandon", "abandon", "abandon", "abandon", "art",
];

// Default test wallet configuration (legacy fallback)
export const DEFAULT_REAL_WALLET_CONFIG: RealWalletConfig = {
  mnemonic: process.env.TEST_WALLET_MNEMONIC?.split(" ") ?? DEFAULT_MNEMONIC,
  networkId: 0, // preprod
  blockfrostApiKey: process.env.BLOCKFROST_PREPROD_API_KEY ?? "",
  name: "TestWallet",
};

// =============================================================================
// Server-side Wallet (runs in Node.js test process)
// =============================================================================

/**
 * Create a headless wallet for a specific test role
 *
 * Usage:
 * ```typescript
 * const studentWallet = await createRoleWallet("student");
 * const teacherWallet = await createRoleWallet("teacher");
 * ```
 */
export async function createRoleWallet(role: TestRole) {
  const config = getRoleWalletConfig(role);

  if (!config) {
    throw new Error(
      `No wallet configured for role: ${role}. ` +
        `Run 'npx ts-node e2e/scripts/generate-test-wallets.ts --save' to generate wallets.`
    );
  }

  return createHeadlessWallet(config);
}

/**
 * Get wallet info for a specific role
 */
export async function getRoleWalletInfo(role: TestRole) {
  const config = getRoleWalletConfig(role);

  if (!config) {
    return null;
  }

  return getWalletInfo(config);
}

/**
 * Check funds for all configured role wallets
 */
export async function checkAllRoleWalletFunds(minimumAda: number = 10): Promise<
  Map<TestRole, { hasFunds: boolean; balance: number; address: string }>
> {
  const results = new Map<TestRole, { hasFunds: boolean; balance: number; address: string }>();
  const roles = getConfiguredRoles();

  for (const role of roles) {
    const config = getRoleWalletConfig(role);
    if (config) {
      const check = await checkWalletFunds(config, minimumAda);
      results.set(role, {
        hasFunds: check.hasFunds,
        balance: check.balance,
        address: check.address,
      });
    }
  }

  return results;
}

/**
 * Create a headless wallet for server-side transaction signing
 *
 * This wallet runs in the Node.js test process and can sign transactions
 * without a browser extension.
 *
 * Usage:
 * ```typescript
 * const wallet = await createHeadlessWallet(config);
 * const address = await wallet.getChangeAddress();
 * const signedTx = await wallet.signTx(unsignedCbor);
 * const txHash = await wallet.submitTx(signedTx);
 * ```
 */
export async function createHeadlessWallet(config: RealWalletConfig = DEFAULT_REAL_WALLET_CONFIG) {
  // Dynamic import to avoid bundling issues
  const { MeshWallet, BlockfrostProvider } = await import("@meshsdk/core");

  // Create Blockfrost provider for UTXO fetching
  const provider = new BlockfrostProvider(config.blockfrostApiKey);

  // Create wallet from mnemonic
  const wallet = new MeshWallet({
    networkId: config.networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: config.mnemonic,
    },
  });

  return wallet;
}

/**
 * Get wallet info for debugging
 */
export async function getWalletInfo(config: RealWalletConfig = DEFAULT_REAL_WALLET_CONFIG) {
  const wallet = await createHeadlessWallet(config);

  const [address, balance, utxos] = await Promise.all([
    wallet.getChangeAddress(),
    wallet.getLovelace(),
    wallet.getUtxos(),
  ]);

  return {
    address,
    balance,
    balanceAda: parseInt(balance) / 1_000_000,
    utxoCount: utxos.length,
    utxos,
  };
}

// =============================================================================
// Browser-side Wallet Injection (CIP-30 compatible)
// =============================================================================

/**
 * Inject a real wallet into the browser page
 *
 * This creates a CIP-30 compatible wallet API that communicates with
 * the Node.js test process for actual signing operations.
 *
 * The approach:
 * 1. Inject a mock CIP-30 API into window.cardano
 * 2. When signTx is called, the browser sends the unsigned TX to the test
 * 3. The test signs with the headless wallet and returns the signed TX
 * 4. The browser receives the signed TX and continues
 */
export async function injectRealWallet(
  page: Page,
  config: RealWalletConfig = DEFAULT_REAL_WALLET_CONFIG
): Promise<{
  signTransaction: (unsignedTx: string) => Promise<string>;
  submitTransaction: (signedTx: string) => Promise<string>;
}> {
  // Create the headless wallet
  const wallet = await createHeadlessWallet(config);
  const address = await wallet.getChangeAddress();
  const utxos = await wallet.getUtxos();
  const balance = await wallet.getLovelace();

  // Set up a route to handle signing requests from the browser
  let pendingSignRequest: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  } | null = null;

  let pendingSubmitRequest: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  } | null = null;

  // Handle signing requests from browser
  await page.exposeFunction("__realWalletSignTx", async (unsignedTx: string) => {
    try {
      console.log("[RealWallet] Signing transaction...");
      const signedTx = await wallet.signTx(unsignedTx, true);
      console.log("[RealWallet] Transaction signed successfully");
      return signedTx;
    } catch (error) {
      console.error("[RealWallet] Signing failed:", error);
      throw error;
    }
  });

  // Handle submit requests from browser
  await page.exposeFunction("__realWalletSubmitTx", async (signedTx: string) => {
    try {
      console.log("[RealWallet] Submitting transaction...");
      const txHash = await wallet.submitTx(signedTx);
      console.log("[RealWallet] Transaction submitted:", txHash);
      return txHash;
    } catch (error) {
      console.error("[RealWallet] Submit failed:", error);
      throw error;
    }
  });

  // Inject CIP-30 compatible wallet into browser
  await page.addInitScript(
    ({ walletAddress, walletUtxos, walletBalance, walletName }) => {
      // Create CIP-30 compatible wallet API
      const walletApi = {
        getNetworkId: async () => 0,

        getUtxos: async () => {
          // Return UTXOs in CBOR hex format (simplified for now)
          return walletUtxos.map((utxo: { input: { txHash: string; outputIndex: number }; output: { amount: { unit: string; quantity: string }[] } }) => {
            // Return a simplified representation
            return JSON.stringify(utxo);
          });
        },

        getBalance: async () => {
          // Return balance as CBOR hex (simplified)
          return walletBalance;
        },

        getUsedAddresses: async () => [walletAddress],
        getUnusedAddresses: async () => [],
        getChangeAddress: async () => walletAddress,
        getRewardAddresses: async () => [],
        getCollateral: async () => [],

        signTx: async (tx: string, partialSign?: boolean) => {
          console.log("[Browser] Requesting real wallet signature...");
          // Call the exposed function to sign with the real wallet
          const signedTx = await (window as unknown as {
            __realWalletSignTx: (tx: string) => Promise<string>;
          }).__realWalletSignTx(tx);
          return signedTx;
        },

        submitTx: async (tx: string) => {
          console.log("[Browser] Requesting real wallet submit...");
          // Call the exposed function to submit with the real wallet
          const txHash = await (window as unknown as {
            __realWalletSubmitTx: (tx: string) => Promise<string>;
          }).__realWalletSubmitTx(tx);
          return txHash;
        },

        signData: async (addr: string, payload: string) => {
          // For now, return a mock signature for data signing
          // This is mainly used for authentication, not transactions
          return {
            signature: "mock_data_signature",
            key: "mock_key",
          };
        },
      };

      // Add to window.cardano
      if (!(window as unknown as { cardano?: Record<string, unknown> }).cardano) {
        (window as unknown as { cardano: Record<string, unknown> }).cardano = {};
      }

      (window as unknown as { cardano: Record<string, unknown> }).cardano[walletName.toLowerCase()] = {
        name: walletName,
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiLz4=",
        apiVersion: "1.0.0",
        enable: async () => walletApi,
        isEnabled: async () => true,
      };

      // Also expose as the default wallet for auto-connection
      (window as unknown as { __realWalletApi: typeof walletApi }).__realWalletApi = walletApi;
      (window as unknown as { __realWalletAddress: string }).__realWalletAddress = walletAddress;
    },
    {
      walletAddress: address,
      walletUtxos: utxos,
      walletBalance: balance,
      walletName: config.name,
    }
  );

  return {
    signTransaction: async (unsignedTx: string) => {
      return wallet.signTx(unsignedTx, true);
    },
    submitTransaction: async (signedTx: string) => {
      return wallet.submitTx(signedTx);
    },
  };
}

// =============================================================================
// Direct API Testing (bypasses browser)
// =============================================================================

/**
 * Execute a transaction directly using the headless wallet
 *
 * This bypasses the browser entirely for fast transaction testing.
 * Useful for validating that transaction building and signing works.
 */
export async function executeTransactionDirect(params: {
  config?: RealWalletConfig;
  gatewayUrl: string;
  endpoint: string;
  txParams: Record<string, unknown>;
  jwt?: string;
}): Promise<{
  txHash: string;
  success: boolean;
}> {
  const { config = DEFAULT_REAL_WALLET_CONFIG, gatewayUrl, endpoint, txParams, jwt } = params;

  // Create wallet
  const wallet = await createHeadlessWallet(config);
  const address = await wallet.getChangeAddress();

  // Step 1: Build transaction
  console.log("[DirectTx] Building transaction...");
  const buildResponse = await fetch(`${gatewayUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({
      ...txParams,
      initiator_address: address,
    }),
  });

  if (!buildResponse.ok) {
    const error = await buildResponse.text();
    throw new Error(`Build failed: ${buildResponse.status} - ${error}`);
  }

  const { unsigned_tx, unsignedTxCBOR } = (await buildResponse.json()) as {
    unsigned_tx?: string;
    unsignedTxCBOR?: string;
  };
  const unsignedTx = unsigned_tx ?? unsignedTxCBOR;

  if (!unsignedTx) {
    throw new Error("No unsigned transaction in response");
  }

  // Step 2: Sign transaction
  console.log("[DirectTx] Signing transaction...");
  const signedTx = await wallet.signTx(unsignedTx, true);

  // Step 3: Submit transaction
  console.log("[DirectTx] Submitting transaction...");
  const txHash = await wallet.submitTx(signedTx);

  console.log("[DirectTx] Success:", txHash);
  return {
    txHash,
    success: true,
  };
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Check if the test wallet has sufficient funds
 */
export async function checkWalletFunds(
  config: RealWalletConfig = DEFAULT_REAL_WALLET_CONFIG,
  minimumAda: number = 10
): Promise<{
  hasFunds: boolean;
  balance: number;
  address: string;
  message: string;
}> {
  try {
    const info = await getWalletInfo(config);

    if (info.balanceAda < minimumAda) {
      return {
        hasFunds: false,
        balance: info.balanceAda,
        address: info.address,
        message: `Wallet has ${info.balanceAda} ADA, needs ${minimumAda} ADA. Fund at https://docs.cardano.org/cardano-testnets/tools/faucet/`,
      };
    }

    return {
      hasFunds: true,
      balance: info.balanceAda,
      address: info.address,
      message: `Wallet has ${info.balanceAda} ADA (sufficient)`,
    };
  } catch (error) {
    return {
      hasFunds: false,
      balance: 0,
      address: "",
      message: `Error checking wallet: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sign a message with the wallet (CIP-30 signData)
 *
 * This is used for authentication with the Gateway API.
 * The signature can be verified on the server side.
 */
export async function signMessageWithWallet(
  config: RealWalletConfig,
  message: string
): Promise<{ signature: string; key: string }> {
  const { MeshWallet, BlockfrostProvider } = await import("@meshsdk/core");

  const provider = new BlockfrostProvider(config.blockfrostApiKey);

  const wallet = new MeshWallet({
    networkId: config.networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: config.mnemonic,
    },
  });

  // MeshWallet.signData expects hex-encoded payload
  const messageHex = Buffer.from(message, "utf8").toString("hex");
  const result = await wallet.signData(messageHex);

  return {
    signature: result.signature,
    key: result.key,
  };
}

/**
 * Authenticate with Gateway using User Auth flow (nonce signing)
 *
 * This flow:
 * 1. Creates a login session to get a nonce
 * 2. Signs the nonce with the wallet
 * 3. Validates the signature to get a JWT
 *
 * @param config - Wallet configuration
 * @param gatewayUrl - Gateway API URL (default: https://preprod.api.andamio.io)
 * @param apiKey - API key for Gateway requests
 * @returns JWT and user info
 */
export async function authenticateWalletWithGateway(
  config: RealWalletConfig,
  gatewayUrl: string = "https://preprod.api.andamio.io",
  apiKey: string
): Promise<{
  jwt: string;
  userId: string;
  address: string;
  alias: string | null;
}> {
  const { MeshWallet, BlockfrostProvider, resolvePaymentKeyHash } = await import("@meshsdk/core");

  const provider = new BlockfrostProvider(config.blockfrostApiKey);

  const wallet = new MeshWallet({
    networkId: config.networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: config.mnemonic,
    },
  });

  const address = await wallet.getChangeAddress();

  console.log(`[Auth] Starting User Auth flow for address: ${address.slice(0, 30)}...`);

  // Step 1: Create login session to get nonce
  console.log("[Auth] Step 1: Creating login session...");
  const sessionResponse = await fetch(`${gatewayUrl}/api/v2/auth/login/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({}),
  });

  if (!sessionResponse.ok) {
    const error = await sessionResponse.text();
    throw new Error(`Failed to create login session: ${sessionResponse.status} - ${error}`);
  }

  const session = (await sessionResponse.json()) as {
    id: string;
    nonce: string;
    expires_at: string;
  };

  console.log(`[Auth] Session created, nonce received (expires: ${session.expires_at})`);

  // Step 2: Sign the nonce with wallet
  // MeshWallet.signData requires the nonce to be hex-encoded
  console.log("[Auth] Step 2: Signing nonce...");
  const nonceHex = Buffer.from(session.nonce, "utf8").toString("hex");
  const signature = await wallet.signData(nonceHex);
  console.log("[Auth] Nonce signed successfully");

  // Find Access Token in wallet (V2 policy ID for preprod)
  const ACCESS_TOKEN_POLICY_ID = "29aa6a65f5c890cfa428d59b15dec6293bf4ff0a94305c957508dc78";
  let accessTokenUnit: string | null = null;

  try {
    const utxos = await wallet.getUtxos();
    for (const utxo of utxos) {
      for (const amount of utxo.output.amount) {
        if (amount.unit.startsWith(ACCESS_TOKEN_POLICY_ID)) {
          accessTokenUnit = amount.unit;
          const assetName = amount.unit.slice(56);
          const decoded = Buffer.from(assetName, "hex").toString("utf8");
          console.log(`[Auth] Found Access Token: ${decoded.slice(1)}`); // Remove 'u' prefix
          break;
        }
      }
      if (accessTokenUnit) break;
    }
  } catch (e) {
    // Non-critical - continue without access token detection
  }

  // Step 3: Validate signature and get JWT
  console.log("[Auth] Step 3: Validating signature...");
  const validateBody: Record<string, unknown> = {
    id: session.id,
    signature: {
      signature: signature.signature,
      key: signature.key,
    },
    address: address,
    convert_utf8: false,
  };

  if (accessTokenUnit) {
    validateBody.andamio_access_token_unit = accessTokenUnit;
  }

  const validateResponse = await fetch(`${gatewayUrl}/api/v2/auth/login/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(validateBody),
  });

  if (!validateResponse.ok) {
    const error = await validateResponse.text();
    throw new Error(`Failed to validate signature: ${validateResponse.status} - ${error}`);
  }

  const authResult = (await validateResponse.json()) as {
    jwt: string;
    user: {
      id: string;
      cardano_bech32_addr: string;
      access_token_alias: string | null;
    };
  };

  console.log(`[Auth] Authentication successful! User ID: ${authResult.user.id}`);
  console.log(`[Auth] Alias: ${authResult.user.access_token_alias ?? "(none)"}`);

  return {
    jwt: authResult.jwt,
    userId: authResult.user.id,
    address: authResult.user.cardano_bech32_addr,
    alias: authResult.user.access_token_alias,
  };
}

/**
 * Wait for a transaction to be confirmed on-chain
 */
export async function waitForConfirmation(
  txHash: string,
  config: RealWalletConfig = DEFAULT_REAL_WALLET_CONFIG,
  maxWaitMs: number = 120_000
): Promise<boolean> {
  const { BlockfrostProvider } = await import("@meshsdk/core");
  const provider = new BlockfrostProvider(config.blockfrostApiKey);

  const startTime = Date.now();
  const pollInterval = 5_000;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Try to fetch the transaction - if it exists, it's confirmed
      const tx = await provider.fetchTxInfo(txHash);
      if (tx) {
        console.log(`[Confirmation] TX ${txHash} confirmed!`);
        return true;
      }
    } catch {
      // Transaction not found yet, keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  console.log(`[Confirmation] TX ${txHash} not confirmed within ${maxWaitMs}ms`);
  return false;
}
