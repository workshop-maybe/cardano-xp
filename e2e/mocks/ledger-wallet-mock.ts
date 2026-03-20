/**
 * Ledger-Integrated Wallet Mock for E2E Testing
 *
 * Extends the basic wallet mock with MockLedger integration for
 * realistic UTXO tracking and transaction state management.
 *
 * This enables testing of:
 * - Multi-transaction flows (e.g., enroll → submit → assess → claim)
 * - UTXO consumption and change outputs
 * - Token minting and transfers
 * - Balance updates after transactions
 */

import type { Page } from "@playwright/test";
import {
  MockLedger,
  type MockUTXO,
  type AssetAmount,
  type ParsedTransaction,
  createMockUtxo,
  WALLET_PRESETS,
} from "./mock-ledger";
import { type MockWalletConfig, DEFAULT_MOCK_WALLET } from "./mesh-wallet-mock";
import { validateTransaction, type ValidationResult } from "./cbor-validator";

/**
 * Enhanced wallet config with ledger reference
 */
export interface LedgerWalletConfig extends MockWalletConfig {
  /** Reference to shared ledger instance */
  ledgerId?: string;
  /** Initial UTXOs to seed the wallet */
  initialUtxos?: MockUTXO[];
  /** Whether to validate transactions before signing */
  validateTransactions?: boolean;
  /** Custom transaction handler for special cases */
  onTransaction?: (tx: ParsedTransaction) => void;
}

/**
 * Transaction event for tracking
 */
export interface TransactionEvent {
  type: "sign" | "submit" | "confirm" | "reject" | "timeout";
  txHash?: string;
  timestamp: number;
  walletAddress: string;
  error?: string;
}

/**
 * Store for ledger instances and transaction events
 */
const ledgerStore = new Map<string, MockLedger>();
const transactionEvents: TransactionEvent[] = [];

/**
 * Register a ledger instance for use by wallet mocks
 */
export function registerLedger(id: string, ledger: MockLedger): void {
  ledgerStore.set(id, ledger);
}

/**
 * Get a registered ledger instance
 */
export function getLedger(id: string): MockLedger | undefined {
  return ledgerStore.get(id);
}

/**
 * Clear all registered ledgers and events
 */
export function clearLedgerStore(): void {
  ledgerStore.clear();
  transactionEvents.length = 0;
}

/**
 * Get all transaction events
 */
export function getTransactionEvents(): TransactionEvent[] {
  return [...transactionEvents];
}

/**
 * Inject ledger-integrated wallet into the page
 *
 * This provides a wallet that:
 * 1. Returns UTXOs from the MockLedger
 * 2. Updates ledger state on transaction submission
 * 3. Tracks transaction events for test assertions
 */
