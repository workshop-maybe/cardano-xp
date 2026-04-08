/**
 * Navigation Configuration
 *
 * Grouped top-nav structure for the single-course, single-project app.
 * Items are organized into dropdown menu groups.
 */

import { PUBLIC_ROUTES, AUTH_ROUTES } from "./routes";

export interface NavItem {
  name: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

/**
 * Grouped navigation for dropdown menus.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Project",
    items: [
      { name: "About", href: "/about" },
      { name: "Tokenomics", href: "/xp" },
      { name: "Sponsors", href: PUBLIC_ROUTES.sponsors },
      { name: "Transparency", href: PUBLIC_ROUTES.transparency },
    ],
  },
  {
    label: "Participate",
    items: [
      { name: "Access Token", href: "/andamio-access-token" },
      { name: "Contribute", href: PUBLIC_ROUTES.projects },
      { name: "My XP", href: AUTH_ROUTES.credentials },
      { name: "Wallet", href: "/wallet" },
    ],
  },
] as const;

/**
 * Check if a path is active (exact match or starts with href/).
 */
export function isNavItemActive(pathname: string, itemHref: string): boolean {
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

/**
 * Check if any item in a group is active.
 */
export function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavItemActive(pathname, item.href));
}
