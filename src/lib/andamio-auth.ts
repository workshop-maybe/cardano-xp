import { env } from "~/env";
import { authLogger } from "~/lib/debug-logger";
import { extractAliasFromUnit } from "~/lib/access-token-utils";

/**
 * Andamio Authentication Service
 *
 * Handles wallet-based authentication with Andamio APIs.
 *
 * User Auth Flow:
 * 1. POST /api/v2/auth/login/session → get nonce
 * 2. Sign nonce with wallet (CIP-30)
 * 3. POST /api/v2/auth/login/validate → get JWT
 *
 * This provides cryptographic proof of wallet ownership via CIP-30 signing.
 */

export interface LoginSession {
  id: string;
  nonce: string;
  expires_at: string;
}

export interface WalletSignature {
  signature: string;
  key: string;
}

export interface AuthUser {
  id: string;
  cardanoBech32Addr: string | null;
  accessTokenAlias: string | null;
}

export interface AuthResponse {
  jwt: string;
  user: AuthUser;
}

// Use proxy for API calls to include the API key
// All auth requests go through the local proxy which adds X-API-Key header
const API_PROXY = "/api/gateway";

// =============================================================================
// USER AUTH
// =============================================================================

/**
 * Step 1: Create a login session
 * Returns a nonce that must be signed with the user's wallet
 */
export async function createLoginSession(): Promise<LoginSession> {
  const response = await fetch(`${API_PROXY}/api/v2/auth/login/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    let errorMessage = `Login session failed (${response.status})`;
    try {
      const error = (await response.json()) as { message?: string; error?: string; details?: string };
      errorMessage = error.message ?? error.error ?? error.details ?? errorMessage;
    } catch {
      // Response wasn't JSON
    }
    authLogger.error("createLoginSession failed:", { status: response.status, errorMessage });
    throw new Error(errorMessage);
  }

  return response.json() as Promise<LoginSession>;
}

/**
 * API response format from /api/v2/auth/login/validate
 */
interface ValidateSignatureApiResponse {
  jwt: string;
  user: {
    id: string;
    cardano_bech32_addr: string;
    access_token_alias: string | null;
    created_at?: string;
    updated_at?: string;
  };
}

/**
 * Step 2: Validate signature and get JWT
 * Verifies the wallet signature and returns a JWT token
 *
 * API expects: { id, signature: { signature, key }, address }
 * Optional: andamio_access_token_unit, convert_utf8, wallet_preference
 */
export async function validateSignature(params: {
  sessionId: string;
  signature: WalletSignature;
  address: string;
  convertUTF8?: boolean;
  walletPreference?: string;
  andamioAccessTokenUnit?: string | null;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_PROXY}/api/v2/auth/login/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: params.sessionId,
      signature: params.signature,
      address: params.address,
      convert_utf8: params.convertUTF8 ?? false,
      wallet_preference: params.walletPreference,
      andamio_access_token_unit: params.andamioAccessTokenUnit,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { message?: string; error?: string; details?: unknown };
    authLogger.error("Validate signature failed:", {
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error.message ?? error.error ?? "Failed to validate signature");
  }

  // Transform API response to internal format
  const apiResponse = (await response.json()) as ValidateSignatureApiResponse;
  return {
    jwt: apiResponse.jwt,
    user: {
      id: apiResponse.user.id,
      cardanoBech32Addr: apiResponse.user.cardano_bech32_addr,
      accessTokenAlias: apiResponse.user.access_token_alias,
    },
  };
}

/**
 * Complete authentication flow using CIP-30 wallet signing
 *
 * 1. Get nonce from /api/v2/auth/login/session
 * 2. User signs nonce with CIP-30 wallet
 * 3. Validate signature at /api/v2/auth/login/validate
 * 4. Receive JWT for authenticated API access
 *
 * @param signMessage - Function to sign a message with wallet (CIP-30)
 * @param address - Wallet address in bech32 format
 * @param walletName - Optional wallet name for preference tracking
 * @param convertUTF8 - Whether to convert nonce to UTF8 before signing
 * @param getAssets - Function to get wallet assets (for access token detection)
 */
export async function authenticateWithWallet(params: {
  signMessage: (nonce: string) => Promise<WalletSignature>;
  address: string;
  walletName?: string;
  convertUTF8?: boolean;
  getAssets?: () => Promise<Array<{ unit: string; quantity: string }>>;
}): Promise<AuthResponse> {
  const ACCESS_TOKEN_POLICY_ID = env.NEXT_PUBLIC_ACCESS_TOKEN_POLICY_ID;

  // Step 1: Detect access token in wallet (to include in validation request)
  let accessTokenUnit: string | undefined;

  if (params.getAssets) {
    try {
      const assets = await params.getAssets();

      // DEBUG: Log wallet assets for access token detection
      console.log("[Auth] Fresh auth - wallet assets:", assets.length, "policy:", ACCESS_TOKEN_POLICY_ID);

      // Find access token in wallet assets
      const accessToken = assets.find((asset) =>
        asset.unit.startsWith(ACCESS_TOKEN_POLICY_ID)
      );

      if (accessToken) {
        accessTokenUnit = accessToken.unit;
        const alias = extractAliasFromUnit(accessToken.unit, ACCESS_TOKEN_POLICY_ID);
        console.log("[Auth] Access token detected:", { unit: accessTokenUnit, alias });
      } else {
        console.log("[Auth] No matching access token. Asset units:", assets.map(a => a.unit.slice(0, 20) + "..."));
      }
    } catch (error) {
      console.warn("[Auth] Failed to detect access token:", error);
      // Continue with auth - access token is optional
    }
  }

  // Step 2: Create login session (get nonce to sign)
  authLogger.info("Creating login session...");
  const session = await createLoginSession();
  authLogger.info("Login session created, nonce received");

  // Step 3: Sign nonce with wallet (CIP-30)
  authLogger.info("Requesting wallet signature...");
  const signature = await params.signMessage(session.nonce);
  authLogger.info("Wallet signature obtained");

  // Step 4: Validate signature and get JWT
  authLogger.info("Validating signature...");
  const authResponse = await validateSignature({
    sessionId: session.id,
    signature,
    address: params.address,
    convertUTF8: params.convertUTF8,
    walletPreference: params.walletName,
    andamioAccessTokenUnit: accessTokenUnit ?? null,
  });

  authLogger.info("Authentication successful");
  return authResponse;
}

// =============================================================================
// JWT STORAGE
// =============================================================================

export const JWT_STORAGE_KEY = "andamio_jwt";

export function storeJWT(jwt: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(JWT_STORAGE_KEY, jwt);
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
      console.warn("[Auth] Failed to store JWT in localStorage");
    }
  }
}

export function getStoredJWT(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(JWT_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
      return null;
    }
  }
  return null;
}

export function clearStoredJWT(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(JWT_STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
  }
}

/**
 * Check if JWT is expired (basic check, doesn't verify signature)
 */
export function isJWTExpired(jwt: string): boolean {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]!)) as { exp?: number };
    if (!payload.exp) {
      return true;
    }
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch {
    return true;
  }
}
