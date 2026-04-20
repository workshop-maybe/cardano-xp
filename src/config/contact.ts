/**
 * Contact Configuration
 *
 * Single source of truth for the project's internal contact email and the
 * Resend `FROM_ADDRESS`. Importers are expected to be server-only routes
 * and the deletion-request copy in the waitlist form.
 *
 * To move to a verified sender domain, update `fromAddress` here and in the
 * corresponding Resend dashboard configuration.
 */
export const CONTACT = {
  /** Inbox that receives waitlist signups + sponsor inquiries. */
  internalEmail: "james@andamio.io",
  /** Resend sender string. Uses the shared sandbox sender until a verified
   *  cardano-xp.io domain is configured. */
  fromAddress: "Cardano XP <onboarding@resend.dev>",
} as const;
