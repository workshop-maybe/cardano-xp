"use client";

import { useState, useCallback } from "react";
import { LandingHero } from "~/components/landing/landing-hero";
import { FirstLoginCard } from "~/components/landing/first-login-card";
import { AppNavBar } from "~/components/layout/app-nav-bar";
import { AppFooter } from "~/components/layout/app-footer";

interface MintedInfo {
  alias: string;
  txHash: string;
}

export default function Home() {
  const [mintedInfo, setMintedInfo] = useState<MintedInfo | null>(null);

  const handleMinted = useCallback((info: MintedInfo) => {
    setMintedInfo(info);
  }, []);

  const showFirstLogin = !!mintedInfo;

  return (
    <main className="relative bg-background text-foreground h-dvh flex flex-col overflow-y-auto">
      {/* Layered background: grid → mesh → glow → vignette */}
      <div className="pointer-events-none fixed inset-0 xp-grid" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-mesh-deep" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-glow-spot" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-vignette" aria-hidden />

      <AppNavBar />

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {showFirstLogin ? (
            <FirstLoginCard
              alias={mintedInfo.alias}
              txHash={mintedInfo.txHash}
            />
          ) : (
            <LandingHero onMinted={handleMinted} />
          )}
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
