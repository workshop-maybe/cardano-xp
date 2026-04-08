/**
 * Mint 100,000 XP tokens using Mesh SDK
 */

import "dotenv/config";

import {
  BlockfrostProvider,
  MeshTxBuilder,
  resolveNativeScriptHash,
  resolvePaymentKeyHash,
  serializeNativeScript,
  stringToHex,
} from "@meshsdk/core";
import type { NativeScript } from "@meshsdk/common";
import { MeshWallet } from "@meshsdk/core";

// ---------------------------------------------------------------------------
// Config from environment
// ---------------------------------------------------------------------------

const BLOCKFROST_KEY = process.env.BLOCKFROST_KEY;
const SKEY = process.env.WALLET_SKEY; // optional (if not using MNEMONIC)
const STAKE_KEY = process.env.WALLET_STAKE_SKEY; // optional (if not using MNEMONIC)
const NETWORK_ID = Number(process.env.NETWORK_ID ?? "0"); // 0 = preprod, 1 = mainnet
const DEST_ADDR = process.env.DEST_ADDR; // optional override
const LOCK_AFTER_SLOT = process.env.LOCK_AFTER_SLOT; // optional time-lock
const DRY_RUN = process.argv.includes("--dry-run");

if (!BLOCKFROST_KEY) {
  console.error("Error: BLOCKFROST_KEY env var is required");
  process.exit(1);
}
if (!SKEY) {
  console.error("Error: WALLET_SKEY env var is required");
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

  console.log("Creating wallet from skey...");
  const wallet = new MeshWallet({
    networkId: NETWORK_ID as 0 | 1,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "cli",
      payment: SKEY as string,
      stake: STAKE_KEY as string
    },
  });
  await wallet.init();

  // @ts-ignore                                                                                                                                                                                                                                
  console.log("Mesh stake pubkey:", wallet._wallet.getAccount().stakeKeyHex);  

  const walletAddress = await wallet.getChangeAddress();
  const destAddr = DEST_ADDR ?? walletAddress;
  console.log("Wallet address:", walletAddress);
  console.log("Destination:   ", destAddr);

  // Build native script — if LOCK_AFTER_SLOT is set, bake it into the policy
  // so the policy is permanently locked after that slot (no future mints possible)
  const keyHash = resolvePaymentKeyHash(walletAddress);
  const nativeScript: NativeScript = LOCK_AFTER_SLOT
    ? {
        type: "all",
        scripts: [
          { type: "sig", keyHash },
          { type: "before", slot: LOCK_AFTER_SLOT },
        ],
      }
    : { type: "sig", keyHash };

  const { scriptCbor: scriptCborRaw } = serializeNativeScript(nativeScript);
  const scriptCbor = scriptCborRaw!;
  const policyId = resolveNativeScriptHash(nativeScript);
  console.log("Policy ID:     ", policyId);
  console.log("Asset:          " + policyId + "." + ASSET_NAME_HEX);
  if (LOCK_AFTER_SLOT) {
    console.log("Policy locked:  after slot", LOCK_AFTER_SLOT);
  } else {
    console.log("WARNING:        no time-lock — policy can mint again");
  }

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
    .mintingScript(scriptCbor)
    .txOut(destAddr, [
      { unit: policyId + ASSET_NAME_HEX, quantity: SUPPLY },
    ])
    .metadataValue(721, metadata)
    .changeAddress(walletAddress)
    .selectUtxosFrom(utxos);

  // Transaction must be submitted before the policy lock slot
  if (LOCK_AFTER_SLOT) {
    txBuilder.invalidHereafter(Number(LOCK_AFTER_SLOT));
  }

  const unsignedTx = await txBuilder.complete();

  if (DRY_RUN) {
    console.log("\n=== Dry Run ===");
    console.log("Policy ID: ", policyId);
    console.log("Asset:      XP (hex: 5850)");
    console.log("Supply:    ", SUPPLY);
    console.log("Dest:      ", destAddr);
    console.log("TX built successfully — not signed or submitted.");
    return;
  }

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