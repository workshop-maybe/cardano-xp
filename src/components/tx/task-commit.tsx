/**
 * TaskCommit Transaction Component (V2 - Gateway Auto-Confirmation)
 *
 * Unified UI for all task commitments. The COMMIT transaction handles:
 * 1. Enrolling the contributor (if not already enrolled)
 * 2. Claiming rewards from previous approved task (if any)
 * 3. Committing to a new task
 *
 * Uses PROJECT_CONTRIBUTOR_TASK_COMMIT transaction with gateway auto-confirmation.
 *
 * @see ~/hooks/use-transaction.ts
 * @see ~/hooks/use-tx-stream.ts
 * @see .claude/skills/project-manager/CONTRIBUTOR-TRANSACTION-MODEL.md
 */

"use client";

import React, { useMemo } from "react";
import { computeAssignmentInfoHash } from "@andamio/core/hashing";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useTransaction } from "~/hooks/tx/use-transaction";
import { useTxStream } from "~/hooks/tx/use-tx-stream";
import { TransactionButton } from "./transaction-button";
import { TransactionStatus } from "./transaction-status";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { AlertIcon, SuccessIcon, LoadingIcon } from "~/components/icons";
import { toast } from "sonner";
import { parseTxErrorMessage } from "~/lib/tx-error-messages";
import { TRANSACTION_UI } from "~/config/transaction-ui";
import type { JSONContent } from "@tiptap/core";

export interface TaskCommitProps {
  /**
   * Project NFT Policy ID
   */
  projectNftPolicyId: string;

  /**
   * Contributor state ID (56 char hex) - used for top-level API param
   */
  contributorStateId: string;

  /**
   * Project title for display
   */
  projectTitle?: string;

  /**
   * Task hash to commit to (64 char hex)
   */
  taskHash: string;

  /**
   * Task code for side effects
   */
  taskCode: string;

  /**
   * Task title for display
   */
  taskTitle?: string;

  /**
   * Task evidence content (Tiptap JSON)
   * May be null if user hasn't entered evidence yet
   */
  taskEvidence: JSONContent | null;

  /**
   * Is this the contributor's first commit (enrollment)?
   * Changes messaging to emphasize enrollment aspect.
   */
  isFirstCommit?: boolean;

  /**
   * Will this commit also claim rewards from a previous approved task?
   * Shows reward claiming info in the UI.
   */
  willClaimRewards?: boolean;

  /**
   * Task publication status - used for defensive validation.
   * If provided and not "ON_CHAIN", the component will not allow commits.
   */
  taskStatus?: "DRAFT" | "PENDING_TX" | "ON_CHAIN";

  /**
   * Hash of a previously ACCEPTED task in this project.
   * When provided, passed in TX registration metadata so the gateway
   * transitions the previous commitment from ACCEPTED → REWARDED.
   */
  previousTaskHash?: string;

  /**
   * Evidence hash from the contributor's previous submission.
   * When provided, compared against the current computed hash to
   * prevent resubmission of identical evidence.
   */
  previousEvidenceHash?: string;

  /**
   * Callback fired when commitment is successful
   */
  onSuccess?: () => void | Promise<void>;
}

