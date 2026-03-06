/**
 * Setup E2E Test Course
 *
 * Creates a test course owned by the student wallet (e2e_student_01) and adds
 * the teacher wallet (e2e_teacher_01) as a teacher. This enables full Loop 2
 * testing with controlled permissions.
 *
 * Prerequisites:
 * - TEST_WALLET_STUDENT_MNEMONIC set (must have Access Token: e2e_student_01)
 * - TEST_WALLET_TEACHER_MNEMONIC set (must have Access Token: e2e_teacher_01)
 * - BLOCKFROST_PREPROD_API_KEY set
 * - Wallets funded with preprod ADA (50+ ADA each)
 *
 * Usage:
 * ```bash
 * cd e2e
 * set -a && source ../.env.test.local && set +a
 * BLOCKFROST_PREPROD_API_KEY="your-key" npx ts-node scripts/setup-e2e-course.ts
 * ```
 *
 * What this script does:
 * 1. Creates a new course with e2e_student_01 as owner
 * 2. Adds e2e_teacher_01 as a teacher to the course
 * 3. Creates a module (SLT) for assignment testing
 * 4. Outputs the course ID for use in tests
 */

import { MeshWallet, BlockfrostProvider } from "@meshsdk/core";

// =============================================================================
// Configuration
// =============================================================================

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_API_KEY;
const GATEWAY_URL = "https://preprod.api.andamio.io";
const API_KEY = "ant_0bYl6MAGxdnEzUxQPP_ljdnKhRPg4f7HKkQqu5EB0WY=";

// Wallet mnemonics from environment
const STUDENT_MNEMONIC = process.env.TEST_WALLET_STUDENT_MNEMONIC;
const TEACHER_MNEMONIC = process.env.TEST_WALLET_TEACHER_MNEMONIC;

// Expected aliases (must have Access Tokens minted)
const OWNER_ALIAS = "e2e_student_01"; // Student wallet acts as course owner
const TEACHER_ALIAS = "e2e_teacher_01";

// Course configuration
const E2E_COURSE = {
  title: "E2E Test Course",
  description: "Automated test course for E2E transaction loop testing",
  module: {
    code: "E2E101",
    title: "E2E Test Module",
    description: "Test module for Loop 2 transaction testing",
    slts: ["Complete the E2E test assignment"],
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

interface WalletData {
  used_addresses: string[];
  change_address: string;
}

// Known V2 Access Token policy ID (preprod)
const ACCESS_TOKEN_POLICY_ID = "29aa6a65f5c890cfa428d59b15dec6293bf4ff0a94305c957508dc78";

async function createWallet(mnemonic: string): Promise<MeshWallet> {
  if (!BLOCKFROST_API_KEY) {
    throw new Error("BLOCKFROST_PREPROD_API_KEY not set");
  }

  const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });

  return wallet;
}

async function getWalletData(wallet: MeshWallet): Promise<WalletData> {
  const address = await wallet.getChangeAddress();
  const usedAddresses = await wallet.getUsedAddresses();

  return {
    used_addresses: usedAddresses.length > 0 ? usedAddresses : [address],
    change_address: address,
  };
}

/**
 * Find Access Token unit in wallet UTXOs
 */
async function findAccessTokenUnit(wallet: MeshWallet): Promise<string | null> {
  const utxos = await wallet.getUtxos();

  for (const utxo of utxos) {
    for (const amount of utxo.output.amount) {
      if (amount.unit.startsWith(ACCESS_TOKEN_POLICY_ID)) {
        console.log(`[Token] Found Access Token: ${amount.unit}`);
        const assetName = amount.unit.slice(56);
        const decoded = Buffer.from(assetName, "hex").toString("utf8");
        console.log(`[Token] Alias: ${decoded.slice(1)}`); // Remove 'u' prefix
        return amount.unit;
      }
    }
  }

  return null;
}

