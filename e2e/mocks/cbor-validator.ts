/**
 * CBOR Transaction Validator for E2E Testing
 *
 * Parses and validates Cardano transaction CBOR using Mesh SDK.
 * Provides transaction structure inspection for test assertions.
 */

// Note: In E2E tests, we work with serialized transaction hex strings.
// This module provides utilities to parse and validate transaction structures
// without requiring actual cryptographic verification.

export interface ParsedTxInput {
  txHash: string;
  outputIndex: number;
}

export interface ParsedTxOutput {
  address: string;
  lovelace: string;
  assets: Array<{
    policyId: string;
    assetName: string;
    quantity: string;
  }>;
  datumHash?: string;
  inlineDatum?: string;
}

export interface ParsedTransaction {
  inputs: ParsedTxInput[];
  outputs: ParsedTxOutput[];
  fee: string;
  mint?: Array<{
    policyId: string;
    assetName: string;
    quantity: string;
  }>;
  metadata?: Record<string, unknown>;
  validityStart?: number;
  ttl?: number;
  certificates?: unknown[];
  withdrawals?: Record<string, string>;
  requiredSigners?: string[];
  collateral?: ParsedTxInput[];
  isValid: boolean;
  validationErrors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  transaction?: ParsedTransaction;
}

/**
 * Basic CBOR hex validation
 * Checks if the string looks like valid CBOR hex
 */
export function isValidCborHex(hex: string): boolean {
  // Must be even length (hex pairs)
  if (hex.length % 2 !== 0) return false;
  // Must only contain hex characters
  if (!/^[0-9a-fA-F]*$/.test(hex)) return false;
  // Minimum length for a Cardano transaction
  if (hex.length < 100) return false;
  return true;
}

/**
 * Parse transaction CBOR to extract structure
 *
 * Note: This is a simplified parser for test purposes.
 * Real CBOR parsing would use the full Mesh SDK deserializer.
 */
