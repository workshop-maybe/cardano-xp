/**
 * ProjectCredentialClaim Transaction Component (V2 - Gateway Auto-Confirmation)
 *
 * UI for contributors to claim credential tokens after completing project tasks.
 * Uses PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM transaction type with gateway auto-confirmation.
 *
 * This transaction has no additional database side effects because:
 * 1. By the time a contributor claims credentials, all task completions have already been recorded.
 * 2. The credential token itself IS the proof of completion.
 * 3. Credential ownership is verified via blockchain queries, not database lookups.
 *
 * The gateway still tracks the transaction for analytics and state updates.
 *
 * @see ~/hooks/use-transaction.ts
 * @see ~/hooks/use-tx-stream.ts
 */

"use client";

import React from "react";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useTransaction } from "~/hooks/tx/use-transaction";
import { useTxStream } from "~/hooks/tx/use-tx-stream";
import { TransactionButton } from "./transaction-button";
import { TransactionStatus } from "./transaction-status";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardDescription,
  AndamioCardHeader,
  AndamioCardTitle,
} from "~/components/andamio/andamio-card";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
import { AndamioText } from "~/components/andamio/andamio-text";
import { CredentialIcon, ShieldIcon, ProjectIcon, LoadingIcon, SuccessIcon, TreasuryIcon } from "~/components/icons";
import { formatLovelace } from "~/lib/cardano-utils";
import { toast } from "sonner";
import { TRANSACTION_UI } from "~/config/transaction-ui";

export interface ProjectCredentialClaimProps {
  /**
   * Project NFT Policy ID
   */
  projectNftPolicyId: string;

  /**
   * Contributor state ID (56 char hex)
   */
  contributorStateId: string;

  /**
   * Project title for display
   */
  projectTitle?: string;

  /**
   * Pending reward amount in lovelace. When provided, the component
   * shows "Leave Project & Claim Rewards" messaging instead of the
   * default "Claim Project Credentials" messaging.
   */
  pendingRewardLovelace?: string;

  /**
   * Callback fired when claim is successful
   */
  onSuccess?: () => void | Promise<void>;
}

/**
 * ProjectCredentialClaim - Contributor UI for claiming project credentials (V2)
 *
 * This is the culmination of the contribution journey - a tamper-evident,
 * on-chain proof of achievement.
 *
 * @example
 * ```tsx
 * <ProjectCredentialClaim
 *   projectNftPolicyId="abc123..."
 *   contributorStateId="def456..."
 *   projectTitle="Bounty Program"
 *   onSuccess={() => refetchCredentials()}
 * />
 * ```
 */
