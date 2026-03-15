"use client";

import React from "react";
import { AppNavBar } from "./app-nav-bar";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Full-screen app layout with unified glass nav bar.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden overscroll-none bg-background">
      <div className="pointer-events-none fixed inset-0 xp-grid" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-mesh-bg" aria-hidden />
      <AppNavBar />

      <main className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <div className="page-enter mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 has-[.full-bleed]:max-w-none has-[.full-bleed]:p-0 has-[.full-bleed]:h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
