"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConnectWalletButton } from "~/components/auth/connect-wallet-button";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useTxStream } from "~/hooks/tx/use-tx-stream";
import {
  AccessTokenIcon,
  SuccessIcon,
  LoadingIcon,
  ExternalLinkIcon,
  InfoIcon,
} from "~/components/icons";
import { AndamioButton } from "~/components/andamio/andamio-button";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardDescription,
  AndamioCardHeader,
  AndamioCardTitle,
} from "~/components/andamio/andamio-card";
import { AndamioAlert, AndamioAlertDescription } from "~/components/andamio/andamio-alert";
import { AndamioText } from "~/components/andamio/andamio-text";
import { getTransactionExplorerUrl } from "~/lib/constants";
import { CARDANO_XP } from "~/config/cardano-xp";
import { env } from "~/env";

interface FirstLoginCardProps {
  alias: string;
  txHash: string | null;
}

/**
 * Celebration card shown after minting an access token.
 *
 * Flow:
 * 1. Shows TX submitted with real-time confirmation status via SSE
 * 2. Once confirmed, reveals "Sign In" button + ceremony message
 * 3. User clicks "Sign In" → logout clears session and disconnects wallet
 * 4. Card shows wallet connect button for re-connection
 * 5. Wallet connects → auto-auth picks up the new token → redirect to dashboard
 */
