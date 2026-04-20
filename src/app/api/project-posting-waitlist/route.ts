import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "~/env";
import { CONTACT } from "~/config/contact";

/**
 * Project-posting waitlist endpoint.
 *
 * Email-only signup for "notify me when project posting opens on Cardano XP."
 * Sends two Resend emails on success: an internal notification to the team
 * inbox and a confirmation to the submitter.
 *
 * Mirrors /api/sponsor-contact for auth, error handling, and Resend usage.
 */

const waitlistSchema = z.object({
  email: z.string().email().max(200),
  /** Honeypot — populated by bots, empty/omitted by humans. */
  company: z.string().optional().default(""),
});


/**
 * In-memory per-instance rate limiter.
 *
 * Keyed by client IP, holds a rolling 60-second window of submission
 * timestamps. Best-effort — Vercel serverless isolates memory per
 * instance, so this does NOT provide global protection against a
 * distributed bot hitting different instances. Combined with the
 * honeypot field, it stops casual abuse. If sustained abuse surfaces,
 * upgrade to Vercel KV or @upstash/ratelimit (tracked as a deferred
 * follow-up in the v0.0.2 plan).
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const submissionTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (submissionTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    submissionTimestamps.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissionTimestamps.set(ip, recent);
  return false;
}

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

    // Rate limit first — cheaper than body parse
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
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

    const resend = new Resend(env.RESEND_API_KEY);
    const submittedAt = new Date().toISOString();

    // Resend's SDK resolves with `{ data, error }` on application-level
    // failures (rejected recipient, quota, invalid from). It only rejects on
    // transport errors. Inspect the error field so we don't report success
    // when nothing was actually delivered.
    const [internal, confirmation] = await Promise.all([
      resend.emails.send({
        from: CONTACT.fromAddress,
        replyTo: email,
        to: CONTACT.internalEmail,
        subject: "Cardano XP — project-posting waitlist",
        text: `Email: ${email}\nSubmitted: ${submittedAt}`,
      }),
      resend.emails.send({
        from: CONTACT.fromAddress,
        to: email,
        subject: "You're on the Cardano XP project-posting waitlist",
        text: [
          "You're on the list for Cardano XP project posting.",
          "",
          "We'll email you when it opens. In the meantime, you can start earning XP by giving feedback to other contributors at https://cardano-xp.io.",
          "",
          "— Cardano XP",
        ].join("\n"),
      }),
    ]);

    if (internal.error || confirmation.error) {
      console.error("[project-posting-waitlist] Resend send failed:", {
        internal: internal.error,
        confirmation: confirmation.error,
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
