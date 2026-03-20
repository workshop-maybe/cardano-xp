#!/usr/bin/env npx ts-node
/**
 * Fund Test Wallets
 *
 * Transfers ADA from one wallet to others for E2E testing.
 * By default, transfers from student wallet to teacher, owner, contributor, manager.
 *
 * Usage:
 *   npx ts-node e2e/scripts/fund-test-wallets.ts
 *   npx ts-node e2e/scripts/fund-test-wallets.ts --amount 50
 *   npx ts-node e2e/scripts/fund-test-wallets.ts --dry-run
 */

import { MeshWallet, BlockfrostProvider, Transaction } from "@meshsdk/core";

// =============================================================================
// Configuration
// =============================================================================

const NETWORK_ID = 0; // preprod
const DEFAULT_AMOUNT_ADA = 20; // Amount to send to each wallet

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const amountIndex = args.indexOf("--amount");
const amountArg = amountIndex !== -1 ? args[amountIndex + 1] : undefined;
const amountAda = amountArg ? parseInt(amountArg) : DEFAULT_AMOUNT_ADA;

// Wallet mnemonics from environment
const WALLETS = {
  student: process.env.TEST_WALLET_STUDENT_MNEMONIC?.split(" "),
  teacher: process.env.TEST_WALLET_TEACHER_MNEMONIC?.split(" "),
  owner: process.env.TEST_WALLET_OWNER_MNEMONIC?.split(" "),
  contributor: process.env.TEST_WALLET_CONTRIBUTOR_MNEMONIC?.split(" "),
  manager: process.env.TEST_WALLET_MANAGER_MNEMONIC?.split(" "),
};

// =============================================================================
// Main
// =============================================================================

async function main() {
  const blockfrostKey = process.env.BLOCKFROST_PREPROD_API_KEY;

  if (!blockfrostKey) {
    console.error("❌ BLOCKFROST_PREPROD_API_KEY not set");
    process.exit(1);
  }

  if (!WALLETS.student) {
    console.error("❌ TEST_WALLET_STUDENT_MNEMONIC not set (source wallet)");
    process.exit(1);
  }

  const provider = new BlockfrostProvider(blockfrostKey);

  // Create source wallet (student)
  const sourceWallet = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: WALLETS.student,
    },
  });

  const sourceAddress = await sourceWallet.getChangeAddress();
  const sourceBalance = parseInt(await sourceWallet.getLovelace());
  const sourceBalanceAda = sourceBalance / 1_000_000;

  console.log("\n" + "=".repeat(70));
  console.log("                    FUND TEST WALLETS");
  console.log("=".repeat(70));
  console.log(`\nSource: student wallet`);
  console.log(`Address: ${sourceAddress}`);
  console.log(`Balance: ${sourceBalanceAda.toFixed(2)} ADA`);
  console.log(`Amount per wallet: ${amountAda} ADA`);
  if (dryRun) {
    console.log(`Mode: DRY RUN (no transactions will be sent)`);
  }

  // Get recipient addresses
  const recipients: { role: string; address: string }[] = [];

  for (const [role, mnemonic] of Object.entries(WALLETS)) {
    if (role === "student" || !mnemonic) continue;

    const wallet = new MeshWallet({
      networkId: NETWORK_ID,
      key: {
        type: "mnemonic",
        words: mnemonic,
      },
    });

    const address = await wallet.getChangeAddress();
    recipients.push({ role, address: String(address) });
  }

  if (recipients.length === 0) {
    console.error("\n❌ No recipient wallets configured");
    console.error("   Set TEST_WALLET_TEACHER_MNEMONIC, TEST_WALLET_OWNER_MNEMONIC, etc.");
    process.exit(1);
  }

  // Calculate total needed
  const totalNeeded = recipients.length * amountAda;
  const txFeeEstimate = 0.5; // Rough estimate for tx fee

  console.log(`\nRecipients: ${recipients.length}`);
  console.log(`Total needed: ${totalNeeded} ADA + ~${txFeeEstimate} ADA fee`);

  if (sourceBalanceAda < totalNeeded + txFeeEstimate) {
    console.error(`\n❌ Insufficient funds!`);
    console.error(`   Have: ${sourceBalanceAda.toFixed(2)} ADA`);
    console.error(`   Need: ${(totalNeeded + txFeeEstimate).toFixed(2)} ADA`);
    process.exit(1);
  }

  console.log("\n" + "-".repeat(70));
  console.log("Recipients:");
  console.log("-".repeat(70));

  for (const { role, address } of recipients) {
    console.log(`  ${role.padEnd(12)} → ${amountAda} ADA`);
    console.log(`  ${" ".repeat(12)}   ${address}`);
  }

  if (dryRun) {
    console.log("\n✓ Dry run complete. No transactions sent.");
    return;
  }

  // Build transaction
  console.log("\n" + "-".repeat(70));
  console.log("Building transaction...");

  const tx = new Transaction({ initiator: sourceWallet });

  for (const { address } of recipients) {
    tx.sendLovelace(address, (amountAda * 1_000_000).toString());
  }

  // Build and sign
  const unsignedTx = await tx.build();
  const signedTx = await sourceWallet.signTx(unsignedTx);

  console.log("Submitting transaction...");
  const txHash = await sourceWallet.submitTx(signedTx);

  console.log("\n" + "=".repeat(70));
  console.log("✅ SUCCESS!");
  console.log("=".repeat(70));
  console.log(`\nTransaction Hash: ${txHash}`);
  console.log(`\nView on Cardanoscan:`);
  console.log(`https://preprod.cardanoscan.io/transaction/${txHash}`);

  console.log("\n⏳ Waiting for confirmation (this may take 1-2 minutes)...");
  console.log("   You can check wallet balances with:");
  console.log("   npx playwright test tests/real-wallet-tx.spec.ts --grep 'check all configured'");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
