import type { EnableWeb3WalletOptions } from "@utxos/sdk";
import { env } from "~/env";

/**
 * Blockfrost provider for social wallet (UTXOS/Web3) transaction submission.
 *
 * CIP-30 browser wallets (Nami, Eternl, etc.) have their own built-in submitter
 * via the extension. But MeshWallet (used by social login) is a software wallet
 * with no extension — it needs an explicit provider to fetch UTXOs and submit TX.
 *
 * Lazily initialized to avoid importing @meshsdk/core at module scope,
 * which triggers libsodium WASM initialization and breaks SSR.
 */
let _blockfrostProvider: import("@meshsdk/core").BlockfrostProvider | undefined;

async function getBlockfrostProvider() {
  if (!env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID) return undefined;
  if (!_blockfrostProvider) {
    const { BlockfrostProvider } = await import("@meshsdk/core");
    _blockfrostProvider = new BlockfrostProvider(env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID);
  }
  return _blockfrostProvider;
}

/**
 * Shared Web3 Services config for social wallet login (Google, Discord, X).
 *
 * Returns undefined when no project ID is configured (social login will be hidden).
 * Fetcher/submitter are set lazily via getWeb3ServicesConfig().
 */
export async function getWeb3ServicesConfig(): Promise<EnableWeb3WalletOptions | undefined> {
  if (!env.NEXT_PUBLIC_WEB3_SDK_PROJECT_ID) return undefined;

  const provider = await getBlockfrostProvider();
  return {
    networkId: env.NEXT_PUBLIC_WEB3_SDK_NETWORK === "mainnet" ? 1 : 0,
    projectId: env.NEXT_PUBLIC_WEB3_SDK_PROJECT_ID,
    fetcher: provider,
    submitter: provider,
  };
}
