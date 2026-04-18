---
title: "fix: wallet network detection and sign-message timeout"
type: fix
status: active
date: 2026-04-18
---

# fix: wallet network detection and sign-message timeout

## Overview

Issue #42 reports that a user connecting a preprod wallet to the mainnet app at `cardano-xp.io` sees the sign-message button spin forever with no feedback. The app never detects the network mismatch. We fix this by comparing the wallet's network ID against the app's configured network at connect time, surfacing a clear error state in the UI, and adding a defensive timeout on the sign-message promise so any future hang fails loudly.

## Problem Frame

Reporter (fabian) connected an Eternl wallet set to preprod and tried to sign in. The wallet connected fine, the "sign message" button reported a pending state, and then nothing ever resolved. No toast, no modal, no hint that the wallet was on the wrong network.

Two overlapping failures:

1. **Missing network check.** The app reads `NEXT_PUBLIC_CARDANO_NETWORK` but never compares it to the wallet's `getNetworkId()`. Mismatches go undetected.
2. **No sign-message timeout.** `wallet.signData()` is awaited directly with no timeout. If the wallet extension silently rejects or hangs (as can happen on wrong-network sign requests), `isAuthenticating` stays `true` forever.

This will keep happening for every new wallet-dependent flow we add unless the network check is centralized.

## Requirements Trace

- **R1.** On wallet connect, the app detects whether the wallet's network matches the configured app network and records a `networkMismatch` state accessible from the auth context.
- **R2.** If there's a mismatch, the app does not silently attempt sign-in. It surfaces a clear UI state naming both the expected network (from env) and the observed network (from wallet), with instructions to switch.
- **R3.** The sign-message call has a timeout (reasonable default ~45s) that rejects with a named error so the UI can show a real failure instead of hanging indefinitely.
- **R4.** The network-check logic lives in a shared helper (`src/lib/wallet-network.ts`) so future wallet-dependent features don't reinvent it.
- **R5.** The fix works generically across `mainnet`, `preprod`, and `preview` configured networks — not just the reported preprod/mainnet case.
- **R6.** Branch + PR follows the workflow established for #41: one branch, one PR, no Claude Code attribution in commits or PR body.

## Scope Boundaries

- Not building a wallet-network switcher UI — we can't change the wallet's network from the app; only inform the user.
- Not distinguishing preprod vs preview programmatically — CIP-30 `getNetworkId()` returns only `0` (any testnet) or `1` (mainnet). The plan calls this ambiguity out in copy; we lean on the env var for the expected side and tell the user "your wallet is on a testnet" when mixing.
- Not changing the auth API contract with the Andamio gateway.
- Not touching tx-building flows — only the auth flow. Future tx flows can reuse the helper.

### Deferred to Separate Tasks

- Polling for network changes after the initial connect (if a user switches network mid-session). First-version detection happens at connect and before sign; re-check-on-switch can be a follow-up if needed.

## Context & Research

### Relevant Code and Patterns

- `src/env.js:31` — zod schema defines `NEXT_PUBLIC_CARDANO_NETWORK` as `"mainnet" | "preprod" | "preview"`, defaulting to `"preprod"`.
- `src/contexts/andamio-auth-context.tsx` — hosts the auth state, `authenticate()` function, and already has related states (`authError`, `popupBlocked`). `networkMismatch` will fit the same pattern.
  - `authenticate()` calls `wallet.signData(bech32Address, nonce)` directly with no timeout.
  - Auto-auth effect re-runs `authenticate()` whenever `connected` transitions — this is the entry point we need to gate.
- `src/components/auth/connect-wallet-button.tsx` — the user-facing connect surface; must render the new mismatch state.
- `src/lib/cardano-utils.ts` — already knows the three networks (`SHELLEY_GENESIS` map). Good reference for the network name set.
- `@meshsdk/react` — `useWallet()` exposes a `wallet` object with CIP-30 methods, including `getNetworkId()`.
- Prior pattern for periodic wallet checks: the `detectWalletSwitch` effect (`andamio-auth-context.tsx:438`) polls every 10s. We won't add polling here, but it's precedent for a similar pattern if needed later.

### Institutional Learnings

- `docs/solutions/` contains no prior network-mismatch solution. This is genuinely new territory for the repo.
- The `authError` vs `popupBlocked` split in `andamio-auth-context.tsx` is a useful precedent: distinguish **transient** errors from **stuck** states so the UI can present different recovery affordances. Treat `networkMismatch` the same way — stuck state with a specific remediation, not a transient error.

