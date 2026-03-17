"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@meshsdk/react";
import { useTheme } from "next-themes";
import { APP_NAVIGATION, isNavItemActive } from "~/config";
import { useAndamioAuth } from "~/contexts/andamio-auth-context";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { ConnectWalletButton } from "~/components/auth/connect-wallet-button";
import {
  LogOutIcon,
  LightModeIcon,
  DarkModeIcon,
} from "~/components/icons";
import { cn } from "~/lib/utils";
import { env } from "~/env";
import { STUDIO_ROUTES } from "~/config/routes";

/**
 * Unified glass nav bar for all app routes.
 * Combines brand mark, navigation, auth status, and controls in one bar.
 */
export function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { name: walletName } = useWallet();
  const { theme, setTheme } = useTheme();
  const {
    isAuthenticated,
    user,
    logout,
  } = useAndamioAuth();

  const [mounted, setMounted] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-40 xp-glass border-b border-border/30">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand mark + nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="flex items-center gap-2 mr-3 sm:mr-5">
            <div className="h-7 w-7 rounded-full border-2 border-secondary flex items-center justify-center">
              <span className="font-display font-bold text-xs text-secondary">XP</span>
            </div>
            <span className="hidden sm:block font-display font-semibold text-sm tracking-tight text-foreground">
              Cardano XP
            </span>
          </Link>

          {APP_NAVIGATION.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                isNavItemActive(pathname, item.href)
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              href={STUDIO_ROUTES.hub}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                isNavItemActive(pathname, STUDIO_ROUTES.hub)
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              Studio
            </Link>
          )}
        </div>

        {/* Right: Status + controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network badge (non-mainnet) */}
          {env.NEXT_PUBLIC_CARDANO_NETWORK !== "mainnet" && (
            <div className="flex items-center gap-1.5 rounded-sm bg-warning/15 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-sm bg-warning animate-pulse" />
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-warning">
                {env.NEXT_PUBLIC_CARDANO_NETWORK}
              </span>
            </div>
          )}

          {/* User alias badge */}
          {isAuthenticated && user?.accessTokenAlias && (
            <span className="hidden sm:inline-flex items-center h-6 px-2 rounded-sm bg-secondary/15 text-[11px] font-mono text-secondary">
              {user.accessTokenAlias}
            </span>
          )}

          {/* Connected wallet indicator */}
          {isAuthenticated && walletName && (
            <span className="hidden md:inline-flex items-center text-[11px] text-muted-foreground">
              {walletName}
            </span>
          )}

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <LightModeIcon className="h-3.5 w-3.5" />
              ) : (
                <DarkModeIcon className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Auth action */}
          {isAuthenticated ? (
            <AndamioButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOutIcon className="h-3 w-3" />}
              className="hidden sm:flex"
            >
              Sign Out
            </AndamioButton>
          ) : (
            <ConnectWalletButton label="Connect" />
          )}
        </div>
      </div>
    </nav>
  );
}
