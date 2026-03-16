"use client";

import { env } from "~/env";

/**
 * AppFooter — system status bar visible on every page.
 * Communicates network, status, version, and platform info.
 */
export function AppFooter() {
  const network = env.NEXT_PUBLIC_CARDANO_NETWORK;

  return (
    <footer className="relative z-10 py-3 px-6 border-t border-muted-foreground/30">
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-1 text-[11px] text-muted-foreground/60 font-mono tracking-wide">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">network</span>
          <span className="text-secondary/80">{network}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">status</span>
          <span className="text-foreground/70">prototype</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">v</span>
          <span className="text-foreground/70">0.0.1</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">agent</span>
          <span className="text-emerald-500/80">ready for feedback</span>
        </span>
        <span className="text-muted-foreground/40">
          built on cardano
        </span>
        <a
          href="https://andamio.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/40 hover:text-foreground/60 transition-colors"
        >
          powered by andamio
        </a>
      </div>
    </footer>
  );
}
