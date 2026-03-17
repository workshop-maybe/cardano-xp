/**
 * Navigation Configuration
 *
 * Flat top-nav structure for the single-course, single-project app.
 */

import { PUBLIC_ROUTES, AUTH_ROUTES } from "./routes";

/**
 * Top-level app navigation items.
 * Studio link is handled conditionally in the nav bar component.
 */
export const APP_NAVIGATION = [
  { name: "About", href: "/about" },
  { name: "Access Token", href: "/andamio-access-token" },
  { name: "Contribute", href: PUBLIC_ROUTES.projects },
  { name: "Tokenomics", href: "/xp" },
  { name: "My XP", href: AUTH_ROUTES.credentials },
  { name: "Wallet", href: "/wallet" },
] as const;

/**
 * Check if a path is active (exact match or starts with href/).
 */
export function isNavItemActive(pathname: string, itemHref: string): boolean {
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}
