/**
 * Wallet network detection.
 *
 * Compares a CIP-30 wallet's reported network to the app's configured
 * network and returns a typed result the caller can render directly.
 *
 * CIP-30 `getNetworkId()` returns only `0` (any testnet) or `1` (mainnet),
 * so preprod and preview are indistinguishable at the wallet level. The
 * caller uses the env-configured network for the expected side; for the
 * actual side we expose `actualIsTestnet` and let copy be honest about the
 * ambiguity ("a testnet") when the app is on mainnet and the wallet is on 0.
 */

import type { CardanoNetwork } from "~/lib/constants";

export type AppNetwork = CardanoNetwork;

export type WalletNetworkResult =
  | { match: true }
  | { match: false; expected: AppNetwork; actualIsTestnet: boolean };

/**
 * CIP-30 contract: `getNetworkId()` returns 0 (any testnet) or 1 (mainnet).
 * Typed as `number` because Mesh's IWallet widens it and non-compliant wallets
 * could in principle return anything. `checkWalletNetwork` treats any value
 * other than 1 as a testnet — bad wallets surface as a mismatch rather than
 * silently passing through.
 */
export interface NetworkCapableWallet {
  getNetworkId: () => Promise<number>;
}

/**
 * Compare a wallet's current network to the app's expected network.
 *
 * Rejects with the original error if the wallet call fails — callers
 * decide how to surface that (typically: treat it as a transient error
 * rather than a hard mismatch).
 */
export async function checkWalletNetwork(
  wallet: NetworkCapableWallet,
  expected: AppNetwork,
): Promise<WalletNetworkResult> {
  const networkId = await wallet.getNetworkId();

  const expectedId = expected === "mainnet" ? 1 : 0;

  if (networkId === expectedId) {
    return { match: true };
  }

  // CIP-30 says only 0 or 1. Treat anything that isn't explicitly mainnet (1)
  // as a testnet for the purposes of copy and routing — a non-compliant wallet
  // should still surface as "wrong network" rather than silently claim mainnet.
  return {
    match: false,
    expected,
    actualIsTestnet: networkId !== 1,
  };
}

/**
 * Copy shown when the wallet is on the wrong network. Returns both a
 * short label for compact surfaces (nav-bar dropdown) and a full sentence
 * for larger surfaces (auth card, banner).
 *
 * Centralized here so both callers — `AndamioAuthButton` and
 * `ConnectedDropdown` — stay in sync on wording.
 */
export function formatNetworkMismatchMessage(
  result: Extract<WalletNetworkResult, { match: false }>,
): { short: string; long: string } {
  const { expected, actualIsTestnet } = result;

  const SHORT: Record<AppNetwork, string> = {
    mainnet: actualIsTestnet
      ? "Wallet is on a testnet, app needs mainnet."
      : "Wallet is on mainnet, app needs mainnet.",
    preprod: actualIsTestnet
      ? "Wallet is on a different testnet, app needs preprod."
      : "Wallet is on mainnet, app needs preprod.",
    preview: actualIsTestnet
      ? "Wallet is on a different testnet, app needs preview."
      : "Wallet is on mainnet, app needs preview.",
  };

  const LONG: Record<AppNetwork, string> = {
    mainnet:
      "This app runs on Cardano mainnet. Your wallet is connected to a testnet. Switch your wallet's network to mainnet and reconnect.",
    preprod: actualIsTestnet
      ? "This app is running on preprod. Your wallet is connected to a different testnet. Switch to preprod and reconnect."
      : "This app is running on preprod. Your wallet is on mainnet. Switch to preprod and reconnect.",
    preview: actualIsTestnet
      ? "This app is running on preview. Your wallet is connected to a different testnet. Switch to preview and reconnect."
      : "This app is running on preview. Your wallet is on mainnet. Switch to preview and reconnect.",
  };

  return { short: SHORT[expected], long: LONG[expected] };
}