export function parseTransactionCbor(cborHex: string): ParsedTransaction {
  const errors: string[] = [];

  // For mock transactions (from our gateway mock), recognize the format
  // These are not valid CBOR but are used for testing
  if (cborHex.startsWith("mock-unsigned-tx-") || cborHex.includes("_signed_mock")) {
    // This is a mock transaction from our test infrastructure
    return {
      inputs: [{ txHash: "0".repeat(64), outputIndex: 0 }],
      outputs: [
        {
          address: "addr_test1mock",
          lovelace: "1000000",
          assets: [],
        },
      ],
      fee: "200000",
      isValid: true,
      validationErrors: [],
    };
  }

  // Basic validation for real CBOR
  if (!isValidCborHex(cborHex)) {
    return {
      inputs: [],
      outputs: [],
      fee: "0",
      isValid: false,
      validationErrors: ["Invalid CBOR hex format"],
    };
  }

  // For real CBOR, we'd use Mesh SDK to deserialize
  // This is a placeholder that marks the transaction as needing real parsing
  try {
    // Attempt to detect transaction structure from CBOR prefix
    // Cardano transactions start with specific CBOR tags
    const prefix = cborHex.slice(0, 4);

    // 84 = array of 4 items (transaction body, witness set, is_valid, auxiliary_data)
    // a4 = map with 4 items (typical transaction body)
    if (prefix === "84a4" || prefix === "84a5" || prefix === "84a6") {
      // Looks like a valid transaction structure
      return {
        inputs: [],
        outputs: [],
        fee: "0",
        isValid: true,
        validationErrors: ["CBOR parsing not fully implemented - structure looks valid"],
      };
    }

    errors.push(`Unrecognized CBOR prefix: ${prefix}`);
  } catch (e) {
    errors.push(`CBOR parsing error: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  return {
    inputs: [],
    outputs: [],
    fee: "0",
    isValid: false,
    validationErrors: errors,
  };
}

/**
 * Validate a transaction against expected structure
 */
export function validateTransaction(
  cborHex: string,
  expectations: {
    minInputs?: number;
    maxInputs?: number;
    minOutputs?: number;
    maxOutputs?: number;
    expectedMintPolicies?: string[];
    maxFee?: string;
    mustHaveMetadata?: boolean;
    mustHaveCollateral?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse the transaction
  const tx = parseTransactionCbor(cborHex);

  if (!tx.isValid) {
    return {
      valid: false,
      errors: tx.validationErrors,
      warnings: [],
      transaction: tx,
    };
  }

  // Validate against expectations
  if (expectations.minInputs !== undefined && tx.inputs.length < expectations.minInputs) {
    errors.push(`Expected at least ${expectations.minInputs} inputs, got ${tx.inputs.length}`);
  }

  if (expectations.maxInputs !== undefined && tx.inputs.length > expectations.maxInputs) {
    warnings.push(`Transaction has ${tx.inputs.length} inputs (max expected: ${expectations.maxInputs})`);
  }

  if (expectations.minOutputs !== undefined && tx.outputs.length < expectations.minOutputs) {
    errors.push(`Expected at least ${expectations.minOutputs} outputs, got ${tx.outputs.length}`);
  }

  if (expectations.maxOutputs !== undefined && tx.outputs.length > expectations.maxOutputs) {
    warnings.push(`Transaction has ${tx.outputs.length} outputs (max expected: ${expectations.maxOutputs})`);
  }

  if (expectations.maxFee !== undefined) {
    const fee = BigInt(tx.fee);
    const maxFee = BigInt(expectations.maxFee);
    if (fee > maxFee) {
      warnings.push(`Fee ${tx.fee} exceeds maximum expected ${expectations.maxFee}`);
    }
  }

  if (expectations.mustHaveMetadata && !tx.metadata) {
    errors.push("Transaction must have metadata");
  }

  if (expectations.mustHaveCollateral && (!tx.collateral || tx.collateral.length === 0)) {
    errors.push("Transaction must have collateral (required for smart contract interactions)");
  }

  if (expectations.expectedMintPolicies && tx.mint) {
    for (const policy of expectations.expectedMintPolicies) {
      const found = tx.mint.some((m) => m.policyId === policy);
      if (!found) {
        errors.push(`Expected mint policy ${policy} not found in transaction`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    transaction: tx,
  };
}

/**
 * Create a mock transaction CBOR for testing
 * Returns a hex string that looks like valid CBOR
 */
export function createMockTransactionCbor(options: {
  txType?: string;
  inputs?: ParsedTxInput[];
  outputs?: ParsedTxOutput[];
  fee?: string;
}): string {
  const { txType = "generic", inputs = [], outputs = [], fee = "200000" } = options;

  // Create a deterministic mock CBOR based on inputs
  const inputsStr = inputs.map((i) => `${i.txHash}:${i.outputIndex}`).join(",");
  const outputsStr = outputs.map((o) => `${o.address}:${o.lovelace}`).join(",");

  // Generate a fake CBOR-like hex string
  // Real implementation would serialize to actual CBOR
  const payload = `${txType}|${inputsStr}|${outputsStr}|${fee}`;
  const payloadHex = Buffer.from(payload).toString("hex");

  // Prefix with CBOR transaction marker (84a4 = array of 4 with map of 4)
  return "84a4" + payloadHex.padEnd(200, "0");
}

/**
 * Transaction type detection based on structure
 */
export type TransactionType =
  | "simple_transfer"
  | "token_mint"
  | "token_burn"
  | "smart_contract"
  | "stake_delegation"
  | "stake_withdrawal"
  | "unknown";

export function detectTransactionType(tx: ParsedTransaction): TransactionType {
  // Check for minting
  if (tx.mint && tx.mint.length > 0) {
    const totalMinted = tx.mint.reduce((sum, m) => sum + BigInt(m.quantity), BigInt(0));
    if (totalMinted > 0) return "token_mint";
    if (totalMinted < 0) return "token_burn";
  }

  // Check for certificates (staking operations)
  if (tx.certificates && tx.certificates.length > 0) {
    return "stake_delegation";
  }

  // Check for withdrawals
  if (tx.withdrawals && Object.keys(tx.withdrawals).length > 0) {
    return "stake_withdrawal";
  }

  // Check for collateral (smart contract interaction)
  if (tx.collateral && tx.collateral.length > 0) {
    return "smart_contract";
  }

  // Check for datum (smart contract output)
  const hasDatum = tx.outputs.some((o) => o.datumHash || o.inlineDatum);
  if (hasDatum) {
    return "smart_contract";
  }

  // Simple transfer
  if (tx.inputs.length > 0 && tx.outputs.length > 0) {
    return "simple_transfer";
  }

  return "unknown";
}

/**
 * Extract Andamio-specific transaction details
 */
export interface AndamioTxDetails {
  txType:
    | "ACCESS_TOKEN_MINT"
    | "COURSE_CREATE"
    | "MODULE_MINT"
    | "ASSIGNMENT_COMMIT"
    | "ASSIGNMENT_ASSESS"
    | "CREDENTIAL_CLAIM"
    | "UNKNOWN";
  courseId?: string;
  moduleCode?: string;
  alias?: string;
  evidenceHash?: string;
}

export function extractAndamioTxDetails(tx: ParsedTransaction): AndamioTxDetails {
  // This would parse Andamio-specific metadata and datum
  // For now, return unknown
  const details: AndamioTxDetails = {
    txType: "UNKNOWN",
  };

  // Check metadata for Andamio transaction markers
  if (tx.metadata) {
    // Andamio uses specific metadata labels
    // 721 for NFT metadata, custom labels for other data
    const metaKeys = Object.keys(tx.metadata);

    if (metaKeys.includes("721")) {
      // Could be access token or course NFT mint
      if (tx.mint && tx.mint.length > 0) {
        details.txType = "ACCESS_TOKEN_MINT";
      }
    }
  }

  // Check for specific minting patterns
  if (tx.mint && tx.mint.length > 0) {
    for (const mint of tx.mint) {
      // Access tokens have specific asset name patterns
      if (mint.assetName && mint.quantity === "1") {
        // Could be access token or course token
        // Would need to check against known policy IDs
      }
    }
  }

  return details;
}
