/**
 * Branding Configuration
 *
 * Centralizes app identity for easy customization.
 */

import type { Metadata } from "next";

export const BRANDING = {
  /** App name displayed in header, title, etc. */
  name: "Cardano XP",

  /** Secondary text */
  tagline: "Learn. Contribute. Earn.",

  /** Full app title for page titles */
  fullTitle: "Cardano XP",

  /** Short description for meta tags */
  description: "Learn how to use Cardano XP, contribute feedback, and earn on-chain reputation tokens.",

  /** Longer description for landing pages */
  longDescription:
    "Cardano XP is a single-purpose dApp built on Andamio. Complete the course, earn credentials, contribute to the feedback project, and collect XP — a reputation token on Cardano.",

  /** URL paths for logos/icons */
  logo: {
    /** Horizontal logo for light backgrounds */
    horizontal: "/logos/logo-with-typography.svg",
    /** Horizontal logo for dark backgrounds */
    horizontalDark: "/logos/logo-with-typography-dark.svg",
    /** Stacked logo for light backgrounds */
    stacked: "/logos/logo-with-typography-stacked.svg",
    /** Stacked logo for dark backgrounds */
    stackedDark: "/logos/logo-with-typography-stacked-dark.svg",
    /** Legacy icon reference */
    icon: "ModuleIcon",
    /** Favicon path */
    favicon: "/favicon.ico",
    /** OG image for social sharing */
    ogImage: "/og-image.png",
  },

  /** External links */
  links: {
    /** Main website */
    website: "https://andamio.io",
    /** Documentation */
    docs: "https://docs.andamio.io",
    /** GitHub repository */
    github: "https://github.com/Andamio-Platform",
    /** Twitter/X handle */
    twitter: "https://twitter.com/AndamioPlatform",
  },

  /** Support/contact info */
  support: {
    email: "support@andamio.io",
  },

  /**
   * Documentation URLs for transaction help links.
   */
  docs: {
    baseUrl: "https://docs.andamio.io",
    transactionPaths: {
      accessTokenMint:
        "/docs/protocol/v2/transactions/global/general/access-token/mint",
      courseCreate:
        "/docs/protocol/v2/transactions/instance/owner/course/create",
      projectCreate:
        "/docs/protocol/v2/transactions/instance/owner/project/create",
      teachersManage:
        "/docs/protocol/v2/transactions/course/owner/teachers/manage",
      modulesManage:
        "/docs/protocol/v2/transactions/course/teacher/modules/manage",
      assignmentsAssess:
        "/docs/protocol/v2/transactions/course/teacher/assignments/assess",
      assignmentCommit:
        "/docs/protocol/v2/transactions/course/student/assignment/commit",
      assignmentUpdate:
        "/docs/protocol/v2/transactions/course/student/assignment/update",
      credentialClaim:
        "/docs/protocol/v2/transactions/course/student/credential/claim",
      managersManage:
        "/docs/protocol/v2/transactions/project/owner/managers-manage",
      blacklistManage:
        "/docs/protocol/v2/transactions/project/owner/blacklist-manage",
      tasksManage:
        "/docs/protocol/v2/transactions/project/manager/tasks-manage",
      tasksAssess:
        "/docs/protocol/v2/transactions/project/manager/tasks-assess",
      taskCommit:
        "/docs/protocol/v2/transactions/project/contributor/task-commit",
      taskAction:
        "/docs/protocol/v2/transactions/project/contributor/task-action",
      contributorCredentialClaim:
        "/docs/protocol/v2/transactions/project/contributor/credential-claim",
      treasuryAddFunds:
        "/docs/protocol/v2/transactions/project/user/treasury/add-funds",
    },
  },
} as const;

/**
 * Get the full page title with app name suffix
 */
export function getPageTitle(pageTitle?: string): string {
  if (!pageTitle) return BRANDING.fullTitle;
  return `${pageTitle} | ${BRANDING.name}`;
}

/**
 * Get full URL for transaction documentation.
 */
export function getDocsUrl(
  path: keyof typeof BRANDING.docs.transactionPaths
): string {
  return `${BRANDING.docs.baseUrl}${BRANDING.docs.transactionPaths[path]}`;
}

/**
 * Generate consistent page metadata with brand styling.
 */
export function getPageMetadata(
  title?: string,
  description?: string
): Metadata {
  const pageTitle = getPageTitle(title);
  const pageDescription = description ?? BRANDING.description;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: [BRANDING.logo.ogImage],
      siteName: BRANDING.name,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [BRANDING.logo.ogImage],
    },
  };
}

export type Branding = typeof BRANDING;
