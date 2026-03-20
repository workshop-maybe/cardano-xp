/**
 * CredentialClaim Transaction Component (V2 - Gateway Auto-Confirmation)
 *
 * Elegant UI for students to claim their credential token after completing
 * all required assignments for a course module.
 *
 * This is the culmination of the learning journey - a tamper-evident,
 * on-chain proof of achievement.
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
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { CredentialIcon, ShieldIcon, LoadingIcon, SuccessIcon } from "~/components/icons";
import { toast } from "sonner";
import { TRANSACTION_UI } from "~/config/transaction-ui";

export interface CredentialClaimProps {
  /**
   * Course NFT Policy ID
   */
  courseId: string;

  /**
   * Module code for the credential being claimed
   */
  moduleCode: string;

  /**
   * Module title for display
   */
  moduleTitle?: string;

  /**
   * Course title for display
   */
  courseTitle?: string;

  /**
   * Callback fired when claim is successful
   */
  onSuccess?: () => void | Promise<void>;
}

/**
 * CredentialClaim - Student UI for claiming a course credential (V2)
 *
 * This transaction has no database side effects because:
 * 1. By the time a student claims a credential, all assignment commitments
 *    have already been completed and recorded via earlier transactions.
 * 2. The credential token itself IS the proof of completion.
 * 3. Credential ownership is verified via blockchain queries, not database lookups.
 *
 * @example
 * ```tsx
 * <CredentialClaim
 *   courseId="abc123..."
 *   moduleCode="MODULE_1"
 *   moduleTitle="Introduction to Cardano"
 *   courseTitle="Cardano Developer Course"
 *   onSuccess={() => refetchCredentials()}
 * />
 * ```
 */
export function CredentialClaim({
  courseId,
  moduleCode,
  moduleTitle,
  courseTitle,
  onSuccess,
}: CredentialClaimProps) {
  const { user, isAuthenticated } = useAndamioAuth();
  const { state, result, error, execute, reset } = useTransaction();

  // Watch for gateway confirmation after TX submission
  const { status: txStatus, isSuccess: txConfirmed, isFailed: txFailed } = useTxStream(
    result?.requiresDBUpdate ? result.txHash : null,
    {
      onComplete: (status) => {
        // "updated" means Gateway has confirmed TX AND updated DB
        if (status.state === "updated") {
          console.log("[CredentialClaim] TX confirmed and DB updated by gateway");

          toast.success("Credential Claimed!", {
            description: `You've earned your credential for ${moduleTitle ?? moduleCode}`,
          });

          void onSuccess?.();
        } else if (status.state === "failed" || status.state === "expired") {
          toast.error("Claim Failed", {
            description: status.last_error ?? "Please try again or contact support.",
          });
        }
      },
    }
  );

  const ui = TRANSACTION_UI.COURSE_STUDENT_CREDENTIAL_CLAIM;

  const handleClaim = async () => {
    if (!user?.accessTokenAlias) {
      return;
    }

    await execute({
      txType: "COURSE_STUDENT_CREDENTIAL_CLAIM",
      params: {
        alias: user.accessTokenAlias,
        course_id: courseId,
      },
      onSuccess: async (txResult) => {
        console.log("[CredentialClaim] TX submitted successfully!", txResult);
      },
      onError: (txError) => {
        console.error("[CredentialClaim] Error:", txError);
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
            <AndamioCardTitle>{ui.title}</AndamioCardTitle>
            <AndamioCardDescription>
              Claim your proof of achievement for this module
            </AndamioCardDescription>
          </div>
        </div>
      </AndamioCardHeader>
      <AndamioCardContent className="space-y-4">
        {/* Credential Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AndamioBadge variant="secondary" className="text-xs">
              {moduleTitle ?? moduleCode}
            </AndamioBadge>
            {courseTitle && (
              <AndamioBadge variant="outline" className="text-xs text-muted-foreground">
                {courseTitle}
              </AndamioBadge>
            )}
          </div>
        </div>

        {/* What You're Getting */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-primary" />
            <AndamioText className="font-medium">Permanent Credential</AndamioText>
          </div>
          <AndamioText variant="small" className="text-xs">
            A permanent, verifiable proof of your achievement stored on the blockchain.
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
                  {txStatus?.state === "confirmed" && "Processing database updates"}
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
                  Credential Claimed!
                </AndamioText>
                <AndamioText variant="small" className="text-xs">
                  Your credential has been added to your wallet!
                </AndamioText>
              </div>
            </div>
          </div>
        )}

        {/* Claim Button - with confirmation since it's an irreversible on-chain action */}
        {state !== "success" && !txConfirmed && state === "idle" && (
          <ConfirmDialog
            trigger={
              <AndamioButton className="w-full" disabled={!hasAccessToken}>
                <CredentialIcon className="h-4 w-4 mr-2" />
                {ui.buttonText}
              </AndamioButton>
            }
            title="Claim Your Credential?"
            description="This records a permanent credential on-chain as proof of your achievement. This action cannot be undone."
            confirmText="Claim Credential"
            onConfirm={handleClaim}
          />
        )}
        {state !== "success" && !txConfirmed && state !== "idle" && (
          <TransactionButton
            txState={state}
            onClick={handleClaim}
            disabled={!hasAccessToken}
            stateText={{
              idle: ui.buttonText,
              fetching: "Preparing Claim...",
              signing: "Sign in Wallet",
              submitting: "Claiming Credential...",
            }}
            className="w-full"
          />
        )}
      </AndamioCardContent>
    </AndamioCard>
  );
}
