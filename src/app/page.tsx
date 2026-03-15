"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { env } from "~/env";
import { LandingHero } from "~/components/landing/landing-hero";
import { FirstLoginCard } from "~/components/landing/first-login-card";

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

  // Show FirstLoginCard after minting
  const showFirstLogin = !!mintedInfo;

  return (
    <main className="bg-background text-foreground h-dvh flex flex-col overflow-y-auto">
      <section className="flex flex-1 flex-col items-center px-6 pt-[6vh]">
        {/* Logo — pinned near top so it doesn't shift between states */}
        <Image
          src="/logos/logo-with-typography-stacked.svg"
          alt="Cardano XP"
          width={200}
          height={200}
          className="shrink-0"
          priority
        />

        {/* Card area — positioned closer to logo */}
        <div className="flex flex-1 w-full items-start justify-center pt-[8vh] sm:pt-[10vh]">
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
      <footer className="py-4 px-6 border-t border-border/50">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
          <span className="uppercase tracking-wider">{network}</span>
          <span className="text-border">•</span>
          <span>v2.0.0</span>
        </div>
      </footer>
    </main>
  );
}
