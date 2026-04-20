# Changelog

All notable changes to [Cardano XP](https://cardano-xp.io) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Every entry in v0.0.2 and later traces a feature to its origin: a contributor
left feedback on an Andamio assignment, that feedback became a GitHub issue,
the issue became a pull request, and the PR is now live on cardano-xp.io.
The chain is preserved here so reporters can see their contribution land.

## [Unreleased]

## [0.0.2] — 2026-04-20

First community-driven release. Five reports left as assignment commitments on
module 101 were surfaced by the `/xp-watch` feedback skill, filed as GitHub
issues, and shipped as PRs #45–#48 and #50. The full feedback report is at
[`docs/feedback/reports/2026-04-18-0654.md`][report].

### Added

- **XP activity dashboard.** Public landing strip on `/` and a dedicated
  `/xp/activity` page surface contributors, tasks completed, XP released,
  pending reviews, and the most-recent accepted submissions. A shared waitlist
  form collects interest in the future "post your own project" feature.
  Server-side prefetch via React Query + `HydrateClient` means first paint is
  instant.
  — Feedback: `dcm` on module 101 ("Add a page to showcase the Cardano projects
  with contributions on Cardano XP") → [#43] → [#50] → live at
  [`/xp/activity`](https://cardano-xp.io/xp/activity).

### Fixed

- **Wrong-network detection and sign-message timeout.** Connecting a preprod
  wallet to the mainnet dApp now produces a clear "wrong network" error
  instead of an indefinitely-spinning sign-message prompt. Auth context
  detects the mismatch and surfaces actionable guidance.
  — Feedback: `fabian` on module 101 ("When accessing the mainnet dApp while
  the wallet is still set to the preprod network, the application won't
  trigger an expected 'Wrong Network' error") → [#42] → [#46] → live at
  [cardano-xp.io](https://cardano-xp.io).

- **Username validation bypass.** Alias-character validation now runs on the
  server, not just the frontend. A proxy-tool request that bypassed the
  frontend input filter can no longer create a commitment with disallowed
  characters. On-chain strings render via React JSX escaping only, and
  `scripts/audit-unsafe-sinks.sh` guards against future `dangerouslySetInnerHTML`
  regressions in CI.
  — Feedback: anonymous contributor (submitted a security-probe string as
  their alias) on module 101 ("Able to bypass front-end restrictions on
  allowed names") → [#44] → [#48] → live across every on-chain-string render
  site.

### Changed

- **Post-mint ceremony copy.** The celebration screen after minting a
  membership token, and the "sign back in" reconnecting screen, now explain
  *why* Andamio asks for a second signature. The flow was working as
  designed; the copy now tells you so. No behavior change.
  — Feedback: `toneDeaf_NFTs` on module 101 ("When I signed my Tx to mint the
  membership token the app did not see that I had the token in my wallet
  even after I was notified the token was in my wallet. For the app to see
  that I was holding the token I had to log out and log back into the app.")
  → [#40] → [#47] → live on the post-mint flow at
  [cardano-xp.io](https://cardano-xp.io).

- **External GitHub repository link.** The "Looking for a bug" page linked to
  a renamed repository and returned a 404. External links are now audited.
  — Feedback: `njuguna` on module 101 ("The link to the repository is
  broken") → [#41] → [#45] → live on the bug-reporting guide.

### Internal

- Landing hero and footer copy refreshed: status is "active revision",
  tagline is "collecting feedback · active revision", version bumped to
  `0.0.2`.
- Follow-up work from PR #50's code review is tracked in [`todos/`](./todos)
  entries 004–010 (waitlist abuse mitigation, preview test checklist,
  `unstable_cache`, hydration-safe relative time, KV-backed rate limiter,
  design-system sweep, contact-email centralize).

## [0.0.1] — 2026-03-06

Initial public release. Forked from the [Andamio app
template](https://github.com/Andamio-Platform/andamio-app-template) and
narrowed to a single-course, single-project scope for the Cardano XP
tokenomics experiment.

No detailed release notes — this entry anchors the baseline for
[v0.0.1...v0.0.2](https://github.com/workshop-maybe/cardano-xp/compare/v0.0.1...v0.0.2)
range references.

---

[Unreleased]: https://github.com/workshop-maybe/cardano-xp/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/workshop-maybe/cardano-xp/releases/tag/v0.0.2
[0.0.1]: https://github.com/workshop-maybe/cardano-xp/tree/2fe19db
[report]: ./docs/feedback/reports/2026-04-18-0654.md

[#40]: https://github.com/workshop-maybe/cardano-xp/issues/40
[#41]: https://github.com/workshop-maybe/cardano-xp/issues/41
[#42]: https://github.com/workshop-maybe/cardano-xp/issues/42
[#43]: https://github.com/workshop-maybe/cardano-xp/issues/43
[#44]: https://github.com/workshop-maybe/cardano-xp/issues/44
[#45]: https://github.com/workshop-maybe/cardano-xp/pull/45
[#46]: https://github.com/workshop-maybe/cardano-xp/pull/46
[#47]: https://github.com/workshop-maybe/cardano-xp/pull/47
[#48]: https://github.com/workshop-maybe/cardano-xp/pull/48
[#50]: https://github.com/workshop-maybe/cardano-xp/pull/50
