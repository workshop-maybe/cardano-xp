#!/usr/bin/env npx ts-node
/**
 * Generate Test Wallets for E2E Testing
 *
 * Creates separate wallets for each test role with unique mnemonics.
 * Run this once to generate wallets, then fund them from the faucet.
 *
 * Usage:
 *   npx ts-node e2e/scripts/generate-test-wallets.ts
 *
 * Output:
 *   - Displays mnemonics and addresses for each role
 *   - Optionally saves to .env.test.local (gitignored)
 */

import { MeshWallet } from "@meshsdk/core";

// =============================================================================
// Configuration
// =============================================================================

const ROLES = ["student", "teacher", "owner", "contributor", "manager"] as const;
type Role = (typeof ROLES)[number];

const NETWORK_ID = 0; // 0 = preprod/preview, 1 = mainnet

// =============================================================================
// Wallet Generation
// =============================================================================

interface WalletInfo {
  role: Role;
  mnemonic: string[];
  address: string;
}

async function generateWallet(role: Role): Promise<WalletInfo> {
  // Generate a new mnemonic
  const mnemonic = MeshWallet.brew() as string[];

  // Create wallet to derive address
  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    key: {
      type: "mnemonic",
      words: mnemonic,
    },
  });

  // getChangeAddress may be sync or async depending on version
  const addressResult = wallet.getChangeAddress();
  const address = typeof addressResult === "string"
    ? addressResult
    : await addressResult;

  return {
    role,
    mnemonic,
    address: String(address),
  };
}

async function generateAllWallets(): Promise<WalletInfo[]> {
  console.log("🔐 Generating test wallets for E2E testing...\n");

  const wallets: WalletInfo[] = [];

  for (const role of ROLES) {
    const wallet = await generateWallet(role);
    wallets.push(wallet);
    console.log(`✓ Generated ${role} wallet`);
  }

  return wallets;
}

// =============================================================================
// Output Formatting
// =============================================================================

function formatEnvFile(wallets: WalletInfo[]): string {
  const lines = [
    "# =============================================================================",
    "# E2E Test Wallets - AUTO-GENERATED",
    "# =============================================================================",
    "#",
    "# Generated: " + new Date().toISOString(),
    "#",
    "# IMPORTANT: Keep these mnemonics secret!",
    "# Only use for preprod/preview testing, never mainnet.",
    "#",
    "# Fund these wallets at: https://docs.cardano.org/cardano-testnets/tools/faucet/",
    "#",
    "# =============================================================================",
    "",
  ];

  for (const wallet of wallets) {
    const envKey = `TEST_WALLET_${wallet.role.toUpperCase()}_MNEMONIC`;
    const addrKey = `TEST_WALLET_${wallet.role.toUpperCase()}_ADDRESS`;
    lines.push(`# ${wallet.role.charAt(0).toUpperCase() + wallet.role.slice(1)} Wallet`);
    lines.push(`${envKey}="${wallet.mnemonic.join(" ")}"`);
    lines.push(`# Address: ${wallet.address}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatConsoleOutput(wallets: WalletInfo[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("                        TEST WALLETS GENERATED");
  console.log("=".repeat(80) + "\n");

  for (const wallet of wallets) {
    console.log(`┌${"─".repeat(78)}┐`);
    console.log(`│ ${wallet.role.toUpperCase().padEnd(76)} │`);
    console.log(`├${"─".repeat(78)}┤`);
    console.log(`│ Address:                                                                     │`);
    console.log(`│ ${wallet.address.padEnd(76)} │`);
    console.log(`│                                                                              │`);
    console.log(`│ Mnemonic:                                                                    │`);

    // Split mnemonic into lines of 6 words
    const words = wallet.mnemonic;
    for (let i = 0; i < words.length; i += 6) {
      const line = words.slice(i, i + 6).join(" ");
      console.log(`│ ${line.padEnd(76)} │`);
    }
    console.log(`└${"─".repeat(78)}┘`);
    console.log("");
  }

  console.log("=".repeat(80));
  console.log("                           NEXT STEPS");
  console.log("=".repeat(80));
  console.log(`
1. SAVE THE MNEMONICS
   Copy the output above or save to .env.test.local

2. FUND THE WALLETS
   Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/
   - Select "Preprod Testnet"
   - Fund each address with test ADA
   - Recommended: 100 ADA per wallet

3. ADD TO ENVIRONMENT
   Option A: Set environment variables directly
   Option B: Create .env.test.local file (gitignored)

4. RUN TESTS
   BLOCKFROST_PREPROD_API_KEY="your-key" npm run test:e2e
`);
}

function formatAddressesForFaucet(wallets: WalletInfo[]): void {
  console.log("\n📋 ADDRESSES FOR FAUCET (copy one at a time):\n");
  for (const wallet of wallets) {
    console.log(`${wallet.role.padEnd(12)} ${wallet.address}`);
  }
  console.log("");
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  try {
    const wallets = await generateAllWallets();

    formatConsoleOutput(wallets);
    formatAddressesForFaucet(wallets);

    // Check if we should save to file
    const saveToFile = process.argv.includes("--save");

    if (saveToFile) {
      const fs = await import("fs");
      const envContent = formatEnvFile(wallets);
      const filePath = ".env.test.local";
      fs.writeFileSync(filePath, envContent);
      console.log(`✓ Saved to ${filePath}\n`);
    } else {
      console.log("💡 Tip: Run with --save to save to .env.test.local\n");
    }

    // Output env format for easy copying
    console.log("📝 ENV FORMAT (copy to .env or .env.test.local):\n");
    console.log(formatEnvFile(wallets));

  } catch (error) {
    console.error("Error generating wallets:", error);
    process.exit(1);
  }
}

main();