/**
 * TaskCommit - Unified contributor UI for all task commits (V2)
 *
 * This single component handles:
 * - First-time enrollment (isFirstCommit=true)
 * - Subsequent task commitments
 * - Committing while claiming rewards (willClaimRewards=true)
 *
 * @example
 * ```tsx
 * // First commit (enrollment)
 * <TaskCommit
 *   projectNftPolicyId="abc123..."
 *   contributorStateId="def456..."
 *   taskHash="ghi789..."
 *   taskEvidence={editorContent}
 *   isFirstCommit={true}
 *   onSuccess={() => router.refresh()}
 * />
 *
 * // Subsequent commit with rewards
 * <TaskCommit
 *   projectNftPolicyId="abc123..."
 *   taskHash="ghi789..."
 *   taskEvidence={editorContent}
 *   willClaimRewards={true}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function TaskCommit({
  projectNftPolicyId,
  contributorStateId,
  projectTitle,
  taskHash,
  taskCode,
  taskTitle,
  taskEvidence,
  isFirstCommit = false,
  willClaimRewards = false,
  taskStatus,
  previousTaskHash,
  previousEvidenceHash,
  onSuccess,
}: TaskCommitProps) {
  const { user, isAuthenticated } = useAndamioAuth();
  const { state, result, error, execute, reset } = useTransaction();

  // Watch for gateway confirmation after TX submission
  const { status: txStatus, isSuccess: txConfirmed, isFailed: txFailed } = useTxStream(
    result?.requiresDBUpdate ? result.txHash : null,
    {
      onComplete: (status) => {
        const isStalled = status.state === "confirmed" && !!status.last_error;

        if (status.state === "updated" || isStalled) {
          let successTitle: string;
          let successDescription: string;

          if (isStalled) {
            successTitle = "Confirmed On-Chain!";
            successDescription = "Confirmed on-chain. Gateway sync pending — your data will update shortly.";
          } else if (isFirstCommit) {
            successTitle = "Welcome to the Project!";
            successDescription = `You've joined ${projectTitle ?? "this project"}`;
          } else if (willClaimRewards) {
            successTitle = "Committed & Rewards Claimed!";
            successDescription = `You've committed to ${taskTitle ?? taskCode} and claimed your rewards`;
          } else {
            successTitle = "Task Commitment Recorded!";
            successDescription = `You've committed to ${taskTitle ?? taskCode}`;
          }

          toast.success(successTitle, { description: successDescription });
          void onSuccess?.();
        } else if (status.state === "failed" || status.state === "expired") {
          toast.error("Commitment Failed", {
            description: status.last_error ?? "Please try again or contact support.",
          });
        }
      },
    }
  );

  // Compute evidence hash for display
  const computedHash = useMemo(() => {
    if (!taskEvidence || Object.keys(taskEvidence).length === 0) return null;
    try {
      return computeAssignmentInfoHash(taskEvidence);
    } catch {
      return null;
    }
  }, [taskEvidence]);

  const ui = TRANSACTION_UI.PROJECT_CONTRIBUTOR_TASK_COMMIT;
  const showAction = state !== "success" && !txConfirmed;

  const handleCommit = async () => {
    if (!user?.accessTokenAlias) return;

    if (!computedHash) {
      toast.error("Task evidence is required");
      return;
    }

    if (taskHash.length !== 64) {
      toast.error("Invalid task - please select a valid task");
      return;
    }

    // Block resubmission of identical evidence
    if (previousEvidenceHash && computedHash === previousEvidenceHash) {
      toast.error("Evidence unchanged", {
        description: "Update your submission before resubmitting.",
      });
      return;
    }

    const metadata: Record<string, string> = {
      task_hash: taskHash,
      evidence: JSON.stringify(taskEvidence),
      evidence_hash: computedHash,
    };

    // Pass previous task hash so gateway transitions ACCEPTED → REWARDED
    if (previousTaskHash) {
      metadata.previous_task_hash = previousTaskHash;
    }

    await execute({
      txType: "PROJECT_CONTRIBUTOR_TASK_COMMIT",
      params: {
        alias: user.accessTokenAlias,
        project_id: projectNftPolicyId,
        contributor_state_id: contributorStateId,
        task_hash: taskHash,
        task_info: computedHash,
      },
      metadata,
      onSuccess: async (txResult) => {
        console.log("[TaskCommit] TX submitted:", txResult.txHash);
      },
      onError: (txError) => {
        console.error("[TaskCommit] Error:", txError);
      },
    });
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const hasAccessToken = !!user.accessTokenAlias;
  const hasEvidence = taskEvidence && Object.keys(taskEvidence).length > 0;
  const hasValidTaskHash = taskHash.length === 64;
  const isTaskPublished = taskStatus === undefined || taskStatus === "ON_CHAIN";
  const canCommit = hasAccessToken && hasEvidence && hasValidTaskHash && isTaskPublished;

  // Dynamic button and success text based on context
  let buttonText: string;
  let successTitle: string;

  if (isFirstCommit) {
    buttonText = "Join & Submit";
    successTitle = "Welcome to the Project!";
  } else if (willClaimRewards) {
    buttonText = "Submit & Claim Rewards";
    successTitle = "Submitted & Rewards Claimed!";
  } else {
    buttonText = ui.buttonText;
    successTitle = "Feedback Submitted!";
  }

  return (
    <div className="space-y-3">
      {/* Transaction Status - Only show during processing */}
      {state !== "idle" && !txConfirmed && !(state === "success" && result?.requiresDBUpdate) && (
        <TransactionStatus
          state={state}
          result={result}
          error={parseTxErrorMessage(error?.message)}
          onRetry={() => reset()}
          messages={{
            success: "Transaction submitted! Waiting for confirmation...",
          }}
        />
      )}

      {/* Gateway Confirmation Status */}
      {state === "success" && result?.requiresDBUpdate && !txConfirmed && !txFailed && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <LoadingIcon className="h-4 w-4 animate-spin text-secondary shrink-0" />
          <AndamioText variant="small">
            {txStatus?.state === "pending" && "Waiting for block confirmation…"}
            {txStatus?.state === "confirmed" && "Processing database updates…"}
            {!txStatus && "Registering transaction…"}
          </AndamioText>
        </div>
      )}

      {/* Success */}
      {txConfirmed && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <SuccessIcon className="h-4 w-4 text-primary shrink-0" />
          <AndamioText variant="small" className="text-primary font-medium">
            {successTitle}
          </AndamioText>
        </div>
      )}

      {/* Validation Warning */}
      {(!hasValidTaskHash || !isTaskPublished) && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            {!hasValidTaskHash
              ? "Invalid task hash."
              : "Task not yet published on-chain."}
          </span>
        </div>
      )}

      {/* Commit Button */}
      {showAction && state === "idle" && (
        <ConfirmDialog
          trigger={
            <AndamioButton className="w-full" disabled={!canCommit}>
              {buttonText}
            </AndamioButton>
          }
          title={isFirstCommit ? "Join This Project?" : "Submit Your Feedback?"}
          description="This records your submission on-chain. Your project manager will review it."
          confirmText={buttonText}
          onConfirm={handleCommit}
        />
      )}
      {showAction && state !== "idle" && (
        <TransactionButton
          txState={state}
          onClick={handleCommit}
          disabled={!canCommit}
          stateText={{
            idle: buttonText,
            fetching: "Preparing…",
            signing: "Sign in Wallet",
            submitting: "Recording on-chain…",
          }}
          className="w-full"
        />
      )}
    </div>
  );
}
