"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@meshsdk/react";
import { APP_NAVIGATION, isNavItemActive } from "~/config";
import { useAndamioAuth } from "~/contexts/andamio-auth-context";
import { useOwnerProjects, useManagerProjects } from "~/hooks/api";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { ConnectWalletButton } from "~/components/auth/connect-wallet-button";
import {
  LogOutIcon,
} from "~/components/icons";
import { cn } from "~/lib/utils";
import { env } from "~/env";
import { ADMIN_ROUTES } from "~/config/routes";

/**
 * Unified glass nav bar for all app routes.
 * Combines brand mark, navigation, auth status, and controls in one bar.
 */
export function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { name: walletName } = useWallet();
  const {
    isAuthenticated,
    user,
    logout,
  } = useAndamioAuth();
  const { data: ownedProjects } = useOwnerProjects();
  const { data: managedProjects } = useManagerProjects();
  const isAdmin = (ownedProjects?.length ?? 0) > 0 || (managedProjects?.length ?? 0) > 0;

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

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
          {isAdmin && (
            <Link
              href={ADMIN_ROUTES.hub}
              className={cn(
                "rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                isNavItemActive(pathname, "/admin")
                  ? "bg-primary/15 text-primary"
                  : "text-primary/70 hover:bg-primary/10 hover:text-primary"
              )}
            >
              Admin
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

          {/* User alias badge or mint prompt */}
          {isAuthenticated && user?.accessTokenAlias ? (
            <span className="hidden sm:inline-flex items-center h-6 px-2 rounded-sm bg-secondary/15 text-[11px] font-mono text-secondary">
              {user.accessTokenAlias}
            </span>
          ) : isAuthenticated && !user?.accessTokenAlias ? (
            <Link
              href="/andamio-access-token"
              className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-sm bg-secondary/15 text-[11px] font-medium text-secondary hover:bg-secondary/25 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              Mint Access Token
            </Link>
          ) : null}

          {/* Connected wallet indicator */}
          {isAuthenticated && walletName && (
            <span className="hidden md:inline-flex items-center text-[11px] text-muted-foreground">
              {walletName}
            </span>
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
