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
    title: "Learn. Contribute. Earn XP.",
    subtitle: "A single-purpose dApp on Cardano.",
    lead: "Complete the course, earn credentials, contribute feedback, and collect XP — a reputation token that proves what you've done.",
    primaryCta: {
      text: "Get Started",
      href: "/",
    },
    secondaryCta: {
      text: "What is Andamio?",
      href: "https://andamio.io",
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
   * Preprod warning
   */
  preprodWarning: {
    title: "This is Cardano Preprod",
    description:
      "Use a preprod wallet. Transactions are free. Data may be wiped during development.",
  },

  /**
   * Final CTA section
   */
  finalCta: {
    title: "Ready?",
    description: "Connect a preprod wallet and start exploring.",
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
    headline: "Learn. Contribute. Earn XP.",
    subtext: "Complete courses. Earn credentials. Contribute to projects.",
    enterCta: "Get Started",
    browseCta: "Learn More",
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
        "Connect a wallet and create your access token to begin.",
    },
  },

  /**
   * Footer content
   */
  footer: {
    brandText: "Cardano XP",
    links: [
      { text: "Andamio Docs", href: BRANDING.links.docs, external: true },
      { text: "andamio.io", href: BRANDING.links.website, external: true },
      { text: "Build Your Own", href: "https://github.com/Andamio-Platform/andamio-app-template", external: true },
    ],
  },

  /**
   * LLM disclaimer alert
   */
  disclaimer: {
    text: "This is a preview build. Some text may change before launch.",
  },
} as const;

export type Marketing = typeof MARKETING;
