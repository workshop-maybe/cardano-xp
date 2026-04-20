import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "~/env";
import { CONTACT } from "~/config/contact";
import {
  checkRateLimit,
  hashEmailForRateLimit,
} from "~/lib/rate-limiter";

/**
 * Project-posting waitlist endpoint.
 *
 * Email-only signup for "notify me when project posting opens on Cardano XP."
 * Sends one Resend email on success: an internal notification to the team
 * inbox. The on-page success state is the user's receipt; no branded
 * confirmation is sent to the submitter (see todo 004 for the rationale).
 *
 * Rate limiting lives in `src/lib/rate-limiter.ts` (Upstash when env vars
 * present, in-memory fallback otherwise).
 */

const waitlistSchema = z.object({
  email: z.string().email().max(200),
  /** Honeypot — populated by bots, empty/omitted by humans. */
  company: z.string().optional().default(""),
});

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Reject cross-origin POSTs. Defense-in-depth against CSRF-style abuse where
 * a third-party page submits on behalf of a visitor. Same-origin fetches from
 * our own client set `Origin` to match `Host`; requests without `Origin`
 * (non-browser tooling, some legacy clients) are allowed through so the
 * endpoint stays scriptable for agent parity.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 403 },
      );
    }

    if (!env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 503 },
      );
    }

    // Per-IP rate limit first — cheaper than body parse.
    const ip = getClientIp(request);
    const ipCheck = await checkRateLimit("ip", ip);
    if (!ipCheck.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const result = waitlistSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    const { email, company } = result.data;

    // Honeypot: bots fill this, humans don't. Return success without
    // sending email so bots get no signal that their submission was dropped.
    if (company && company.trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    // Per-email rate limit (Upstash only — no-op when falling back to
    // in-memory). Blocks the same address from being weaponized even if an
    // attacker rotates IPs.
    const emailCheck = await checkRateLimit(
      "email",
      hashEmailForRateLimit(email),
    );
    if (!emailCheck.success) {
      return NextResponse.json(
        { error: "This email was submitted recently. Please try again later." },
        { status: 429 },
      );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const submittedAt = new Date().toISOString();

    // Only the internal notification is sent. Sending a branded confirmation
    // to the attacker-supplied `email` would make this endpoint a reflector
    // for email-bombing. The on-page success state is the user's receipt.
    // Resend's SDK resolves with `{ data, error }` on application-level
    // failures; inspect the error field so we don't report success when the
    // send didn't actually deliver.
    const internal = await resend.emails.send({
      from: CONTACT.fromAddress,
      replyTo: email,
      to: CONTACT.internalEmail,
      subject: "Cardano XP — project-posting waitlist",
      text: `Email: ${email}\nSubmitted: ${submittedAt}`,
    });

    if (internal.error) {
      console.error("[project-posting-waitlist] Resend send failed:", {
        internal: internal.error,
      });
      return NextResponse.json(
        { error: "Failed to process submission" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[project-posting-waitlist] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 },
    );
  }
}