export function FirstLoginCard({ alias, txHash }: FirstLoginCardProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    user,
    isAuthenticating,
    authError,
    logout,
  } = useAndamioAuth();

  const [hasLoggedOut, setHasLoggedOut] = React.useState(false);

  // Track on-chain confirmation via gateway SSE
  const { status: txStatus, isSuccess: txConfirmed, isFailed: txFailed } = useTxStream(
    txHash,
  );

  const explorerUrl = txHash
    ? getTransactionExplorerUrl(txHash, env.NEXT_PUBLIC_CARDANO_NETWORK)
    : null;

  // After re-authenticating with the token, redirect to dashboard
  React.useEffect(() => {
    if (hasLoggedOut && isAuthenticated && user?.accessTokenAlias) {
      const timer = setTimeout(() => {
        router.push(CARDANO_XP.routes.course);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasLoggedOut, isAuthenticated, user?.accessTokenAlias, router]);

  const handleSignIn = React.useCallback(() => {
    setHasLoggedOut(true);
    logout();
  }, [logout]);

  // ── Re-authenticated with token: celebration + auto-redirect ──
  if (hasLoggedOut && isAuthenticated && user?.accessTokenAlias) {
    return (
      <AndamioCard className="w-full max-w-lg">
        <AndamioCardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <SuccessIcon className="h-8 w-8 text-primary" />
          </div>
          <AndamioCardTitle className="text-2xl">Welcome to Cardano XP</AndamioCardTitle>
          <AndamioCardDescription className="mx-auto max-w-sm text-center">
            Signed in as <span className="font-mono font-semibold text-foreground">{user.accessTokenAlias}</span>. Redirecting...
          </AndamioCardDescription>
        </AndamioCardHeader>
        <AndamioCardContent>
          <div className="flex items-center justify-center py-4">
            <LoadingIcon className="h-6 w-6 animate-spin text-primary" />
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // ── Logged out, wallet reconnecting / authenticating ──
  if (hasLoggedOut && isAuthenticating) {
    return (
      <AndamioCard className="w-full max-w-lg">
        <AndamioCardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <AccessTokenIcon className="h-8 w-8 text-primary" />
          </div>
          <AndamioCardTitle className="text-2xl">Signing In...</AndamioCardTitle>
          <AndamioCardDescription className="mx-auto max-w-sm text-center">
            Authenticating with your new access token
          </AndamioCardDescription>
        </AndamioCardHeader>
        <AndamioCardContent>
          <div className="flex items-center justify-center py-4">
            <LoadingIcon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // ── Auth error during re-auth ──
  if (hasLoggedOut && authError) {
    return (
      <AndamioCard className="w-full max-w-lg">
        <AndamioCardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <AccessTokenIcon className="h-8 w-8 text-primary" />
          </div>
          <AndamioCardTitle className="text-2xl">Almost There</AndamioCardTitle>
          <AndamioCardDescription className="mx-auto max-w-sm text-center">
            There was a problem signing in. Your token may still be confirming.
          </AndamioCardDescription>
        </AndamioCardHeader>
        <AndamioCardContent className="space-y-4">
          <AndamioAlert variant="destructive">
            <AndamioAlertDescription>{authError}</AndamioAlertDescription>
          </AndamioAlert>
          <AndamioText variant="small" className="text-center">
            Wait a moment for the transaction to confirm, then reconnect your wallet.
          </AndamioText>
          <ConnectWalletButton />
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // ── Logged out, waiting for wallet reconnect ──
  if (hasLoggedOut && !isAuthenticated) {
    return (
      <AndamioCard className="w-full max-w-lg">
        <AndamioCardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <AccessTokenIcon className="h-8 w-8 text-primary" />
          </div>
          <AndamioCardTitle className="text-2xl">
            Sign In as {alias}
          </AndamioCardTitle>
          <AndamioCardDescription className="mx-auto max-w-sm text-center">
            Connect your wallet to authenticate with your new access token.
          </AndamioCardDescription>
        </AndamioCardHeader>
        <AndamioCardContent className="space-y-4">
          <ConnectWalletButton />
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <InfoIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <AndamioText variant="small" className="text-muted-foreground">
              Once connected, you&apos;ll be signed in automatically with your new access token.
            </AndamioText>
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // ── Default: TX submitted, tracking confirmation, then ceremony ──
  return (
    <AndamioCard className="w-full max-w-lg">
      <AndamioCardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {txConfirmed ? (
            <SuccessIcon className="h-8 w-8 text-primary" />
          ) : (
            <AccessTokenIcon className="h-8 w-8 text-primary" />
          )}
        </div>
        <AndamioCardTitle className="text-2xl">
          {txConfirmed ? "Access Token Confirmed" : "Access Token Submitted"}
        </AndamioCardTitle>
        <AndamioCardDescription className="mx-auto max-w-sm text-center text-base">
          {txConfirmed ? (
            <>Your alias <span className="font-mono font-semibold text-foreground">{alias}</span> is now live.</>
          ) : (
            <>Your alias <span className="font-mono font-semibold text-foreground">{alias}</span> is being minted.</>
          )}
        </AndamioCardDescription>
      </AndamioCardHeader>
      <AndamioCardContent className="space-y-5">
        {/* TX confirmation status */}
        {!txConfirmed && !txFailed && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-center gap-3">
              <LoadingIcon className="h-5 w-5 animate-spin text-secondary" />
              <div>
                <AndamioText className="font-medium">
                  {txStatus?.state === "confirmed" ? "Confirmed on blockchain" : "Waiting for block confirmation"}
                </AndamioText>
                <AndamioText variant="small" className="text-xs">
                  {txStatus?.state === "pending" && "Transaction is in the mempool..."}
                  {txStatus?.state === "confirmed" && "Finalizing..."}
                  {!txStatus && "Registering transaction with gateway..."}
                </AndamioText>
              </div>
            </div>
          </div>
        )}

        {/* TX failed */}
        {txFailed && (
          <AndamioAlert variant="destructive">
            <AndamioAlertDescription>
              {txStatus?.last_error ?? "Transaction failed. Please try again."}
            </AndamioAlertDescription>
          </AndamioAlert>
        )}

        {/* TX explorer link */}
        {explorerUrl && (
          <div className="flex items-center justify-center">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View transaction on explorer
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* The ceremony — shown once TX is confirmed */}
        {txConfirmed && (
          <>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 text-center space-y-2">
              <AndamioText className="font-semibold text-lg">
                Welcome to Cardano XP
              </AndamioText>
              <AndamioText variant="muted">
                Now you can authenticate to Cardano XP
                <br />
                with your Access Token.
              </AndamioText>
            </div>

            {/* Sign In button — logs out and shows wallet connect */}
            <AndamioButton onClick={handleSignIn} size="lg" className="w-full">
              <AccessTokenIcon className="h-5 w-5" />
              Sign In with Your Access Token
            </AndamioButton>

            {/* Explanation */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <InfoIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <AndamioText variant="small" className="text-muted-foreground">
                This will reconnect your wallet and sign in with your new access token.
              </AndamioText>
            </div>
          </>
        )}

      </AndamioCardContent>
    </AndamioCard>
  );
}
