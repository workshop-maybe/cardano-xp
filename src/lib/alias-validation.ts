/**
 * Alias validation — shared source of truth for the access-token alias allow-list.
 *
 * ## What this governs
 *
 * `ALIAS_PATTERN` is the allow-list we enforce for **new** access-token mints
 * at the frontend. Both the landing registration flow and the in-app mint
 * flow import from here so UX hints stay consistent.
 *
 * ## Threat model — on-chain data is untrusted
 *
 * This regex is a UX gate, not a security boundary. The Andamio gateway only
 * blocks angle brackets (`<`, `>`) server-side, and the Cardano protocol
 * itself places no character-set constraints on token names. That means:
 *
 * - A motivated user can bypass this regex with a proxy and mint an alias
 *   containing quotes, whitespace, `=`, or other attribute-injection chars.
 * - Historical on-chain aliases may contain anything the protocol allowed at
 *   the time they were minted.
 * - Every Andamio-ecosystem app that reads these tokens inherits the same
 *   surface.
 *
 * **The frontend must therefore treat every on-chain string as potentially
 * hostile at render time.** React's default JSX text-content escaping covers
 * the common case (`<p>{alias}</p>` is always safe). Sinks and rendering
 * surfaces:
 *
 * - **JSX text content** — safe by default. `{alias}` in children is escaped.
 * - **Attributes like `aria-label`, `title`, `alt`** — safe via React's
 *   `setAttribute` path (browsers don't parse HTML in attribute values).
 *   Several components in this repo interpolate aliases here; keep doing so.
 * - **`dangerouslySetInnerHTML`** — never feed on-chain data into this. The
 *   only current use is in `src/components/ui/chart.tsx`, which injects
 *   CSS from a caller-supplied `ChartConfig`. That component is currently
 *   unused — if it gets adopted, any `ChartConfig` derived from on-chain
 *   data would need careful review.
 * - **URL construction** — use `encodeURIComponent` for path segments and
 *   query values. Reference pattern: `src/app/(admin)/admin/course/page.tsx`
 *   uses ``href={`...?student=${encodeURIComponent(commitment.studentAlias)}`}``.
 * - **Full-href construction** — never let an on-chain string be the *whole*
 *   href; always prefix with a known route. Otherwise `javascript:` URIs
 *   become possible.
 * - **URL path segments (server-side)** — `safePath` in
 *   `src/lib/gateway-server.ts` handles the equivalent concern for route
 *   params being interpolated into upstream gateway URLs. Use that for
 *   server-side, this for client-side mint-time UX.
 * - **Third-party renderers** (Markdown, rich text, HTML parsers) — audit
 *   any new dependency before passing on-chain strings to it.
 *
 * ## See also
 *
 * - Issue #44 (origin of this module)
 */

const ALIAS_PATTERN = /^[a-zA-Z0-9_]+$/;

export const ALIAS_ERROR_MESSAGE =
  "Alias can only contain letters, numbers, and underscores";

export function isValidAlias(alias: string): boolean {
  return alias.length > 0 && ALIAS_PATTERN.test(alias);
}
