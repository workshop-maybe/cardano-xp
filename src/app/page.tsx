"use client";

import { useState, useCallback } from "react";
import { env } from "~/env";
import { LandingHero } from "~/components/landing/landing-hero";
import { FirstLoginCard } from "~/components/landing/first-login-card";
import { AppNavBar } from "~/components/layout/app-nav-bar";

interface MintedInfo {
  alias: string;
  txHash: string;
}

export default function Home() {
  const network = env.NEXT_PUBLIC_CARDANO_NETWORK;
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

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 border-t border-border/30">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/70 font-mono">
          <span className="uppercase tracking-wider">{network}</span>
          <span className="text-border/50">·</span>
          <a
            href="https://andamio.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Powered by Andamio
          </a>
        </div>
      </footer>
    </main>
  );
}
