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

export type AppNetwork = "mainnet" | "preprod" | "preview";

export type WalletNetworkResult =
  | { match: true }
  | { match: false; expected: AppNetwork; actualIsTestnet: boolean };

interface NetworkCapableWallet {
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

  return {
    match: false,
    expected,
    actualIsTestnet: networkId === 0,
  };
}
