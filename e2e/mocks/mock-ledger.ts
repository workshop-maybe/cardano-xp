/**
 * Mock Ledger for E2E Testing
 *
 * Simulates Cardano ledger state for testing multi-transaction flows.
 * Tracks UTXOs across wallet addresses and handles state transitions
 * when transactions are "submitted".
 */

// UTXO types matching Mesh SDK structure
export interface MockUTXO {
  input: {
    txHash: string;
    outputIndex: number;
  };
  output: {
    address: string;
    amount: AssetAmount[];
    dataHash?: string;
    plutusData?: string;
    scriptRef?: string;
  };
}

export interface AssetAmount {
  unit: string; // "lovelace" or policyId + assetName hex
  quantity: string;
}

// Transaction output for building new UTXOs
export interface TxOutput {
  address: string;
  amount: AssetAmount[];
  dataHash?: string;
}

// Parsed transaction structure (simplified)
export interface ParsedTransaction {
  inputs: Array<{ txHash: string; outputIndex: number }>;
  outputs: TxOutput[];
  fee: string;
  mint?: AssetAmount[];
}

/**
 * Generate a deterministic transaction hash from inputs
 */
function generateTxHash(inputs: Array<{ txHash: string; outputIndex: number }>): string {
  // Create a deterministic hash based on inputs
  const inputStr = inputs.map((i) => `${i.txHash}:${i.outputIndex}`).join(",");
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // Convert to 64-char hex string
  const hexBase = Math.abs(hash).toString(16).padStart(8, "0");
  return hexBase.repeat(8);
}

/**
 * MockLedger - Simulates Cardano ledger state
 *
 * Features:
 * - Track UTXOs per wallet address
 * - Process transaction submissions (consume inputs, create outputs)
 * - Support for multi-asset UTXOs
 * - Transaction history tracking
 * - State reset for test isolation
 */
export class MockLedger {
  private utxos = new Map<string, MockUTXO[]>();
  private transactionHistory: Array<{
    txHash: string;
    timestamp: number;
    inputs: Array<{ txHash: string; outputIndex: number }>;
    outputs: TxOutput[];
  }> = [];
  private txCounter = 0;

  /**
   * Initialize a wallet with UTXOs
   */
  initializeWallet(address: string, utxos: MockUTXO[]): void {
    this.utxos.set(address, [...utxos]);
  }

  /**
   * Add UTXOs to an existing wallet
   */
  addUtxos(address: string, utxos: MockUTXO[]): void {
    const existing = this.utxos.get(address) ?? [];
    this.utxos.set(address, [...existing, ...utxos]);
  }

  /**
   * Get all UTXOs for a wallet address
   */
  getWalletUtxos(address: string): MockUTXO[] {
    return this.utxos.get(address) ?? [];
  }

  /**
   * Get total balance for a wallet (lovelace only)
   */
  getWalletBalance(address: string): string {
    const utxos = this.getWalletUtxos(address);
    let total = BigInt(0);
    for (const utxo of utxos) {
      const lovelace = utxo.output.amount.find((a) => a.unit === "lovelace");
      if (lovelace) {
        total += BigInt(lovelace.quantity);
      }
    }
    return total.toString();
  }

  /**
   * Get all assets for a wallet
   */
  getWalletAssets(address: string): AssetAmount[] {
    const utxos = this.getWalletUtxos(address);
    const assetMap = new Map<string, bigint>();

    for (const utxo of utxos) {
      for (const asset of utxo.output.amount) {
        if (asset.unit !== "lovelace") {
          const current = assetMap.get(asset.unit) ?? BigInt(0);
          assetMap.set(asset.unit, current + BigInt(asset.quantity));
        }
      }
    }

    return Array.from(assetMap.entries()).map(([unit, quantity]) => ({
      unit,
      quantity: quantity.toString(),
    }));
  }

  /**
   * Submit a transaction to the mock ledger
   *
   * This simulates on-chain transaction processing:
   * 1. Validates inputs exist and are unspent
   * 2. Consumes input UTXOs
   * 3. Creates new output UTXOs
   * 4. Returns transaction hash
   */
  submitTransaction(tx: ParsedTransaction): {
    success: boolean;
    txHash?: string;
    error?: string;
  } {
    // Validate all inputs exist
    for (const input of tx.inputs) {
      const found = this.findUtxo(input.txHash, input.outputIndex);
      if (!found) {
        return {
          success: false,
          error: `Input not found: ${input.txHash}#${input.outputIndex}`,
        };
      }
    }

    // Generate transaction hash
    const txHash = generateTxHash(tx.inputs);

    // Consume inputs (remove from UTXO set)
    for (const input of tx.inputs) {
      this.consumeUtxo(input.txHash, input.outputIndex);
    }

    // Create outputs (add to UTXO set)
    tx.outputs.forEach((output, index) => {
      const newUtxo: MockUTXO = {
        input: {
          txHash,
          outputIndex: index,
        },
        output: {
          address: output.address,
          amount: output.amount,
          dataHash: output.dataHash,
        },
      };
      this.addUtxos(output.address, [newUtxo]);
    });

    // Record transaction
    this.transactionHistory.push({
      txHash,
      timestamp: Date.now(),
      inputs: tx.inputs,
      outputs: tx.outputs,
    });

    this.txCounter++;

    return { success: true, txHash };
  }