### External References

- CIP-30 spec: `getNetworkId()` returns `Promise<number>` where `0 = testnet`, `1 = mainnet`. https://cips.cardano.org/cip/CIP-30
- MeshJS `IWallet` interface (v2) proxies the CIP-30 methods through the connected wallet.

## Key Technical Decisions

- **Shared helper in `src/lib/wallet-network.ts`.** Encapsulates (a) reading `NEXT_PUBLIC_CARDANO_NETWORK`, (b) calling `wallet.getNetworkId()`, (c) returning a typed result `{ match: true } | { match: false, expected, actual }`. Future flows (tx build, mint, etc.) reuse the same check.
- **Detect at connect, not at sign.** Auth context's auto-auth effect already runs on `connected` transitions. Add the network check at the top of that effect so a mismatch short-circuits before `signData` is called. Still add a pre-sign guard inside `authenticate()` as a belt-and-braces check.
- **Expose state via context, not toast.** Mismatches produce a structured state, not a one-shot toast, because the user may need to read and act on the message (switch network, reconnect). Disconnect-and-retry is a user action, not an automatic one.
- **Preprod vs preview ambiguity — honest copy.** When the app is on mainnet and the wallet reports network `0`, we say "a testnet" (not "preprod") since we can't tell the difference. When the app is on preprod/preview and the wallet reports mainnet, we can name the expected side precisely (from env).
- **45-second timeout on `signData`.** Long enough to accommodate slow human clicks in popup windows; short enough to fail cleanly if the wallet extension went dark.

## Open Questions

### Resolved During Planning

- *Should we check network only at connect, or poll?* Only at connect, plus a belt-and-braces check just before `signData`. Polling is a deferred enhancement; first-version fix covers the reported symptom and the common case.
- *Should we auto-disconnect on mismatch?* No. Leaving the wallet connected lets the UI show specific, stable copy ("your wallet is on X, app needs Y"). Auto-disconnect would erase the diagnosis.
- *Can we tell preprod from preview?* Not via CIP-30 `getNetworkId()`. Copy must be honest about this.
- *What's the reasonable timeout for `signData`?* 45 seconds. Long enough for popup-window slowness; short enough to fail before the user assumes the app is dead.

### Deferred to Implementation

- Exact error-class name for the sign timeout (`WalletSignTimeoutError`, `SignMessageTimeoutError`, etc.) — to be decided during implementation based on existing error patterns in `src/lib/auth-error-messages.ts`.
- Whether the new mismatch UI lives inline in `connect-wallet-button.tsx` or in a sibling component — decide when rendering prototype hits the pixel-painting stage.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

State machine for the wallet-connect → sign-in flow with network detection:

```
disconnected ──connect──▶ connected ──check network──▶ match? ──yes──▶ sign-in flow
                              │                         │
                              │                         └──no──▶ networkMismatch state
                              │                                    │
                              │                                    └─▶ UI shows: "App expects X, wallet on Y. Switch wallet network and reconnect."
                              │
                              └──sign hangs──▶ timeout (45s) ──▶ authError = "Sign request timed out. Try again."
```

Helper contract:

```
checkWalletNetwork(wallet, expected)
  → { match: true }
  | { match: false, expected: "mainnet"|"preprod"|"preview", actualIsTestnet: boolean }
```

The `actualIsTestnet` bit is what we can reliably detect; copy layers on top of that.

## Implementation Units

- [ ] **Unit 1: Shared wallet-network helper**

**Goal:** Centralize the network-mismatch check in a small, pure-ish helper that wraps `wallet.getNetworkId()` and compares to the configured env network.

**Requirements:** R1, R4, R5

**Dependencies:** None

**Files:**
- Create: `src/lib/wallet-network.ts`
- Test: `src/lib/wallet-network.test.ts` (or co-located per repo convention — confirm during implementation)

**Approach:**
- Export a typed result union for "match" vs "mismatch, here's the gap".
- Accept the `wallet` object (Mesh `IWallet`-shaped) and the expected network name (from `env.NEXT_PUBLIC_CARDANO_NETWORK`). Don't read env inside the helper — keep it testable.
- Map CIP-30 network ID: `1 → mainnet`, `0 → testnet (preprod or preview — indeterminate)`.
- Return a result the caller can render without more logic.

**Technical design:** *(directional guidance)*