export async function injectLedgerWallet(
  page: Page,
  config: LedgerWalletConfig,
  ledger: MockLedger
): Promise<void> {
  // Initialize wallet in ledger if not already done
  const existingUtxos = ledger.getWalletUtxos(config.address);
  if (existingUtxos.length === 0 && config.initialUtxos) {
    ledger.initializeWallet(config.address, config.initialUtxos);
  }

  // Get current UTXOs for initial state
  const utxos = ledger.getWalletUtxos(config.address);
  const balance = ledger.getWalletBalance(config.address);
  const assets = ledger.getWalletAssets(config.address);

  // Serialize data for injection into page context
  const serializedConfig = {
    ...config,
    // Remove non-serializable properties
    onTransaction: undefined,
  };

  const serializedUtxos = utxos.map((u) => ({
    input: u.input,
    output: {
      address: u.output.address,
      amount: u.output.amount,
    },
  }));

  await page.addInitScript(
    ({ walletConfig, initialUtxos, initialBalance, initialAssets }) => {
      // Type definitions for window extensions
      interface MockWalletState {
        config: typeof walletConfig;
        utxos: typeof initialUtxos;
        balance: string;
        assets: Array<{ unit: string; quantity: string }>;
        pendingTxs: Map<string, { signedTx: string; timestamp: number }>;
        txHistory: Array<{ txHash: string; timestamp: number; status: string }>;
      }

      // Store wallet state in window
      const walletState: MockWalletState = {
        config: walletConfig,
        utxos: initialUtxos,
        balance: initialBalance,
        assets: initialAssets,
        pendingTxs: new Map(),
        txHistory: [],
      };

      (window as unknown as { __ledgerWalletState: MockWalletState }).__ledgerWalletState =
        walletState;

      // Helper to generate deterministic tx hash
      const generateTxHash = (input: string): string => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
          const char = input.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, "0").slice(0, 64);
      };

      // Helper to generate mock signature
      const generateMockSignature = (payload: string): string => {
        const mockKey =
          "a501010327200621582000000000000000000000000000000000000000000000000000000000deadbeef";
        const mockSig =
          "845846a201276761646472657373583900" +
          payload.slice(0, 64).padEnd(64, "0") +
          "a166686173686564f458";
        return JSON.stringify({ signature: mockSig, key: mockKey });
      };

      // Create the wallet object
      const mockWallet = {
        name: walletConfig.name,

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

        getAssets: async () => {
          // Return assets from state (includes access token if present)
          const stateAssets = walletState.assets.map((a) => ({
            unit: a.unit,
            quantity: a.quantity,
          }));

          // Also include access token from config if set
          if (walletConfig.accessTokenUnit) {
            const hasToken = stateAssets.some((a) => a.unit === walletConfig.accessTokenUnit);
            if (!hasToken) {
              stateAssets.push({
                unit: walletConfig.accessTokenUnit,
                quantity: "1",
              });
            }
          }

          return stateAssets;
        },

        getBalance: async () => {
          return walletState.balance;
        },

        getUtxos: async () => {
          return walletState.utxos;
        },

        signData: async (payload: string, _address?: string) => {
          if (walletConfig.mode === "reject") {
            throw new Error("User rejected the signing request");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000)
            );
            throw new Error("Wallet signing timed out");
          }

          // Small delay to simulate user interaction
          await new Promise((resolve) => setTimeout(resolve, 100));
          return generateMockSignature(payload);
        },

        signTx: async (unsignedTx: string, _partialSign?: boolean) => {
          if (walletConfig.mode === "reject") {
            // Record rejection event
            walletState.txHistory.push({
              txHash: generateTxHash(unsignedTx),
              timestamp: Date.now(),
              status: "rejected",
            });
            throw new Error("User rejected the transaction");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000)
            );
            throw new Error("Wallet signing timed out");
          }

          // Generate signed tx
          const signedTx = unsignedTx + "_signed_mock";
          const txHash = generateTxHash(unsignedTx);

          // Store pending transaction
          walletState.pendingTxs.set(txHash, {
            signedTx,
            timestamp: Date.now(),
          });

          // Small delay to simulate user interaction
          await new Promise((resolve) => setTimeout(resolve, 100));

          return signedTx;
        },

        submitTx: async (signedTx: string) => {
          if (walletConfig.mode === "reject") {
            throw new Error("Transaction submission rejected");
          }
          if (walletConfig.mode === "timeout") {
            await new Promise((resolve) =>
              setTimeout(resolve, walletConfig.timeoutMs ?? 30000)
            );
            throw new Error("Transaction submission timed out");
          }

          // Generate tx hash
          const txHash = generateTxHash(signedTx);

          // Record submission
          walletState.txHistory.push({
            txHash,
            timestamp: Date.now(),
            status: "submitted",
          });

          // Dispatch event for test tracking
          window.dispatchEvent(
            new CustomEvent("mock:tx:submitted", {
              detail: {
                txHash,
                signedTx,
                walletAddress: walletConfig.address,
              },
            })
          );

          // Small delay to simulate network
          await new Promise((resolve) => setTimeout(resolve, 200));

          return txHash;
        },

        getNetworkId: async () => {
          return 0; // Testnet/Preprod
        },

        getCollateral: async () => {
          // Return first UTXO with sufficient ADA as collateral
          const collateralUtxo = walletState.utxos.find((u) => {
            const lovelace = u.output.amount.find(
              (a: { unit: string; quantity: string }) => a.unit === "lovelace"
            );
            return lovelace && BigInt(lovelace.quantity) >= BigInt(5000000);
          });

          return collateralUtxo ? [collateralUtxo] : [];
        },
      };

      // Store wallet reference
      (window as unknown as { __mockWallet: typeof mockWallet }).__mockWallet = mockWallet;
      (window as unknown as { __mockWalletConfig: typeof walletConfig }).__mockWalletConfig =
        walletConfig;

      // Inject into window.cardano
      const cardanoObj = (window as unknown as { cardano?: Record<string, unknown> }).cardano ?? {};
      cardanoObj.mockwallet = {
        name: walletConfig.name,
        icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiLz4=",
        apiVersion: "0.1.0",
        enable: async () => mockWallet,
        isEnabled: async () => true,
      };
      (window as unknown as { cardano: typeof cardanoObj }).cardano = cardanoObj;
    },
    {
      walletConfig: serializedConfig,
      initialUtxos: serializedUtxos,
      initialBalance: balance,
      initialAssets: assets,
    }
  );
}