async function authenticateWallet(
  wallet: MeshWallet
): Promise<{ jwt: string; alias: string | null }> {
  const address = await wallet.getChangeAddress();
  console.log(`[Auth] Authenticating wallet: ${address.slice(0, 30)}...`);

  // Find access token in wallet
  const accessTokenUnit = await findAccessTokenUnit(wallet);

  // Step 1: Create login session (no body required)
  const sessionResp = await fetch(`${GATEWAY_URL}/api/v2/auth/login/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({}),
  });

  if (!sessionResp.ok) {
    const errorText = await sessionResp.text();
    throw new Error(`Session creation failed: ${sessionResp.status} - ${errorText}`);
  }

  const session = (await sessionResp.json()) as { id: string; nonce: string };

  // Step 2: Sign nonce (hex-encoded)
  const nonceHex = Buffer.from(session.nonce, "utf8").toString("hex");
  const signature = await wallet.signData(nonceHex);

  // Step 3: Validate signature with access token unit if available
  const validateBody: Record<string, unknown> = {
    id: session.id,
    signature: {
      signature: signature.signature,
      key: signature.key,
    },
    address: address,
    convert_utf8: false,
  };

  if (accessTokenUnit) {
    validateBody.andamio_access_token_unit = accessTokenUnit;
    console.log(`[Auth] Including Access Token unit in validation`);
  }

  const validateResp = await fetch(`${GATEWAY_URL}/api/v2/auth/login/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(validateBody),
  });

  if (!validateResp.ok) {
    const errorText = await validateResp.text();
    throw new Error(`Validation failed: ${validateResp.status} - ${errorText}`);
  }

  const result = (await validateResp.json()) as {
    jwt: string;
    user: { access_token_alias: string | null };
  };

  console.log(`[Auth] Authentication successful`);
  console.log(`[Auth] Alias: ${result.user.access_token_alias ?? "(none)"}`);

  return {
    jwt: result.jwt,
    alias: result.user.access_token_alias,
  };
}

async function buildTransaction(
  endpoint: string,
  params: Record<string, unknown>,
  jwt: string
): Promise<string> {
  console.log(`[TX] Building: ${endpoint}`);

  const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Build failed: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { cborHex?: string; unsigned_tx?: string };
  const unsignedTx = result.cborHex || result.unsigned_tx;

  if (!unsignedTx) {
    throw new Error(`No unsigned transaction in response`);
  }

  console.log(`[TX] Built successfully`);
  return unsignedTx;
}

async function signAndSubmit(
  wallet: MeshWallet,
  unsignedTx: string
): Promise<string> {
  console.log(`[TX] Signing...`);
  const signedTx = await wallet.signTx(unsignedTx, true);

  console.log(`[TX] Submitting...`);
  const txHash = await wallet.submitTx(signedTx);

  console.log(`[TX] Submitted: ${txHash}`);
  console.log(`[TX] https://preprod.cardanoscan.io/transaction/${txHash}`);
  return txHash;
}

