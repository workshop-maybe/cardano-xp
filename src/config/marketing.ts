/**
 * Marketing Configuration
 *
 * Marketing copy for the Cardano XP landing page and promotional content.
 */

import { BRANDING } from "./branding";

export const MARKETING = {
  /**
   * Hero section on landing page
   */
  hero: {
    badge: "Cardano XP",
    title: "Put your track record on-chain.",
    subtitle: "Do real work on Cardano. Earn reputation, not tokens to trade.",
    lead: "Five years of building on Cardano and nothing to show for it. XP changes that.",
    primaryCta: {
      text: "Connect Wallet",
      href: "/",
    },
  },

  /**
   * Two paths section
   */
  twoPaths: {
    title: "Two ways to participate",
    discover: {
      title: "Learn",
      description: "Take the course to understand how Cardano XP works. Earn credentials along the way.",
      links: [
        { text: "Start Learning", href: BRANDING.links.website },
      ],
    },
    create: {
      title: "Contribute",
      description: "Pick up feedback tasks. Complete them. Earn XP tokens as proof of contribution.",
      links: [
        { text: "View Tasks", href: BRANDING.links.website },
      ],
    },
  },

  /**
   * Cost info (replaces former preprod warning)
   */
  costInfo: {
    title: "What it costs",
    description:
      "Minting an access token costs approximately 8 ADA. We recommend a fresh wallet funded with about 25 ADA. You'll earn ADA and tokens as you go, but each on-chain action has a transaction fee.",
  },

  /**
   * Final CTA section
   */
  finalCta: {
    title: "Ready?",
    description: "Connect a wallet and mint your access token to get started.",
    buttonText: "Get Started",
    buttonHref: "/",
  },

  /**
   * Timeline info
   */
  timeline: {
    preprodLaunch: "Preprod launch: January 2026",
    mainnetLaunch: "Mainnet launch: February 2026",
  },

  /**
   * Landing page hero section
   */
  landingHero: {
    headline: "Put your track record on-chain.",
    subtext: "Do real work on Cardano. Earn reputation, not tokens to trade.",
    enterCta: "Connect Wallet",
    browseCta: "Explore the course",
    launchCta: "Studio",
  },

  /**
   * Landing page cards
   */
  landingCards: {
    explore: {
      title: "Learn",
      description:
        "Take the course to understand how Cardano XP works.",
    },
    signIn: {
      title: "Contribute",
      description:
        "Pick up feedback tasks and earn XP for completing them.",
    },
    getStarted: {
      title: "Get Started",
      description:
        "Connect a wallet and mint your access token (~8 ADA) to begin.",
    },
  },

  /**
   * Footer content
   */
  footer: {
    brandText: "Cardano XP",
    poweredBy: {
      text: "Powered by Andamio",
      href: "https://andamio.io",
    },
  },

  /**
   * LLM disclaimer alert
   */
  disclaimer: {
    text: "This is a preview build. Some text may change before launch.",
  },
} as const;

export type Marketing = typeof MARKETING;