/**
 * Update wallet state in the page after ledger changes
 * Call this after MockLedger.submitTransaction() to sync state
 */
export async function syncWalletWithLedger(page: Page, ledger: MockLedger, address: string): Promise<void> {
  const utxos = ledger.getWalletUtxos(address);
  const balance = ledger.getWalletBalance(address);
  const assets = ledger.getWalletAssets(address);

  const serializedUtxos = utxos.map((u) => ({
    input: u.input,
    output: {
      address: u.output.address,
      amount: u.output.amount,
    },
  }));

  await page.evaluate(
    ({ newUtxos, newBalance, newAssets }) => {
      const state = (
        window as unknown as {
          __ledgerWalletState?: {
            utxos: typeof newUtxos;
            balance: string;
            assets: typeof newAssets;
          };
        }
      ).__ledgerWalletState;

      if (state) {
        state.utxos = newUtxos;
        state.balance = newBalance;
        state.assets = newAssets;
      }
    },
    { newUtxos: serializedUtxos, newBalance: balance, newAssets: assets }
  );
}

/**
 * Get transaction history from the page
 */
export async function getPageTransactionHistory(
  page: Page
): Promise<Array<{ txHash: string; timestamp: number; status: string }>> {
  return page.evaluate(() => {
    const state = (
      window as unknown as {
        __ledgerWalletState?: {
          txHistory: Array<{ txHash: string; timestamp: number; status: string }>;
        };
      }
    ).__ledgerWalletState;

    return state?.txHistory ?? [];
  });
}

/**
 * Listen for transaction submissions on the page
 */
export async function onTransactionSubmitted(
  page: Page,
  callback: (event: { txHash: string; signedTx: string; walletAddress: string }) => void
): Promise<void> {
  await page.exposeFunction("__mockTxCallback", callback);

  await page.evaluate(() => {
    window.addEventListener("mock:tx:submitted", ((
      e: CustomEvent<{ txHash: string; signedTx: string; walletAddress: string }>
    ) => {
      const fn = (window as unknown as { __mockTxCallback: typeof callback }).__mockTxCallback;
      if (fn) fn(e.detail);
    }) as EventListener);
  });
}

/**
 * Create a complete test setup with ledger and wallet
 */
export interface TestWalletSetup {
  ledger: MockLedger;
  walletConfig: LedgerWalletConfig;
  address: string;
  inject: (page: Page) => Promise<void>;
  sync: (page: Page) => Promise<void>;
}

export function createTestWalletSetup(
  role: "student" | "teacher" | "owner",
  alias: string,
  options: {
    accessTokenPolicyId?: string;
    courseId?: string;
  } = {}
): TestWalletSetup {
  const ledger = new MockLedger();

  // Generate deterministic address from alias
  const addressBase = Buffer.from(alias).toString("hex").padEnd(56, "0");
  const address = `addr_test1q${addressBase}`;

  // Create wallet config
  const accessTokenUnit = options.accessTokenPolicyId
    ? options.accessTokenPolicyId + Buffer.from(alias).toString("hex")
    : undefined;

  const walletConfig: LedgerWalletConfig = {
    name: `${role}Wallet`,
    address,
    addressHex: addressBase,
    mode: "approve",
    accessTokenUnit,
    validateTransactions: true,
  };

  // Initialize ledger based on role
  let utxos: MockUTXO[];
  switch (role) {
    case "student":
      utxos = WALLET_PRESETS.authenticatedUser(
        address,
        options.accessTokenPolicyId ?? "mock_policy",
        alias
      );
      break;
    case "teacher":
      utxos = WALLET_PRESETS.authenticatedUser(
        address,
        options.accessTokenPolicyId ?? "mock_policy",
        alias
      );
      break;
    case "owner":
      utxos = WALLET_PRESETS.courseOwner(
        address,
        options.accessTokenPolicyId ?? "mock_policy",
        alias,
        options.courseId ?? "mock_course_policy"
      );
      break;
  }

  ledger.initializeWallet(address, utxos);
  walletConfig.initialUtxos = utxos;

  return {
    ledger,
    walletConfig,
    address,
    inject: (page: Page) => injectLedgerWallet(page, walletConfig, ledger),
    sync: (page: Page) => syncWalletWithLedger(page, ledger, address),
  };
}
