# 011 — Wallet Transparency Page

**Date:** 2026-03-16
**Tags:** wallet, transparency, koios, donations, feedback, about-page, footer

## What happened

Built a project wallet transparency page at `/wallet`. The page displays a public Cardano address, its ADA balance, and a full transaction log — so anyone can verify what the project spends and what the community contributes. Data comes from Koios via the existing proxy.

Also rewrote the about page to focus on feedback (not tokenomics), listing four feedback targets: apps, Andamio, courses, and proposals. Tuned footer colors for readability.

Ran a multi-agent code review (TypeScript, Security, Simplicity, Learnings) which caught four issues — all fixed before merge.

## Key decisions

- **Wallet address in config, not env.** The address is public and won't change per deployment. Stored as `CARDANO_XP.projectWallet.address`.
- **Two-phase Koios fetch.** Get tx hashes first (`address_txs`), then batch-fetch full details (`tx_info`). Mirrors how blockchain indexers work.
- **Heuristic tx classification.** If the address is only in outputs → received. If in inputs → sent. Both → internal. Imperfect for complex txs but honest.
- **No pagination yet.** Fetch 20 most recent. Removed speculative `hasMore` flag after simplicity review flagged it as YAGNI.
- **About page leads with feedback.** "Devs are gonna dev — but the way we build connections is through feedback."

## Review findings

| Issue | Fix |
|-------|-----|
| `data[0]!` non-null assertion | Explicit null guard |
| `Array.sort()` mutation | `[...arr].sort()` |
| `parseInt` NaN risk | `safeParseLovelace` helper |
| `hasMore` dead code | Removed |
| Koios proxy has no path allowlist (pre-existing) | Noted for follow-up |

## Files changed

- `src/config/cardano-xp.ts` — added `projectWallet.address`
- `src/hooks/api/use-project-wallet.ts` — new Koios data fetching hook
- `src/app/(app)/wallet/page.tsx` — new wallet transparency page
- `src/config/navigation.ts` — added Wallet nav item
- `src/config/routes.ts` — added route metadata
- `src/app/(app)/about/page.tsx` — rewrite for feedback focus
- `src/components/layout/app-footer.tsx` — opacity and color tuning

## What's next

- Replace placeholder address with real project wallet
- Add Koios proxy path allowlist (security follow-up)
- Link feedback targets to actual tasks/resources
- Treasury proposal link once it's ready
