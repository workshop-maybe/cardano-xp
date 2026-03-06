/**
 * Transaction Error Message Parser
 *
 * Translates known API error codes into user-friendly messages.
 * Raw TX errors often contain nested JSON and technical details
 * that are confusing for end users.
 *
 * @see https://github.com/andamio-platform/andamio-app-v2/issues/323
 */

/**
 * Known transaction error codes and their user-friendly messages.
 * Add new error codes as they are discovered.
 */
export const TX_ERROR_CODES = [
  "ACCESS_TOKEN_ERROR",
  "INSUFFICIENT_FUNDS",
  "INSUFFICIENT_COLLATERAL",
  "UTXO_BALANCE_INSUFFICIENT",
  "SCRIPT_FAILURE",
  "Transaction API error",
] as const;

/**
 * Check if a message looks like a transaction error
 */
export function isTxError(message: string): boolean {
  for (const code of TX_ERROR_CODES) {
    if (message.includes(code)) return true;
  }
  return false;
}

export const TX_ERROR_MAP: Record<string, string> = {
  ACCESS_TOKEN_ERROR:
    "One or more aliases could not be found on-chain. Verify each alias has an active Andamio access token.",
  INSUFFICIENT_FUNDS: "Insufficient funds in your wallet to complete this transaction.",
  INSUFFICIENT_COLLATERAL:
    "Insufficient collateral in your wallet. Please add more ADA for collateral.",
  UTXO_BALANCE_INSUFFICIENT:
    "Your wallet doesn't have enough ADA to cover this transaction. Please add funds.",
  SCRIPT_FAILURE: "The transaction script validation failed. Please try again or contact support.",
  NETWORK_ERROR: "Unable to connect to the blockchain network. Please check your connection.",
  TIMEOUT: "The transaction timed out. Please try again.",
};

/**
 * Parse a raw transaction error message into a user-friendly string.
 *
 * @param raw - The raw error message from the transaction API
 * @returns A user-friendly error message, or the original if no mapping exists
 *
 * @example
 * ```ts
 * const friendly = parseTxErrorMessage(error?.message);
 * // "One or more aliases could not be found on-chain..."
 * ```
 */
export function parseTxErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Check each known error code
  for (const [code, message] of Object.entries(TX_ERROR_MAP)) {
    if (raw.includes(code)) {
      return message;
    }
  }

  // If no known code matches, return the raw message
  // but try to extract just the meaningful part if it's nested JSON
  try {
    // Common pattern: "Transaction API error: 404 - {json}"
    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        message?: string;
        details?: string;
        error?: string;
      };

      // Try to extract nested details
      if (parsed.details) {
        try {
          const nested = JSON.parse(parsed.details) as { message?: string };
          if (nested.message) {
            return nested.message;
          }
        } catch {
          // Not nested JSON, use details directly
          return parsed.details;
        }
      }

      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
    }
  } catch {
    // JSON parsing failed, return raw message
  }

  return raw;
}
