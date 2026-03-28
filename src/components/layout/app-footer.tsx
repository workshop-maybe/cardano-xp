"use client";

import { env } from "~/env";

/**
 * AppFooter — system status bar visible on every page.
 * Communicates network, status, version, and platform info.
 */
export function AppFooter() {
  const network = env.NEXT_PUBLIC_CARDANO_NETWORK;

  return (
    <footer className="relative z-10 py-3 px-4 sm:px-6 border-t border-muted-foreground/30">
      <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-12 gap-y-1 text-[11px] text-muted-foreground/80 font-mono tracking-wide">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">network</span>
          <span className="text-secondary/80">{network}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">status</span>
          <span className="text-foreground/70">prototype</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">v</span>
          <span className="text-foreground/70">0.0.1</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">agent</span>
          <span className="text-emerald-500/80">ready for feedback</span>
        </span>
        <a
          href="https://github.com/workshop-maybe/cardano-xp/tree/main/journal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/70 hover:text-foreground/90 transition-colors"
        >
          build journal
        </a>
        <span className="text-muted-foreground/70">
          built on <span className="text-foreground/70">cardano</span>
        </span>
        <span className="text-muted-foreground/70">
          powered by{" "}
          <a
            href="https://andamio.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-foreground/90 transition-colors"
          >
            andamio
          </a>
        </span>
      </div>
    </footer>
  );
}