  /**
   * Find a specific UTXO by tx hash and output index
   */
  private findUtxo(txHash: string, outputIndex: number): { address: string; utxo: MockUTXO } | null {
    for (const [address, utxos] of this.utxos.entries()) {
      const utxo = utxos.find(
        (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex
      );
      if (utxo) {
        return { address, utxo };
      }
    }
    return null;
  }

  /**
   * Consume (remove) a UTXO from the set
   */
  private consumeUtxo(txHash: string, outputIndex: number): boolean {
    for (const [address, utxos] of this.utxos.entries()) {
      const index = utxos.findIndex(
        (u) => u.input.txHash === txHash && u.input.outputIndex === outputIndex
      );
      if (index !== -1) {
        utxos.splice(index, 1);
        this.utxos.set(address, utxos);
        return true;
      }
    }
    return false;
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): typeof this.transactionHistory {
    return [...this.transactionHistory];
  }

  /**
   * Get a specific transaction by hash
   */
  getTransaction(txHash: string): (typeof this.transactionHistory)[0] | undefined {
    return this.transactionHistory.find((tx) => tx.txHash === txHash);
  }

  /**
   * Reset ledger to initial state
   */
  reset(): void {
    this.utxos.clear();
    this.transactionHistory = [];
    this.txCounter = 0;
  }

  /**
   * Create a snapshot of current state (for test assertions)
   */
  snapshot(): {
    utxos: Map<string, MockUTXO[]>;
    transactionCount: number;
  } {
    const utxosCopy = new Map<string, MockUTXO[]>();
    for (const [address, utxos] of this.utxos.entries()) {
      utxosCopy.set(address, [...utxos]);
    }
    return {
      utxos: utxosCopy,
      transactionCount: this.txCounter,
    };
  }
}

/**
 * Create a standard mock UTXO with ADA
 */
export function createMockUtxo(
  address: string,
  lovelace: string,
  txHash?: string,
  outputIndex = 0,
  assets: AssetAmount[] = []
): MockUTXO {
  return {
    input: {
      txHash: txHash ?? "0".repeat(64),
      outputIndex,
    },
    output: {
      address,
      amount: [{ unit: "lovelace", quantity: lovelace }, ...assets],
    },
  };
}

/**
 * Create a mock UTXO with an access token
 */
export function createAccessTokenUtxo(
  address: string,
  lovelace: string,
  policyId: string,
  assetName: string,
  txHash?: string
): MockUTXO {
  return createMockUtxo(address, lovelace, txHash, 0, [
    { unit: policyId + assetName, quantity: "1" },
  ]);
}

/**
 * Pre-configured wallet setups for common test scenarios
 */
export const WALLET_PRESETS = {
  /** New user with only ADA, no access token */
  newUser: (address: string) => [createMockUtxo(address, "100000000000")], // 100,000 ADA

  /** User with access token (can authenticate) */
  authenticatedUser: (address: string, policyId: string, alias: string) => [
    createMockUtxo(address, "50000000000"), // 50,000 ADA
    createAccessTokenUtxo(
      address,
      "2000000", // Min ADA for token
      policyId,
      Buffer.from(alias).toString("hex")
    ),
  ],

  /** Course owner with course NFT */
  courseOwner: (address: string, accessTokenPolicy: string, alias: string, courseNftPolicy: string) => [
    createMockUtxo(address, "100000000000"),
    createAccessTokenUtxo(address, "2000000", accessTokenPolicy, Buffer.from(alias).toString("hex")),
    createMockUtxo(address, "2000000", undefined, 1, [
      { unit: courseNftPolicy + "436f75727365", quantity: "1" }, // "Course" in hex
    ]),
  ],

  /** Student enrolled in a course */
  enrolledStudent: (address: string, accessTokenPolicy: string, alias: string, courseStatePolicy: string) => [
    createMockUtxo(address, "50000000000"),
    createAccessTokenUtxo(address, "2000000", accessTokenPolicy, Buffer.from(alias).toString("hex")),
    createMockUtxo(address, "2000000", undefined, 1, [
      { unit: courseStatePolicy + "53747564656e74", quantity: "1" }, // "Student" in hex
    ]),
  ],
};

// Singleton instance for global state (optional usage)
let globalLedger: MockLedger | null = null;

export function getGlobalLedger(): MockLedger {
  if (!globalLedger) {
    globalLedger = new MockLedger();
  }
  return globalLedger;
}

export function resetGlobalLedger(): void {
  if (globalLedger) {
    globalLedger.reset();
  }
  globalLedger = null;
}