export function ProjectCredentialClaim({
  projectNftPolicyId,
  contributorStateId,
  projectTitle,
  pendingRewardLovelace,
  onSuccess,
}: ProjectCredentialClaimProps) {
  const hasRewards = !!pendingRewardLovelace && pendingRewardLovelace !== "0";
  const { user, isAuthenticated } = useAndamioAuth();
  const { state, result, error, execute, reset } = useTransaction();

  // Watch for gateway confirmation after TX submission
  const { status: txStatus, isSuccess: txConfirmed, isFailed: txFailed } = useTxStream(
    result?.requiresDBUpdate ? result.txHash : null,
    {
      onComplete: (status) => {
        // "updated" means Gateway has confirmed TX AND updated DB
        if (status.state === "updated") {
          console.log("[ProjectCredentialClaim] TX confirmed and tracked by gateway");

          toast.success(hasRewards ? "Rewards Claimed!" : "Credentials Claimed!", {
            description: hasRewards
              ? `You've left the project and claimed ${formatLovelace(pendingRewardLovelace!)} + your credential`
              : projectTitle
                ? `You've earned your credentials from ${projectTitle}`
                : "Your project credentials have been minted",
          });

          void onSuccess?.();
        } else if (status.state === "failed" || status.state === "expired") {
          toast.error("Claim Failed", {
            description: status.last_error ?? "Transaction failed on-chain. Please try again.",
          });
        }
      },
    }
  );

  const ui = TRANSACTION_UI.PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM;

  const handleClaim = async () => {
    if (!user?.accessTokenAlias) {
      return;
    }

    await execute({
      txType: "PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM",
      params: {
        // Transaction API params (snake_case per V2 API)
        alias: user.accessTokenAlias,
        project_id: projectNftPolicyId,
        contributor_state_id: contributorStateId,
      },
      onSuccess: async (txResult) => {
        console.log("[ProjectCredentialClaim] TX submitted successfully!", txResult);
      },
      onError: (txError) => {
        console.error("[ProjectCredentialClaim] Error:", txError);
        toast.error("Claim Failed", {
          description: txError.message || "Failed to claim credentials",
        });
      },
    });
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const hasAccessToken = !!user.accessTokenAlias;

  return (
    <AndamioCard>
      <AndamioCardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CredentialIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <AndamioCardTitle>
              {hasRewards ? "Leave & Claim" : "Claim Project Credentials"}
            </AndamioCardTitle>
            <AndamioCardDescription>
              {hasRewards
                ? "Leave the project, claim your pending rewards, and mint your credential NFT"
                : "Mint your credential tokens for completed tasks"}
            </AndamioCardDescription>
          </div>
        </div>
      </AndamioCardHeader>
      <AndamioCardContent className="space-y-4">
        {/* Project Info */}
        {projectTitle && (
          <div className="flex flex-wrap items-center gap-2">
            <AndamioBadge variant="secondary" className="text-xs">
              <ProjectIcon className="h-3 w-3 mr-1" />
              {projectTitle}
            </AndamioBadge>
          </div>
        )}

        {/* Reward Amount (when claiming with rewards) */}
        {hasRewards && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TreasuryIcon className="h-4 w-4 text-primary" />
              <AndamioText className="font-medium">Pending Rewards</AndamioText>
              <AndamioBadge variant="default" className="bg-primary text-primary-foreground">
                {formatLovelace(pendingRewardLovelace!)}
              </AndamioBadge>
            </div>
            <AndamioText variant="small" className="text-xs">
              Your completed task rewards will be sent to your wallet along with your on-chain credential.
            </AndamioText>
          </div>
        )}

        {/* What You're Getting */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-primary" />
            <AndamioText className="font-medium">On-Chain Credentials</AndamioText>
          </div>
          <AndamioText variant="small" className="text-xs">
            Native Cardano tokens that serve as permanent, verifiable proof of your contributions
            and achievements in this project.
          </AndamioText>
        </div>

        {/* Transaction Status - Only show during processing, not when showing gateway confirmation */}
        {state !== "idle" && !txConfirmed && !(state === "success" && result?.requiresDBUpdate) && (
          <TransactionStatus
            state={state}
            result={result}
            error={error?.message ?? null}
            onRetry={() => reset()}
            messages={{
              success: "Transaction submitted! Waiting for confirmation...",
            }}
          />
        )}

        {/* Gateway Confirmation Status */}
        {state === "success" && result?.requiresDBUpdate && !txConfirmed && !txFailed && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <LoadingIcon className="h-5 w-5 animate-spin text-secondary" />
              <div className="flex-1">
                <AndamioText className="font-medium">Confirming on blockchain...</AndamioText>
                <AndamioText variant="small" className="text-xs">
                  {txStatus?.state === "pending" && "Waiting for block confirmation"}
                  {txStatus?.state === "confirmed" && "Processing credential mint"}
                  {!txStatus && "Registering transaction..."}
                </AndamioText>
                <AndamioText variant="small" className="text-xs text-muted-foreground">
                  This usually takes 20–60 seconds.
                </AndamioText>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {txConfirmed && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <SuccessIcon className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <AndamioText className="font-medium text-primary">
                  {hasRewards ? "Rewards & Credentials Claimed!" : "Credentials Claimed Successfully!"}
                </AndamioText>
                <AndamioText variant="small" className="text-xs">
                  {hasRewards
                    ? `${formatLovelace(pendingRewardLovelace!)} sent to your wallet and credential recorded on-chain`
                    : "Your credential has been recorded on-chain as proof of your contributions"}
                </AndamioText>
              </div>
            </div>
          </div>
        )}

        {/* Claim Button */}
        {state !== "success" && !txConfirmed && (
          <TransactionButton
            txState={state}
            onClick={handleClaim}
            disabled={!hasAccessToken}
            stateText={{
              idle: hasRewards ? "Leave & Claim" : ui.buttonText,
              fetching: "Preparing Claim...",
              signing: "Sign in Wallet",
              submitting: hasRewards ? "Leaving & Claiming..." : "Minting Credentials...",
            }}
            className="w-full"
          />
        )}
      </AndamioCardContent>
    </AndamioCard>
  );
}
