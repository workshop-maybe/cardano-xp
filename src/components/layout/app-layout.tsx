"use client";

import React from "react";
import { AppNavBar } from "./app-nav-bar";
import { AuthStatusBar } from "./auth-status-bar";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Full-screen app layout with top nav bar.
 * AuthStatusBar → AppNavBar → full-width content.
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden overscroll-none bg-background">
      <AuthStatusBar />
      <AppNavBar />

      <main className="flex-1 overflow-y-auto overscroll-contain bg-muted/30">
        <div className="page-enter mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 has-[.full-bleed]:max-w-none has-[.full-bleed]:p-0 has-[.full-bleed]:h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