```
type WalletNetworkResult =
  | { match: true }
  | { match: false; expected: AppNetwork; actualIsTestnet: boolean }

async function checkWalletNetwork(wallet, expected: AppNetwork): Promise<WalletNetworkResult>
```

**Patterns to follow:**
- Shape and naming: mirror `src/lib/cardano-utils.ts` — small, typed, focused helpers with JSDoc.

**Test scenarios:**
- Happy path: expected `mainnet`, wallet `getNetworkId() → 1` → `{ match: true }`.
- Happy path: expected `preprod`, wallet `getNetworkId() → 0` → `{ match: true }`.
- Happy path: expected `preview`, wallet `getNetworkId() → 0` → `{ match: true }`.
- Error path: expected `mainnet`, wallet returns `0` → `{ match: false, expected: "mainnet", actualIsTestnet: true }`.
- Error path: expected `preprod`, wallet returns `1` → `{ match: false, expected: "preprod", actualIsTestnet: false }`.
- Error path: `wallet.getNetworkId()` throws → rethrow with context, do not swallow silently (the caller decides UI state).

**Verification:**
- Unit tests cover all six scenarios.
- Helper has no side effects — can be called repeatedly.

---

- [ ] **Unit 2: Wire network check into auth context**

**Goal:** Add `networkMismatch` state to `AndamioAuthContext`, block auto-auth when there's a mismatch, and run the check before `signData()` as a belt-and-braces.

**Requirements:** R1, R2, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `src/contexts/andamio-auth-context.tsx`

