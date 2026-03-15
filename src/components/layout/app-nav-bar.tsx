"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAVIGATION, isNavItemActive, BRANDING } from "~/config";
import { useAndamioAuth } from "~/contexts/andamio-auth-context";
import { cn } from "~/lib/utils";

/**
 * Horizontal top navigation bar — replaces the sidebar.
 * Shows Learn | Contribute | Credentials (+ Studio for authenticated users).
 */
export function AppNavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAndamioAuth();

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex h-10 items-center gap-1 px-3 sm:px-4">
        <Link href="/" className="mr-4 text-sm font-semibold tracking-tight">
          {BRANDING.name}
        </Link>
        {APP_NAVIGATION.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isNavItemActive(pathname, item.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {item.name}
          </Link>
        ))}
        {isAuthenticated && (
          <Link
            href="/studio"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isNavItemActive(pathname, "/studio")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            Studio
          </Link>
        )}
      </div>
    </nav>
  );
}