async function waitForTx(txHash: string, maxWaitMs: number = 120000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000;

  console.log(`[TX] Waiting for confirmation...`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(
        `https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}`,
        {
          headers: {
            project_id: BLOCKFROST_API_KEY!,
          },
        }
      );

      if (response.ok) {
        console.log(`[TX] Confirmed!`);
        return true;
      }
    } catch {
      // Not found yet
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  console.log(`[TX] Not confirmed within ${maxWaitMs}ms`);
  return false;
}

// =============================================================================
// Main Setup Flow
// =============================================================================

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  E2E TEST COURSE SETUP");
  console.log("=".repeat(70) + "\n");

  // Validate environment
  if (!BLOCKFROST_API_KEY) {
    console.error("ERROR: BLOCKFROST_PREPROD_API_KEY not set");
    process.exit(1);
  }

  if (!STUDENT_MNEMONIC) {
    console.error("ERROR: TEST_WALLET_STUDENT_MNEMONIC not set");
    console.error("Run: npx ts-node scripts/generate-test-wallets.ts --save");
    process.exit(1);
  }

  if (!TEACHER_MNEMONIC) {
    console.error("ERROR: TEST_WALLET_TEACHER_MNEMONIC not set");
    console.error("Run: npx ts-node scripts/generate-test-wallets.ts --save");
    process.exit(1);
  }

  // Create wallets
  console.log("Creating wallets...");
  const ownerWallet = await createWallet(STUDENT_MNEMONIC);
  const teacherWallet = await createWallet(TEACHER_MNEMONIC);

  const ownerAddress = await ownerWallet.getChangeAddress();
  const teacherAddress = await teacherWallet.getChangeAddress();

  console.log(`Owner (${OWNER_ALIAS}): ${ownerAddress.slice(0, 40)}...`);
  console.log(`Teacher (${TEACHER_ALIAS}): ${teacherAddress.slice(0, 40)}...`);

  // Check balances
  const ownerBalance = parseInt(await ownerWallet.getLovelace()) / 1_000_000;
  const teacherBalance = parseInt(await teacherWallet.getLovelace()) / 1_000_000;

  console.log(`Owner balance: ${ownerBalance.toFixed(2)} ADA`);
  console.log(`Teacher balance: ${teacherBalance.toFixed(2)} ADA`);

  if (ownerBalance < 20) {
    console.error("ERROR: Owner wallet needs at least 20 ADA");
    process.exit(1);
  }

  // Authenticate owner
  console.log("\n--- Step 1: Create Course ---");
  const ownerAuth = await authenticateWallet(ownerWallet);
  const ownerJwt = ownerAuth.jwt;
  const ownerWalletData = await getWalletData(ownerWallet);

  // Build course creation transaction
  // Schema: alias, teachers (array of aliases), initiator_data
  const courseParams = {
    alias: OWNER_ALIAS,
    teachers: [TEACHER_ALIAS], // Add teacher during creation
    initiator_data: ownerWalletData,
  };

  try {
    const unsignedTx = await buildTransaction(
      "/api/v2/tx/instance/owner/course/create",
      courseParams,
      ownerJwt
    );

    const txHash = await signAndSubmit(ownerWallet, unsignedTx);
    const confirmed = await waitForTx(txHash, 90000);

    if (!confirmed) {
      console.log("WARNING: Course creation not confirmed yet. Continue anyway...");
    }

    console.log(`\n✅ Course created!`);
    console.log(`   TX: ${txHash}`);

    // Wait a bit for the gateway to process
    console.log("Waiting for gateway to process course creation...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Get the course ID from the user's courses (POST request)
    console.log("\nFetching created course...");
    const coursesResp = await fetch(
      `${GATEWAY_URL}/api/v2/course/owner/courses/list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
          Authorization: `Bearer ${ownerJwt}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!coursesResp.ok) {
      const errText = await coursesResp.text();
      console.log(`Could not fetch courses list: ${coursesResp.status} - ${errText}`);
    } else {
      interface CourseData {
        course_id: string;
        owner: string;
        teachers: string[];
        created_slot: number;
        created_tx: string;
      }
      const courses = (await coursesResp.json()) as { data: CourseData[] };
      console.log(`Found ${courses.data?.length ?? 0} courses owned by ${OWNER_ALIAS}`);

      // Find the most recently created course (highest slot)
      const sortedCourses = [...(courses.data ?? [])].sort((a, b) => b.created_slot - a.created_slot);
      const e2eCourse = sortedCourses[0];

      if (e2eCourse) {
        console.log(`\nCourse ID: ${e2eCourse.course_id}`);
        console.log("\nAdd to your test file:");
        console.log(`const TEST_COURSE = {`);
        console.log(`  id: "${e2eCourse.course_id}",`);
        console.log(`  title: "${E2E_COURSE.title}",`);
        console.log(`};`);

        // Step 2: Add teacher
        console.log("\n--- Step 2: Add Teacher ---");

        const teacherParams = {
          alias: OWNER_ALIAS,
          course_id: e2eCourse.course_id,
          teachers_to_add: [TEACHER_ALIAS],
          teachers_to_remove: [],
          initiator_data: ownerWalletData,
        };

        const teacherTx = await buildTransaction(
          "/api/v2/tx/course/owner/teachers/manage",
          teacherParams,
          ownerJwt
        );

        const teacherTxHash = await signAndSubmit(ownerWallet, teacherTx);
        await waitForTx(teacherTxHash, 90000);

        console.log(`\n✅ Teacher ${TEACHER_ALIAS} added!`);
        console.log(`   TX: ${teacherTxHash}`);

        // Wait for gateway to process
        console.log("Waiting for gateway to process...");
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Step 3: Create module (as teacher)
        console.log("\n--- Step 3: Create Module ---");

        const teacherAuth = await authenticateWallet(teacherWallet);
        const teacherJwt = teacherAuth.jwt;
        const teacherWalletData = await getWalletData(teacherWallet);

        // Module schema: slts (array), allowed_student_state_ids (array), prereq_slt_hashes (array)
        const moduleParams = {
          alias: TEACHER_ALIAS,
          course_id: e2eCourse.course_id,
          modules_to_add: [
            {
              slts: E2E_COURSE.module.slts,
              allowed_student_state_ids: [], // No restrictions
              prereq_slt_hashes: [], // No prerequisites
            },
          ],
          modules_to_update: [],
          modules_to_remove: [],
          initiator_data: teacherWalletData,
        };

        const moduleTx = await buildTransaction(
          "/api/v2/tx/course/teacher/modules/manage",
          moduleParams,
          teacherJwt
        );

        const moduleTxHash = await signAndSubmit(teacherWallet, moduleTx);
        await waitForTx(moduleTxHash, 90000);

        console.log(`\n✅ Module ${E2E_COURSE.module.code} created!`);
        console.log(`   TX: ${moduleTxHash}`);

        console.log("\n" + "=".repeat(70));
        console.log("  SETUP COMPLETE!");
        console.log("=".repeat(70));
        console.log(`\nCourse ID: ${e2eCourse.course_id}`);
        console.log(`Module Code: ${E2E_COURSE.module.code}`);
        console.log(`Owner: ${OWNER_ALIAS}`);
        console.log(`Teacher: ${TEACHER_ALIAS}`);
        console.log("\nUpdate real-wallet-loop2-transactions.spec.ts with the new course ID.");
      } else {
        console.log("Course not found in list. It may take a moment to appear.");
      }
    }
  } catch (error) {
    console.error(`\n❌ Setup failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

main().catch(console.error);