**Approach:**
- Add `networkMismatch: WalletNetworkResult | null` to the context state.
- New `useEffect` keyed on `connected` runs `checkWalletNetwork(wallet, env.NEXT_PUBLIC_CARDANO_NETWORK)` and sets state.
- Guard auto-auth effect: if `networkMismatch?.match === false`, return early (don't call `authenticate`).
- In `authenticate()`, re-run the check at the top; throw a specific error if mismatched (defensive, in case auto-auth is bypassed).
- On wallet disconnect (`connected → false`), clear `networkMismatch` so a fresh connect starts clean.
- Expose `networkMismatch` on the context's public interface.

**Patterns to follow:**
- Mirror the existing `authError` / `popupBlocked` state pattern (define in state, expose on context value, reset on disconnect effect).
- Reset-on-disconnect precedent lives in the "Clear authenticated state when wallet disconnects" effect.

**Test scenarios:**
- Happy path: matching network connect → `networkMismatch` stays `null`, auto-auth proceeds.
- Error path: mismatched connect → `networkMismatch` populated, auto-auth does NOT call `authenticate`.
- Error path: calling `authenticate()` directly on a mismatched wallet → rejects with a recognizable error, no `signData` call made.
- Integration: connect-mismatch → disconnect → connect-match → `networkMismatch` resets to `null` between the two connects.
- Integration: `networkMismatch` change triggers UI re-render (covered by the state being on context).

**Verification:**
- Manual test with a mainnet-built app and a preprod-configured wallet: mismatch state appears; no sign popup fires.
- Existing auth happy path still works on a matching network.

---

- [ ] **Unit 3: Sign-message timeout wrapper**

**Goal:** Wrap the `wallet.signData()` call in `authenticate()` with a timeout that rejects with a recognizable error, so a hung wallet extension produces a real failure instead of an infinite spinner.

**Requirements:** R3

**Dependencies:** None (can land independently of Units 1–2, but logically pairs with them)

**Files:**
- Modify: `src/contexts/andamio-auth-context.tsx` (inside `authenticate()`)
- Possibly: a small `withTimeout` helper inline or in `src/lib/` — decide during implementation based on whether it's reused

**Approach:**
- Wrap `signData` with `Promise.race` against a timeout (45s).
- On timeout, reject with a named error (see deferred question above).
- Existing `catch` block translates the error to a user-facing message (extend the existing classification logic that already handles popup-blocked errors).

**Patterns to follow:**
- The existing try/catch in `authenticate()` already classifies errors (popup-blocked vs other). Extend that classification.

**Test scenarios:**
- Happy path: `signData` resolves within the timeout → flow completes normally, no timeout fires.
- Error path: `signData` never resolves → timeout rejects after 45s, `isAuthenticating` returns to `false`, `authError` is set to a "sign request timed out" message.
- Edge case: `signData` rejects before timeout (user declined) → existing error path still handles it; timeout does not mask the real error.

**Verification:**
- Manual test: mock a never-resolving `signData` (e.g., by pointing at a disconnected wallet stub or injecting a stubbed `wallet` in dev) → UI shows a clear timeout error after ~45s.
- Happy-path auth still completes normally on a real wallet.

---

- [ ] **Unit 4: UI surfacing for network mismatch**

**Goal:** Render a clear, actionable message in `connect-wallet-button.tsx` (and wherever it makes sense) when `networkMismatch` is populated.

**Requirements:** R2, R5

**Dependencies:** Unit 2

**Files:**
- Modify: `src/components/auth/connect-wallet-button.tsx`
- Possibly create: `src/components/auth/wallet-network-mismatch-banner.tsx` if extracting makes the connect button cleaner

**Approach:**
- Read `networkMismatch` from `useAndamioAuth()`.
- When populated, replace or augment the normal connected-state UI with a message:
  - Mainnet expected, wallet on testnet: "This app runs on Cardano mainnet. Your wallet is connected to a testnet. Switch your wallet's network to mainnet and reconnect."
  - Testnet expected, wallet on mainnet: "This app is running on `{expected}`. Your wallet is on mainnet. Switch to `{expected}` and reconnect." (use the exact env name since we know it.)
- Include a "Disconnect" button so the user can cleanly reset without having to navigate away.
- Do not hide the wallet icon/identity — users should still know which wallet they have connected.

**Patterns to follow:**
- Existing error affordances in `connect-wallet-button.tsx` (popup-blocked, authError) — follow the same visual weight.
- Use the existing `AndamioButton`, dialog, and copy conventions.

**Test scenarios:**
- Happy path: no mismatch → no banner rendered; UI looks exactly like today.
- Happy path: mainnet app, testnet wallet connected → banner reads "app runs on mainnet, wallet on a testnet, switch and reconnect"; disconnect button available.
- Happy path: preprod app, mainnet wallet connected → banner names `preprod` explicitly; disconnect button available.
- Edge case: user clicks Disconnect → wallet disconnects, banner disappears, returns to the normal "connect your wallet" state.
- Integration: clicking Disconnect then reconnecting on a matching network transitions cleanly through `networkMismatch: null`.

**Verification:**
- Manual walk-through of each mismatch case on a running preview deploy.
- Happy path (matching network) still connects and signs.

## System-Wide Impact

- **Interaction graph:** Auth context's `authenticate()` and the auto-auth effect both gate on `networkMismatch`. Any other caller of `authenticate()` (there are none today, but future callers should) gets the same belt-and-braces behavior via the pre-sign check.
- **Error propagation:** `WalletSignTimeoutError` (tentative name) becomes a new member of the auth error family — surface via existing `authError` state, extend classification in the `catch` block.
- **State lifecycle risks:** `networkMismatch` must reset on disconnect; otherwise a reconnect-with-correct-network would still show the stale mismatch banner. Covered in Unit 2 test scenarios.
- **API surface parity:** `AndamioAuthContextType` gains one field (`networkMismatch`). Default context value needs updating. No Gateway API contract change.
- **Unchanged invariants:** JWT storage, wallet switch detection, and access-token sync logic are untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `getNetworkId()` behaves differently across wallets (Nami, Eternl, Lace, Typhon) | Test on Eternl (the reporter's wallet) at minimum; others follow CIP-30 spec. Helper rejects any non-{0,1} value explicitly. |
| User switches network in the wallet extension without reconnecting | Out of first-version scope per Scope Boundaries; belt-and-braces check at sign time catches the most-likely subset. |
| 45s timeout feels too long/short for some users | Document the constant as configurable via a single `const` at the top of the wrapper; tune based on feedback if it surfaces. |
| Adding `networkMismatch` to context causes unrelated re-renders | `networkMismatch` is a stable object reference; React's default compare is fine for consumers. No memoization needed. |

## Documentation / Operational Notes

- No runtime migration needed. The feature is additive UI + a guard clause.
- PR description should include one screenshot of each mismatch state so the community review shows the expected copy.

## Sources & References

- **Origin issue:** [#42 — Wrong-network detection missing; sign-message spinner hangs indefinitely](https://github.com/workshop-maybe/cardano-xp/issues/42)
- **CIP-30 spec (getNetworkId):** https://cips.cardano.org/cip/CIP-30
- Related files: `src/contexts/andamio-auth-context.tsx`, `src/components/auth/connect-wallet-button.tsx`, `src/lib/cardano-utils.ts`, `src/env.js`
- Related prior work: PR #45 (issue #41 audit) — same branch-per-issue / no-attribution workflow.
