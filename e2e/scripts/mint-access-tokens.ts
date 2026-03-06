#!/usr/bin/env npx ts-node
/**
 * Mint Access Tokens for Test Wallets
 *
 * This script mints Access Tokens for the role-based test wallets
 * by calling the Gateway API directly and signing with real wallets.
 *
 * Usage:
 *   npx ts-node e2e/scripts/mint-access-tokens.ts
 *   npx ts-node e2e/scripts/mint-access-tokens.ts --role student
 *   npx ts-node e2e/scripts/mint-access-tokens.ts --role teacher
 *   npx ts-node e2e/scripts/mint-access-tokens.ts --dry-run
 */

import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

// =============================================================================
// Configuration
// =============================================================================

const NETWORK_ID = 0; // preprod
const GATEWAY_URL = process.env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL ?? "https://preprod.api.andamio.io";
const API_KEY = process.env.ANDAMIO_API_KEY ?? "ant_0bYl6MAGxdnEzUxQPP_ljdnKhRPg4f7HKkQqu5EB0WY=";
const BLOCKFROST_KEY = process.env.BLOCKFROST_PREPROD_API_KEY;

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const roleIndex = args.indexOf("--role");
const targetRole = roleIndex !== -1 ? args[roleIndex + 1] : null;

// Role configurations with unique aliases
const ROLE_CONFIGS = {
  student: {
    mnemonic: process.env.TEST_WALLET_STUDENT_MNEMONIC?.split(" "),
    alias: "e2e_student_01",
  },
  teacher: {
    mnemonic: process.env.TEST_WALLET_TEACHER_MNEMONIC?.split(" "),
    alias: "e2e_teacher_01",
  },
  owner: {
    mnemonic: process.env.TEST_WALLET_OWNER_MNEMONIC?.split(" "),
    alias: "e2e_owner_01",
  },
  contributor: {
    mnemonic: process.env.TEST_WALLET_CONTRIBUTOR_MNEMONIC?.split(" "),
    alias: "e2e_contrib_01",
  },
  manager: {
    mnemonic: process.env.TEST_WALLET_MANAGER_MNEMONIC?.split(" "),
    alias: "e2e_manager_01",
  },
} as const;

type Role = keyof typeof ROLE_CONFIGS;

// =============================================================================
// Main Functions
// =============================================================================

async function checkExistingAccessToken(address: string): Promise<boolean> {
  try {
    // Query Andamioscan for access tokens at this address
    const response = await fetch(
      `https://preprod.andamioscan.io/api/v0/addresses/${address}/utxos`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // Check if any UTXO contains an access token
    // Access tokens have a specific policy ID pattern
    return data.some((utxo: { value: { multiasset?: Record<string, unknown> } }) => {
      const multiasset = utxo.value?.multiasset;
      return multiasset && Object.keys(multiasset).length > 0;
    });
  } catch {
    return false;
  }
}

async function mintAccessToken(role: Role): Promise<{ txHash: string; alias: string } | null> {
  const config = ROLE_CONFIGS[role];

  if (!config.mnemonic) {
    console.log(`  ❌ No mnemonic configured for ${role}`);
    return null;
  }

  if (!BLOCKFROST_KEY) {
    console.log(`  ❌ BLOCKFROST_PREPROD_API_KEY not set`);
    return null;
  }

  const provider = new BlockfrostProvider(BLOCKFROST_KEY);

  // Create wallet
  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: config.mnemonic,
    },
  });

  const address = await wallet.getChangeAddress();
  const balance = parseInt(await wallet.getLovelace());
  const balanceAda = balance / 1_000_000;

  console.log(`\n  Role: ${role}`);
  console.log(`  Alias: ${config.alias}`);
  console.log(`  Address: ${address}`);
  console.log(`  Balance: ${balanceAda.toFixed(2)} ADA`);

  // Check if already has Access Token
  // const hasToken = await checkExistingAccessToken(address);
  // if (hasToken) {
  //   console.log(`  ✅ Already has Access Token - skipping`);
  //   return null;
  // }

  if (balanceAda < 10) {
    console.log(`  ❌ Insufficient funds (need ~10 ADA)`);
    return null;
  }

  if (dryRun) {
    console.log(`  🔍 DRY RUN - would mint Access Token`);
    return null;
  }

  // Step 1: Build transaction via Gateway API
  console.log(`  📝 Building transaction...`);

  const buildPayload = {
    alias: config.alias,
    initiator_data: address,
  };

  const buildResponse = await fetch(
    `${GATEWAY_URL}/api/v2/tx/global/user/access-token/mint`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(buildPayload),
    }
  );

  if (!buildResponse.ok) {
    const errorText = await buildResponse.text();
    console.log(`  ❌ Build failed: ${buildResponse.status}`);
    console.log(`     ${errorText}`);
    return null;
  }

  const buildResult = await buildResponse.json();
  const unsignedTx = buildResult.cborHex || buildResult.unsigned_tx || buildResult.unsignedTx;

  if (!unsignedTx) {
    console.log(`  ❌ No unsigned transaction in response`);
    console.log(`     Response: ${JSON.stringify(buildResult).slice(0, 200)}`);
    return null;
  }

  console.log(`  ✅ Transaction built`);

  // Step 2: Sign transaction
  console.log(`  ✍️  Signing transaction...`);

  let signedTx: string;
  try {
    signedTx = await wallet.signTx(unsignedTx, true);
  } catch (error) {
    console.log(`  ❌ Signing failed: ${(error as Error).message}`);
    return null;
  }

  console.log(`  ✅ Transaction signed`);

  // Step 3: Submit transaction
  console.log(`  📤 Submitting transaction...`);

  let txHash: string;
  try {
    txHash = await wallet.submitTx(signedTx);
  } catch (error) {
    console.log(`  ❌ Submit failed: ${(error as Error).message}`);
    return null;
  }

  console.log(`  ✅ Transaction submitted!`);
  console.log(`  📋 TX Hash: ${txHash}`);
  console.log(`  🔗 https://preprod.cardanoscan.io/transaction/${txHash}`);

  return { txHash, alias: config.alias };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("            MINT ACCESS TOKENS FOR TEST WALLETS");
  console.log("=".repeat(70));

  if (!BLOCKFROST_KEY) {
    console.error("\n❌ BLOCKFROST_PREPROD_API_KEY not set");
    process.exit(1);
  }

  if (dryRun) {
    console.log("\n🔍 DRY RUN MODE - No transactions will be submitted\n");
  }

  const roles: Role[] = targetRole
    ? [targetRole as Role]
    : ["student", "teacher"];

  const results: { role: string; txHash?: string; alias?: string; error?: string }[] = [];

  for (const role of roles) {
    try {
      const result = await mintAccessToken(role);
      if (result) {
        results.push({ role, txHash: result.txHash, alias: result.alias });
      } else {
        results.push({ role, error: "Skipped or failed" });
      }
    } catch (error) {
      results.push({ role, error: (error as Error).message });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("                         SUMMARY");
  console.log("=".repeat(70));

  for (const result of results) {
    if (result.txHash) {
      console.log(`\n✅ ${result.role}: Access Token minted`);
      console.log(`   Alias: ${result.alias}`);
      console.log(`   TX: ${result.txHash}`);
    } else {
      console.log(`\n⚠️  ${result.role}: ${result.error}`);
    }
  }

  const successCount = results.filter(r => r.txHash).length;
  if (successCount > 0) {
    console.log(`\n⏳ Wait 1-2 minutes for transactions to confirm on preprod`);
    console.log(`   Then run: npx playwright test e2e/tests/real-wallet-loop2.spec.ts`);
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
