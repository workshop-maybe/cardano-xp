import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "~/env";

/**
 * Shared rate limiter for public form endpoints.
 *
 * Picks a backend on first call:
 * - If both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set,
 *   use Upstash Redis with sliding-window limits. Shared across all Vercel
 *   instances and regions.
 * - Otherwise fall back to an in-memory, per-instance `Map`-backed sliding
 *   window. Best-effort only — a horizontally-scaled deploy gets
 *   instance-count × limit effective throughput. This is the same behavior
 *   that shipped in v0.0.2 and keeps dev environments working without
 *   provisioning Redis.
 *
 * Two key kinds:
 * - `"ip"` — 5 requests / minute. Gate before reading the body.
 * - `"email"` — 1 request / hour (Upstash only). Gate after zod validation.
 *   The raw email is SHA-256-hashed before use as a key so Upstash never
 *   stores PII.
 *
 * On Upstash transport errors, the limiter **fails open** (allows the
 * request). Failing closed would make every submission a 429 whenever
 * Redis is flaky, which is worse than the abuse risk of a single slipped
 * request.
 */

export type RateLimitKind = "ip" | "email";

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window. `-1` when unknown (transport error). */
  remaining: number;
}

// ---- In-memory fallback (sliding window, per-instance) ---------------

const IP_WINDOW_MS = 60_000;
const IP_MAX = 5;
const inMemoryIp = new Map<string, number[]>();

function inMemoryCheckIp(key: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - IP_WINDOW_MS;
  const recent = (inMemoryIp.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= IP_MAX) {
    // Keep the pruned array so the key entry doesn't grow unboundedly.
    inMemoryIp.set(key, recent);
    return { success: false, remaining: 0 };
  }
  recent.push(now);
  if (recent.length === 0) {
    // Shouldn't happen (we just pushed), but guards against future edits.
    inMemoryIp.delete(key);
  } else {
    inMemoryIp.set(key, recent);
  }
  return { success: true, remaining: IP_MAX - recent.length };
}

// ---- Upstash backend -------------------------------------------------

type UpstashBundle = {
  ip: Ratelimit;
  email: Ratelimit;
};

let upstashBundle: UpstashBundle | null | undefined;
let partialEnvWarned = false;

function getUpstashBundle(): UpstashBundle | null {
  if (upstashBundle !== undefined) return upstashBundle;

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  // Log once if exactly one of the two is set — silent fallback in that case
  // would hide the operator's intent to enforce global limits.
  if (!partialEnvWarned && (!!url) !== (!!token)) {
    partialEnvWarned = true;
    console.warn(
      "[RATE_LIMITER_PARTIAL_ENV] Only one of UPSTASH_REDIS_REST_URL / _TOKEN " +
        "is set. Falling back to in-memory rate limiting. Set both or neither.",
    );
  }

  if (!url || !token) {
    upstashBundle = null;
    return null;
  }

  const redis = new Redis({ url, token });
  upstashBundle = {
    ip: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(IP_MAX, "1 m"),
      prefix: "cxp:rl:ip",
      analytics: false,
    }),
    email: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1 h"),
      prefix: "cxp:rl:email",
      analytics: false,
    }),
  };
  return upstashBundle;
}

// ---- Public API ------------------------------------------------------

/** Upstash REST call timeout — bounds a hung Redis endpoint. */
const UPSTASH_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]);
}

/**
 * Check a rate-limit key. Returns `{ success: false }` when the caller has
 * exceeded the window; otherwise increments and returns `{ success: true }`.
 *
 * For `kind: "email"`, the caller should hash the email upstream via
 * `hashEmailForRateLimit`. For `kind: "ip"`, pass the raw IP string.
 */
export async function checkRateLimit(
  kind: RateLimitKind,
  key: string,
): Promise<RateLimitResult> {
  const bundle = getUpstashBundle();

  if (!bundle) {
    // Fallback: in-memory only for IP; email limiting requires shared state
    // to be meaningful, so treat as a pass-through when Upstash is unset.
    if (kind === "ip") return inMemoryCheckIp(key);
    return { success: true, remaining: -1 };
  }

  try {
    const limiter = kind === "ip" ? bundle.ip : bundle.email;
    const result = await withTimeout(
      limiter.limit(key),
      UPSTASH_TIMEOUT_MS,
      `Upstash ${kind}-limit`,
    );
    return { success: result.success, remaining: result.remaining };
  } catch (error) {
    // Stable log prefix so ops can alert on this event without string-matching.
    console.error("[RATE_LIMITER_FAIL_OPEN]", { kind, error });
    return { success: true, remaining: -1 };
  }
}

/**
 * Hash an email address for use as a rate-limit key.
 *
 * Normalization order:
 * 1. Trim whitespace.
 * 2. Lowercase (mainstream mail providers treat local-parts as case-insensitive).
 * 3. Unicode NFC so `é` composed and decomposed hash to the same key.
 * 4. Strip Gmail-style `+tag` alias (`user+anything@x.com` → `user@x.com`) so
 *    an attacker can't consume unlimited per-email buckets with variants that
 *    deliver to the same inbox.
 */
export function hashEmailForRateLimit(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase().normalize("NFC");
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex < 0) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  const plusIndex = local.indexOf("+");
  const cleanLocal = plusIndex >= 0 ? local.slice(0, plusIndex) : local;
  return `${cleanLocal}${domain}`;
}
