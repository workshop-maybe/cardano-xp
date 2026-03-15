/**
 * Navigation Configuration
 *
 * Flat top-nav structure for the single-course, single-project app.
 */

import { CARDANO_XP } from "./cardano-xp";

/**
 * Top-level app navigation items.
 * Studio link is handled conditionally in the nav bar component.
 */
export const APP_NAVIGATION = [
  { name: "About", href: "/about" },
  { name: "Contribute", href: CARDANO_XP.routes.project },
  { name: "Tokenomics", href: "/xp" },
  { name: "My XP", href: "/credentials" },
] as const;

/**
 * Check if a path is active (exact match or starts with href/).
 */
export function isNavItemActive(pathname: string, itemHref: string): boolean {
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}
