"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWallet } from "@meshsdk/react";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { RegistrationFlow } from "~/components/landing/registration-flow";
import { LoadingIcon } from "~/components/icons";
import { MARKETING } from "~/config/marketing";
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

  const copy = MARKETING.landingHero;

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

  // Default hero view - clean vertical CTAs
  return (
    <div className="flex flex-col items-center text-center max-w-4xl mx-auto gap-12 sm:gap-16 xp-mesh-bg">
      {/* Value prop: icon + text pairs with arrows */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-16">
        <div className="flex flex-col items-center gap-3 w-32 sm:w-44">
          <div className="relative h-24 w-24 sm:h-36 sm:w-36 translate-x-4">
            <Image
              src="/landing-page-icons/01-complete-courses-black.png"
              alt="Complete courses"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/landing-page-icons/01-complete-courses-white.png"
              alt="Complete courses"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain hidden dark:block"
            />
          </div>
          <span className="text-muted-foreground text-center text-sm sm:text-base">Complete courses.</span>
        </div>
        <span className="hidden sm:block text-3xl sm:text-4xl text-muted-foreground">→</span>
        <div className="flex flex-col items-center gap-3 w-32 sm:w-44">
          <div className="relative h-24 w-24 sm:h-36 sm:w-36">
            <Image
              src="/landing-page-icons/02-earn-credentials-black.png"
              alt="Earn credentials"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/landing-page-icons/02-earn-credentials-white.png"
              alt="Earn credentials"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain hidden dark:block"
            />
          </div>
          <span className="text-muted-foreground text-center text-sm sm:text-base translate-x-2">Earn credentials.</span>
        </div>
        <span className="hidden sm:block text-3xl sm:text-4xl text-muted-foreground">→</span>
        <div className="flex flex-col items-center gap-3 w-32 sm:w-44">
          <div className="relative h-24 w-24 sm:h-36 sm:w-36">
            <Image
              src="/landing-page-icons/03-join-projects-black.png"
              alt="Join projects"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/landing-page-icons/03-join-projects-white.png"
              alt="Join projects"
              fill
              sizes="(min-width: 640px) 144px, 96px"
              priority
              className="object-contain hidden dark:block"
            />
          </div>
          <span className="text-muted-foreground text-center text-sm sm:text-base">Join projects.</span>
        </div>
      </div>

      {/* CTA Cards */}
      <div className="w-full max-w-4xl">
        <hr className="border-border" />
      </div>
      <div className="w-full max-w-4xl">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center p-6 gap-4">
            <AndamioHeading level={3} size="base">Get Started</AndamioHeading>
            <p className="text-sm text-muted-foreground">
              Connect your wallet and create your on-chain identity
            </p>
            <AndamioButton onClick={handleEnter} className="w-full mt-auto">
              Enter
            </AndamioButton>
          </div>

          <div className="flex flex-col items-center text-center p-6 gap-4">
            <AndamioHeading level={3} size="base">Learn</AndamioHeading>
            <p className="text-sm text-muted-foreground">
              Take the course and earn credentials
            </p>
            <AndamioButton asChild variant="outline" className="w-full mt-auto">
              <Link href={CARDANO_XP.routes.course}>Learn</Link>
            </AndamioButton>
          </div>

          <div className="flex flex-col items-center text-center p-6 gap-4">
            <AndamioHeading level={3} size="base">Contribute</AndamioHeading>
            <p className="text-sm text-muted-foreground">
              Pick up tasks and earn XP tokens
            </p>
            <AndamioButton asChild variant="outline" className="w-full mt-auto">
              <Link href={CARDANO_XP.routes.project}>Contribute</Link>
            </AndamioButton>
          </div>
        </div>
      </div>
    </div>
  );
}
