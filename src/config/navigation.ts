/**
 * Navigation Configuration
 *
 * Grouped top-nav structure for the single-course, single-project app.
 * Items are organized into dropdown menu groups with descriptions.
 */

import { PUBLIC_ROUTES, AUTH_ROUTES } from "./routes";

export interface NavItem {
  name: string;
  href: string;
  description: string;
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
      {
        name: "About",
        href: "/about",
        description: "Why feedback matters and how Cardano XP works.",
      },
      {
        name: "Tokenomics",
        href: "/xp",
        description: "XP token design, supply, and distribution model.",
      },
      {
        name: "Sponsors",
        href: PUBLIC_ROUTES.sponsors,
        description: "Support the project and see who backs it.",
      },
      {
        name: "Project Wallet",
        href: PUBLIC_ROUTES.projectWallet,
        description: "Treasury activity and on-chain spending.",
      },
    ],
  },
  {
    label: "Participate",
    items: [
      {
        name: "Access Token",
        href: "/andamio-access-token",
        description: "Mint your on-chain identity to start contributing.",
      },
      {
        name: "Contribute",
        href: PUBLIC_ROUTES.projects,
        description: "Browse tasks, give feedback, and earn XP.",
      },
      {
        name: "My XP",
        href: AUTH_ROUTES.credentials,
        description: "Your credentials, XP balance, and proof of work.",
      },
      {
        name: "Wallet",
        href: "/wallet",
        description: "Connect, manage, and inspect your Cardano wallet.",
      },
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
