"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@meshsdk/react";
import {
  authenticateWithWallet,
  storeJWT,
  getStoredJWT,
  clearStoredJWT,
  isJWTExpired,
  type AuthUser,
} from "~/lib/andamio-auth";
import { extractAliasFromUnit } from "~/lib/access-token-utils";
import { authLogger } from "~/lib/debug-logger";
import { env } from "~/env";
import { GATEWAY_API_BASE } from "~/lib/api-utils";
import { getWalletAddressBech32 } from "~/lib/wallet-address";
import {
  checkWalletNetwork,
  type WalletNetworkResult,
} from "~/lib/wallet-network";

/**
 * Detect and sync access token from wallet to database
 * Called when wallet is connected and we have a valid JWT
 *
 * NOTE: With the unified Gateway auth model, this sync is typically not needed
 * because users register their alias during gateway registration. This function
 * exists for legacy DB API compatibility but will silently skip if:
 * - User already has an alias (from gateway auth)
 * - The legacy endpoint doesn't exist (404)
 */
async function syncAccessTokenFromWallet(
  wallet: {
    getBalanceMesh: () => Promise<Array<{ unit: string; quantity: string }>>;
  },
  currentUser: AuthUser | null,
  jwt: string,
  updateUser: (user: AuthUser) => void
): Promise<void> {
  if (!currentUser || !wallet) return;

  // Check if we need to update the database
  // If user already has this alias (from gateway auth), skip entirely
  if (currentUser.accessTokenAlias) {
    authLogger.info("Access token already set (gateway auth):", currentUser.accessTokenAlias);
    return;
  }

  // First, detect the access token in wallet (outside try-catch for API call)
  let alias: string | undefined;
  try {
    const assets = await wallet.getBalanceMesh();
    const ACCESS_TOKEN_POLICY_ID = env.NEXT_PUBLIC_ACCESS_TOKEN_POLICY_ID;

    // Find access token in wallet
    const accessToken = assets.find((asset) => asset.unit.startsWith(ACCESS_TOKEN_POLICY_ID));

    if (!accessToken) {
      authLogger.info("No access token found in wallet");
      return;
    }

    // Extract alias from token unit (policy ID + hex-encoded name)
    alias = extractAliasFromUnit(accessToken.unit, ACCESS_TOKEN_POLICY_ID);
    authLogger.info("Detected access token in wallet:", { unit: accessToken.unit, alias });
  } catch (error) {
    authLogger.warn("Failed to detect access token in wallet:", error);
    return;
  }

  // Now try to sync with API
  try {
    authLogger.info("Syncing access token alias to database:", alias);

    const response = await fetch(`${GATEWAY_API_BASE}/user/access-token-alias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        access_token_alias: alias,
      }),
    });

    // Handle 404 gracefully - endpoint may not exist in new unified gateway
    if (response.status === 404) {
      authLogger.info("Sync endpoint not available, updating local state only");
      updateUser({
        ...currentUser,
        accessTokenAlias: alias,
      });
      return;
    }

    if (response.ok) {
      const data = (await response.json()) as { success: boolean; user: AuthUser; jwt: string };
      authLogger.info("Access token alias synced to database:", alias);

      // Store the new JWT
      storeJWT(data.jwt);

      // Update local user state
      updateUser(data.user);
    } else {
      // API failed, but we still detected the alias from wallet - update local state
      authLogger.warn("Access token sync API failed (non-critical):", response.status);
      authLogger.info("Updating local user state with detected alias:", alias);
      updateUser({
        ...currentUser,
        accessTokenAlias: alias,
      });
    }
  } catch (error) {
    // Log but don't throw - sync failures shouldn't break the app
    authLogger.warn("Access token sync error (non-critical):", error);
    // Still update local state with detected alias
    authLogger.info("Updating local user state with detected alias despite error:", alias);
    updateUser({
      ...currentUser,
      accessTokenAlias: alias,
    });
  }
}

interface AndamioAuthContextType {
  // State
  isAuthenticated: boolean;
  user: AuthUser | null;
  jwt: string | null;
  isAuthenticating: boolean;
  authError: string | null;
  isWalletConnected: boolean;
  popupBlocked: boolean;
  networkMismatch: WalletNetworkResult | null;

  // Actions
  authenticate: () => Promise<void>;
  logout: () => void;
  refreshAuth: () => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AndamioAuthContext = createContext<AndamioAuthContextType | undefined>(undefined);

/**
 * Sign-message timeout: long enough for slow popup windows, short enough to
 * fail cleanly if the wallet extension stops responding. Tuned from user
 * reports (see issue #42) — 45s covers realistic click-through latency on
 * Web3 popup wallets while still feeling like a real error instead of a hang.
 */
const SIGN_TIMEOUT_MS = 45_000;
const SIGN_TIMEOUT_MESSAGE = "Sign request timed out. Try again, or switch wallets.";

/**
 * AndamioAuthProvider - Global authentication state provider
 *
 * Provides a single source of truth for authentication state across the entire app.
 * Manages JWT storage, wallet authentication, and authenticated API requests.
 */
export function AndamioAuthProvider({ children }: { children: React.ReactNode }) {
  const { connected, wallet, name: walletName, disconnect: disconnectWallet } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [networkMismatch, setNetworkMismatch] = useState<WalletNetworkResult | null>(null);
  // Track if JWT validation is in progress
  const isValidatingJWTRef = useRef(false);
  // Track whether the wallet-network check for the current connection is still in flight.
  // Auto-auth waits for this to settle so it doesn't call authenticate() before the
  // mismatch state is known.
  const isCheckingNetworkRef = useRef(false);

  // Helper to update ref
  const setValidatingJWT = useCallback((value: boolean) => {
    isValidatingJWTRef.current = value;
  }, []);

  // Validate stored JWT against connected wallet
  // Only authenticate if wallet is connected AND JWT matches the wallet
  // NOTE: We intentionally exclude `wallet` from deps - it changes reference on every render
  // We only react to `connected` changing, and access wallet via closure
  useEffect(() => {
    authLogger.debug("[Effect: validateJWT] Running - connected:", connected);

    // Check synchronously if there's a stored JWT to validate
    const storedJWT = getStoredJWT();
    if (!storedJWT) {
      setValidatingJWT(false);
      return;
    }

    isValidatingJWTRef.current = true;

    const validateStoredJWT = async () => {

      // JWT expired - clear it silently
      if (isJWTExpired(storedJWT)) {
        authLogger.info("Stored JWT expired, clearing");
        clearStoredJWT();
        setValidatingJWT(false);
        return;
      }

      // Wallet not connected - don't authenticate, but keep JWT for later validation
      if (!connected || !wallet) {
        authLogger.debug("Wallet not connected, not restoring session from stored JWT");
        setValidatingJWT(false);
        return;
      }

      // Wallet is connected - validate JWT against wallet
      try {
        const payload = JSON.parse(atob(storedJWT.split(".")[1]!)) as {
          userId: string;
          cardanoBech32Addr?: string;
          accessTokenAlias?: string;
        };
        authLogger.debug("Validating stored JWT against connected wallet");

        // Fetch wallet data in parallel for performance
        // If JWT has accessTokenAlias, we need both address and assets
        // Otherwise, just fetch the address
        const [walletAddress, assets] = await Promise.all([
          getWalletAddressBech32(wallet),
          payload.accessTokenAlias ? wallet.getBalanceMesh() : Promise.resolve(null),
        ]);

        // Check address match
        if (payload.cardanoBech32Addr && payload.cardanoBech32Addr !== walletAddress) {
          authLogger.info("Stored JWT address doesn't match connected wallet, clearing JWT");
          clearStoredJWT();
          setValidatingJWT(false);
          return;
        }

        // Check access token alias match (if JWT has one)
        if (payload.accessTokenAlias && assets) {
          const ACCESS_TOKEN_POLICY_ID = env.NEXT_PUBLIC_ACCESS_TOKEN_POLICY_ID;
          const walletAccessToken = assets.find((asset) =>
            asset.unit.startsWith(ACCESS_TOKEN_POLICY_ID)
          );

          if (walletAccessToken) {
            const walletAlias = extractAliasFromUnit(walletAccessToken.unit, ACCESS_TOKEN_POLICY_ID);
            if (walletAlias !== payload.accessTokenAlias) {
              authLogger.info("Stored JWT access token alias doesn't match wallet, clearing JWT");
              clearStoredJWT();
              setValidatingJWT(false);
              return;
            }
          }
          // If wallet doesn't have an access token but JWT does, that's okay - token might have been transferred
        }

        // JWT matches wallet - restore session
        authLogger.info("Stored JWT matches connected wallet, restoring session");
        setJwt(storedJWT);
        setIsAuthenticated(true);

        const userData: AuthUser = {
          id: payload.userId,
          cardanoBech32Addr: payload.cardanoBech32Addr ?? null,
          accessTokenAlias: payload.accessTokenAlias ?? null,
        };
        setUser(userData);
        authLogger.info("User data loaded from stored JWT:", userData);

        authLogger.debug("Session restored for user:", userData.id);

        // Sync access token from wallet (in case wallet has a new one)
        void syncAccessTokenFromWallet(wallet, userData, storedJWT, setUser);
        setValidatingJWT(false);
      } catch (error) {
        authLogger.error("Failed to validate stored JWT:", error);
        clearStoredJWT();
        setValidatingJWT(false);
      }
    };

    void validateStoredJWT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, setValidatingJWT]);

  // Clear authenticated state when wallet disconnects
  // Keep JWT in storage for potential reconnection with same wallet
  useEffect(() => {
    authLogger.debug("[Effect: walletDisconnect] Running - connected:", connected, "isAuthenticated:", isAuthenticated);
    if (!connected) {
      setPopupBlocked(false);
      setAuthError(null); // Clear any previous auth errors so reconnecting starts fresh
      setNetworkMismatch(null); // Fresh connect gets a fresh network check
      // Clear auth state but keep JWT for reconnection validation
      if (isAuthenticated) {
        authLogger.info("Wallet disconnected, clearing authenticated state (JWT kept for reconnection)");
        setIsAuthenticated(false);
        setUser(null);
        setJwt(null);
      }
    }
  }, [connected, isAuthenticated]);

  // Detect wallet/app network mismatch at connect time. Auto-auth waits on
  // isCheckingNetworkRef so it doesn't call authenticate() before this resolves.
  // NOTE: `wallet` is intentionally excluded from deps — it changes reference on
  // every render; we only re-check when `connected` flips. Matches the pattern
  // on the validateJWT effect above.
  useEffect(() => {
    if (!connected || !wallet) {
      return;
    }

    let cancelled = false;
    isCheckingNetworkRef.current = true;

    const runCheck = async () => {
      try {
        const result = await checkWalletNetwork(wallet, env.NEXT_PUBLIC_CARDANO_NETWORK);
        if (cancelled) return;
        if (!result.match) {
          authLogger.warn("Wallet network mismatch detected", {
            expected: result.expected,
            actualIsTestnet: result.actualIsTestnet,
          });
        }
        setNetworkMismatch(result.match ? null : result);
      } catch (error) {
        if (cancelled) return;
        // Treat network-check failures as transient rather than a hard mismatch.
        // The wallet may be mid-initialization; authenticate()'s belt-and-braces
        // check runs again before signData() and will surface a real failure.
        authLogger.warn("Failed to read wallet network ID:", error);
        setNetworkMismatch(null);
      } finally {
        if (!cancelled) {
          isCheckingNetworkRef.current = false;
        }
      }
    };

    void runCheck();

    return () => {
      cancelled = true;
      isCheckingNetworkRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Auto-authenticate when wallet connects without a valid stored JWT
  // This triggers the sign message flow for new connections
  useEffect(() => {
    authLogger.debug("[Effect: autoAuth] Running - connected:", connected, "isAuthenticated:", isAuthenticated, "isAuthenticating:", isAuthenticating, "isValidatingJWT:", isValidatingJWTRef.current);

    // Skip if wallet not connected
    if (!connected || !wallet) {
      return;
    }

    // Skip if already authenticated or authenticating
    if (isAuthenticated || isAuthenticating) {
      return;
    }

    // Skip if there was an auth error (user declined, etc.)
    // Without this check, declining to sign causes an infinite loop of wallet popups
    if (authError) {
      return;
    }

    // Skip if popup was blocked - user needs to click retry manually
    // Without this check, autoAuth re-triggers and creates an infinite loop
    if (popupBlocked) {
      return;
    }

    // Skip if wallet is on the wrong network — signData() would hang or reject silently
    // in that case. UI surfaces networkMismatch separately; user must switch and reconnect.
    if (networkMismatch && !networkMismatch.match) {
      authLogger.info("[Effect: autoAuth] Skipping auto-auth due to network mismatch");
      return;
    }

    // Skip while the network check is still in flight. Both effects fire on the
    // same `connected` transition; without this gate, auto-auth reads the stale
    // initial `networkMismatch=null` and calls authenticate() before the check
    // has decided. authenticate() has its own belt-and-braces check, but gating
    // here avoids the wasted gateway nonce round-trip.
    if (isCheckingNetworkRef.current) {
      return;
    }

    // Skip if we're still validating a stored JWT
    if (isValidatingJWTRef.current) {
      return;
    }

    // Check if there's a stored JWT that might be valid
    const storedJWT = getStoredJWT();
    if (storedJWT && !isJWTExpired(storedJWT)) {
      // Let the validateJWT effect handle this
      authLogger.debug("[Effect: autoAuth] Stored JWT exists, skipping auto-auth");
      return;
    }

    // No valid JWT - trigger authentication
    authLogger.info("[Effect: autoAuth] Wallet connected without valid JWT, triggering authentication");
    void authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, isAuthenticated, isAuthenticating, authError, popupBlocked, networkMismatch]);

  /**
   * Authenticate with connected wallet
   */
  const authenticate = useCallback(async () => {
    authLogger.info("authenticate() called", { connected, hasWallet: !!wallet });

    if (!connected || !wallet) {
      setAuthError("Please connect your wallet first");
      return;
    }

    // Belt-and-braces network check: even if the effect above missed a transition,
    // never call signData() against a wallet on the wrong network.
    try {
      const networkResult = await checkWalletNetwork(wallet, env.NEXT_PUBLIC_CARDANO_NETWORK);
      if (!networkResult.match) {
        setNetworkMismatch(networkResult);
        setAuthError(null);
        setPopupBlocked(false);
        return;
      }
      setNetworkMismatch(null);
    } catch (error) {
      authLogger.warn("Network check failed in authenticate(), proceeding:", error);
      // Fall through — real failure will surface via signData() error paths below.
    }

    setIsAuthenticating(true);
    setAuthError(null);
    setPopupBlocked(false);

    try {
      // Get wallet address in bech32 format (v2 provides explicit bech32 method)
      const bech32Address = await getWalletAddressBech32(wallet);

      if (!bech32Address || bech32Address.length < 10) {
        console.error("Invalid address from wallet:", bech32Address);
        throw new Error(`Invalid wallet address: ${bech32Address || "(empty)"}`);
      }

      // Debug logging
      authLogger.debug("Authentication addresses:", {
        bech32Address,
        walletName,
      });

      // Authenticate
      const authResponse = await authenticateWithWallet({
        signMessage: async (nonce: string) => {
          authLogger.debug("Signing nonce:", { nonce: nonce.slice(0, 20) + "...", length: nonce.length });
          authLogger.debug("Using bech32 address for signing:", bech32Address);

          // Mesh SDK v2: signData(address: string, payload: string)
          // Note: address comes FIRST, payload second (swapped from v1)
          // Race against a timeout so a silently-hung wallet extension surfaces
          // as a real error instead of leaving isAuthenticating=true forever.
          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          try {
            const signature = await Promise.race([
              wallet.signData(bech32Address, nonce),
              new Promise<never>((_, reject) => {
                timeoutId = setTimeout(
                  () => reject(new Error(SIGN_TIMEOUT_MESSAGE)),
                  SIGN_TIMEOUT_MS,
                );
              }),
            ]);
            return signature;
          } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
          }
        },
        address: bech32Address, // Always send bech32 to the API
        walletName: walletName ?? undefined,
        convertUTF8: false, // Try false first, can be made configurable
        getAssets: async () => {
          // Get wallet assets to detect access token
          const assets = await wallet.getBalanceMesh();
          return assets;
        },
      });

      // Store JWT and update state
      authLogger.info("Auth response received:", {
        hasJwt: !!authResponse.jwt,
        user: authResponse.user,
      });
      storeJWT(authResponse.jwt);
      setJwt(authResponse.jwt);
      setUser(authResponse.user);
      setIsAuthenticated(true);
      setPopupBlocked(false);
      authLogger.info("Auth state updated: isAuthenticated=true");

      // Sync access token from wallet to database (in case it wasn't detected during auth)
      await syncAccessTokenFromWallet(wallet, authResponse.user, authResponse.jwt, setUser);

      authLogger.debug("Authentication successful for user:", authResponse.user.id);
    } catch (error) {
      authLogger.error("Authentication failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";

      // Detect popup blocked error (Web3Services wallets use popups for signing)
      if (
        errorMessage.includes("Failed to open window") ||
        errorMessage.includes("popup")
      ) {
        // Set popupBlocked instead of authError - user can click to retry
        setPopupBlocked(true);
      } else {
        setAuthError(errorMessage);
      }
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  }, [connected, wallet, walletName]);

  /**
   * Logout and clear auth state
   * Also disconnects the wallet to complete the logout flow
   */
  const logout = useCallback(() => {
    clearStoredJWT();
    setJwt(null);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    // Disconnect the wallet as well
    disconnectWallet();
  }, [disconnectWallet]);

  // Detect wallet switch during active session and logout
  // If user switches to a different wallet while authenticated, we need to log them out
  // to prevent session hijacking or data leakage
  // NOTE: This effect must be defined AFTER logout callback to avoid scope issues
  useEffect(() => {
    authLogger.debug("[Effect: detectWalletSwitch] Running");

    // Only check if user is authenticated and wallet is connected
    if (!isAuthenticated || !connected || !wallet || !user?.cardanoBech32Addr) {
      return;
    }

    const checkWalletMatch = async () => {
      try {
        // Get current wallet address in bech32 format
        const currentWalletAddress = await getWalletAddressBech32(wallet);

        // Compare with authenticated user's address
        if (currentWalletAddress !== user.cardanoBech32Addr) {
          authLogger.warn("Wallet address mismatch detected - user switched wallets during active session", {
            authenticatedAddress: user.cardanoBech32Addr,
            currentWalletAddress,
          });
          authLogger.info("Logging out user due to wallet switch");

          // Log out the user to prevent session issues
          logout();
        }
      } catch (error) {
        authLogger.error("Error checking wallet address during switch detection:", error);
        // Don't logout on errors - might be a temporary wallet API issue
      }
    };

    // Check immediately on mount and whenever dependencies change
    void checkWalletMatch();

    // Also set up polling to detect switches that happen without React re-renders
    // Some wallet extensions don't trigger re-renders when switching accounts
    const intervalId = setInterval(() => {
      void checkWalletMatch();
    }, 10_000); // Check every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, connected, user?.cardanoBech32Addr, logout]);

  /**
   * Refresh auth state from stored JWT
   * Useful after operations that update the JWT (e.g., minting access token)
   * Updates context state without requiring re-authentication
   */
  const refreshAuth = useCallback(() => {
    const storedJWT = getStoredJWT();

    if (!storedJWT) {
      authLogger.warn("refreshAuth called but no JWT in storage");
      return;
    }

    if (isJWTExpired(storedJWT)) {
      authLogger.warn("refreshAuth called but stored JWT is expired");
      clearStoredJWT();
      setJwt(null);
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(storedJWT.split(".")[1]!)) as {
        userId: string;
        cardanoBech32Addr?: string;
        accessTokenAlias?: string;
      };

      const updatedUser: AuthUser = {
        id: payload.userId,
        cardanoBech32Addr: payload.cardanoBech32Addr ?? null,
        accessTokenAlias: payload.accessTokenAlias ?? null,
      };

      authLogger.info("Refreshing auth state from stored JWT:", updatedUser);

      setJwt(storedJWT);
      setUser(updatedUser);
      setIsAuthenticated(true);
    } catch (error) {
      authLogger.error("Failed to parse JWT during refresh:", error);
    }
  }, []);

  /**
   * Make authenticated API request
   */
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!jwt) {
        throw new Error("Not authenticated");
      }

      if (isJWTExpired(jwt)) {
        logout();
        throw new Error("JWT expired, please re-authenticate");
      }

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${jwt}`,
        },
      });
    },
    [jwt, logout],
  );

  return (
    <AndamioAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        jwt,
        isAuthenticating,
        authError,
        isWalletConnected: connected,
        popupBlocked,
        networkMismatch,
        authenticate,
        logout,
        refreshAuth,
        authenticatedFetch,
      }}
    >
      {children}
    </AndamioAuthContext.Provider>
  );
}

/**
 * Default context value for when provider hasn't loaded yet (during dynamic import)
 */
const defaultContextValue: AndamioAuthContextType = {
  isAuthenticated: false,
  user: null,
  jwt: null,
  isAuthenticating: false,
  authError: null,
  isWalletConnected: false,
  popupBlocked: false,
  networkMismatch: null,
  authenticate: async () => {
    console.warn("[Auth] Provider not loaded yet");
  },
  logout: () => {
    console.warn("[Auth] Provider not loaded yet");
  },
  refreshAuth: () => {
    console.warn("[Auth] Provider not loaded yet");
  },
  authenticatedFetch: async () => {
    console.warn("[Auth] Provider not loaded yet");
    return new Response(null, { status: 503 });
  },
};

/**
 * Hook for accessing Andamio authentication state
 *
 * Returns a loading state if provider hasn't loaded yet (during dynamic import)
 */
export function useAndamioAuth() {
  const context = useContext(AndamioAuthContext);
  // Return default loading state if provider hasn't loaded yet
  // This handles the brief period during dynamic import of AuthProvider
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}
