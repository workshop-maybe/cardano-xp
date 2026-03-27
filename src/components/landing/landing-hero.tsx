"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@meshsdk/react";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { RegistrationFlow } from "~/components/landing/registration-flow";
import { LoadingIcon } from "~/components/icons";
import { CARDANO_XP } from "~/config/cardano-xp";
import { env } from "~/env";

const V2_POLICY_ID = env.NEXT_PUBLIC_ACCESS_TOKEN_POLICY_ID;

interface LandingHeroProps {
  onMinted?: (info: { alias: string; txHash: string }) => void;
}

export function LandingHero({ onMinted }: LandingHeroProps) {
  const [showEnter, setShowEnter] = React.useState(false);
  const [v2Scanning, setV2Scanning] = React.useState(false);
  const router = useRouter();
  const { wallet } = useWallet();
  const {
    isAuthenticated,
    user,
    isAuthenticating,
    isWalletConnected,
  } = useAndamioAuth();

  // Scan for V2 token when authenticated but accessTokenAlias not yet set
  // This catches the case where the auth context sync hasn't completed yet
  React.useEffect(() => {
    if (!isAuthenticated || user?.accessTokenAlias || !isWalletConnected || !wallet) {
      setV2Scanning(false);
      return;
    }

    let cancelled = false;

    async function scanForV2Token() {
      setV2Scanning(true);
      try {
        const assets = await wallet.getBalanceMesh();
        const v2Asset = assets.find((asset: { unit: string }) =>
          asset.unit.startsWith(V2_POLICY_ID)
        );

        if (cancelled) return;

        if (v2Asset) {
          // User has V2 token - redirect to dashboard
          // The auth context will eventually sync the alias
          router.push(CARDANO_XP.routes.course);
        }
      } catch (err) {
        console.error("[LandingHero] Failed to scan for V2 token:", err);
      } finally {
        if (!cancelled) {
          setV2Scanning(false);
        }
      }
    }

    void scanForV2Token();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.accessTokenAlias, isWalletConnected, wallet, router]);

  // Auto-redirect authenticated users with access token to dashboard
  React.useEffect(() => {
    if (isAuthenticated && user?.accessTokenAlias) {
      router.push(CARDANO_XP.routes.course);
    }
  }, [isAuthenticated, user?.accessTokenAlias, router]);

  const handleEnter = () => {
    if (isAuthenticated && user?.accessTokenAlias) {
      router.push(CARDANO_XP.routes.course);
    } else {
      setShowEnter(true);
    }
  };

  // Authenticating state
  if (isWalletConnected && isAuthenticating) {
    return (
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
        <AndamioHeading level={1} size="4xl">
          Signing In...
        </AndamioHeading>
        <div className="mt-10 flex flex-col items-center gap-4">
          <LoadingIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          <AndamioText variant="muted">Please sign the message in your wallet</AndamioText>
        </div>
      </div>
    );
  }

  // Scanning for V2 token (to detect existing users before showing registration)
  if (v2Scanning) {
    return (
      <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
        <AndamioHeading level={1} size="4xl">
          Checking Your Wallet...
        </AndamioHeading>
        <div className="mt-10 flex flex-col items-center gap-4">
          <LoadingIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          <AndamioText variant="muted">Scanning for existing access tokens</AndamioText>
        </div>
      </div>
    );
  }

  // Show registration flow (handles wallet connect + minting)
  if (showEnter) {
    return (
      <RegistrationFlow onMinted={onMinted} onBack={() => setShowEnter(false)} />
    );
  }

  // Default hero view
  return (
    <div className="flex flex-col items-center text-center gap-10">
      {/* Brand mark */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-[3px] border-secondary flex items-center justify-center">
          <span className="font-display font-bold text-lg text-secondary">XP</span>
        </div>
        <span className="font-display font-semibold text-xl tracking-tight text-foreground">
          Cardano XP
        </span>
      </div>

      {/* Headline */}
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl leading-[1.1] tracking-tight text-foreground">
          Give{" "}
          <span className="text-secondary">feedback.</span>
          <br />
          Earn{" "}
          <span className="text-secondary">proof.</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Support Cardano development.
          <br />
          Get proof you contributed.
        </p>

        <p className="font-mono text-xs text-muted-foreground/60 tracking-wide">
          vibe-coded experiment &middot; built in public &middot; seeking feedback
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-3 w-full max-w-xs lg:max-w-none mt-6">
        <AndamioButton
          onClick={handleEnter}
          className="w-full lg:w-auto"
        >
          Connect Wallet
        </AndamioButton>
        <AndamioButton
          onClick={() => router.push("/about")}
          className="w-full lg:w-auto"
        >
          What is this?
        </AndamioButton>
      </div>
    </div>
  );
}
