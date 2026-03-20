/**
 * Mint 100,000 XP tokens using Mesh SDK
 *
 * Usage:
 *   BLOCKFROST_KEY=preprodXXX MNEMONIC="word1 word2 ..." npx tsx scripts/mint-xp-tokens/mint-xp-mesh.ts
 *
 * Optional env vars:
 *   DEST_ADDR    — recipient address (defaults to minting wallet)
 *   NETWORK_ID   — 0 for testnet (default), 1 for mainnet
 *   LOCK_AFTER_SLOT — slot after which minting is impossible (time-lock)
 */

import {
  BlockfrostProvider,
  ForgeScript,
  MeshTxBuilder,
  resolveScriptHash,
  stringToHex,
} from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/core";

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const BLOCKFROST_KEY = process.env.BLOCKFROST_KEY;
const MNEMONIC = process.env.MNEMONIC;
const NETWORK_ID = Number(process.env.NETWORK_ID ?? "0"); // 0 = preprod, 1 = mainnet
const DEST_ADDR = process.env.DEST_ADDR; // optional override
const LOCK_AFTER_SLOT = process.env.LOCK_AFTER_SLOT; // optional time-lock

if (!BLOCKFROST_KEY) {
  console.error("Error: BLOCKFROST_KEY env var is required");
  process.exit(1);
}
if (!MNEMONIC) {
  console.error("Error: MNEMONIC env var is required (space-separated 24 words)");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPLY = "100000";
const ASSET_NAME = "XP";
const ASSET_NAME_HEX = stringToHex(ASSET_NAME); // "5850"

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Initializing Blockfrost provider...");
  const provider = new BlockfrostProvider(BLOCKFROST_KEY!);

  console.log("Creating wallet from mnemonic...");
  const wallet = new MeshWallet({
    networkId: NETWORK_ID as 0 | 1,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: MNEMONIC!.split(" "),
    },
  });

  const walletAddress = await wallet.getChangeAddress();
  const destAddr = DEST_ADDR ?? walletAddress;
  console.log("Wallet address:", walletAddress);
  console.log("Destination:   ", destAddr);

  // Build forging script
  const forgingScript = ForgeScript.withOneSignature(walletAddress);
  const policyId = resolveScriptHash(forgingScript);
  console.log("Policy ID:     ", policyId);
  console.log("Asset:          " + policyId + "." + ASSET_NAME_HEX);

  // Fetch UTxOs
  const utxos = await wallet.getUtxos();
  if (utxos.length === 0) {
    throw new Error(
      "No UTxOs found. Fund the wallet first.\n" +
        (NETWORK_ID === 0
          ? "Preprod faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/"
          : ""),
    );
  }
  console.log("UTxOs:         ", utxos.length);

  // CIP-25 (label 721) metadata
  const metadata: Record<string, unknown> = {
    [policyId]: {
      [ASSET_NAME]: {
        name: "Cardano XP",
        description: [
          "100,000 XP. Fixed supply, one-time mint.",
          "Earned by completing tasks. Circulated by giving.",
          "On-chain proof of contribution to the Cardano ecosystem.",
        ],
        image: [
          "ipfs://bafkreiambboqzvp7odarvsjsf6qo",
          "ekxcdkoqnyaiys3s223qk56ja35e4e",
        ],
        mediaType: "image/png",
        version: "1",
        url: "cardano-xp.io",
      },
    },
  };

  console.log("\nBuilding transaction...");
  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    verbose: true,
  });

  // Mint + send to destination
  txBuilder
    .mint(SUPPLY, policyId, ASSET_NAME_HEX)
    .mintingScript(forgingScript)
    .txOut(destAddr, [
      { unit: policyId + ASSET_NAME_HEX, quantity: SUPPLY },
    ])
    .metadataValue(721, metadata)
    .changeAddress(walletAddress)
    .selectUtxosFrom(utxos);

  // Optional time-lock
  if (LOCK_AFTER_SLOT) {
    txBuilder.invalidHereafter(Number(LOCK_AFTER_SLOT));
    console.log("Time-lock:      before slot", LOCK_AFTER_SLOT);
  }

  const unsignedTx = await txBuilder.complete();

  console.log("Signing...");
  const signedTx = await wallet.signTx(unsignedTx);

  console.log("Submitting...");
  const txHash = await wallet.submitTx(signedTx);

  console.log("\n=== Mint Successful ===");
  console.log("Tx hash:   ", txHash);
  console.log("Policy ID: ", policyId);
  console.log("Asset:      XP (hex: 5850)");
  console.log("Supply:    ", SUPPLY);
  console.log("Sent to:   ", destAddr);

  const explorer =
    NETWORK_ID === 0
      ? `https://preprod.cardanoscan.io/transaction/${txHash}`
      : `https://cardanoscan.io/transaction/${txHash}`;
  console.log("Explorer:  ", explorer);
}

main().catch((err) => {
  console.error("Mint failed:", err.message ?? err);
  process.exit(1);
});
