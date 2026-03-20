---
title: Template to Standalone Product Identity
module: app-wide (branding, layout, theme, content, navigation)
category: project-setup
severity: enhancement
symptoms: >
  The forked app still looked and felt like the generic Andamio template.
  Branding said "Andamio" everywhere, navigation exposed multi-course/multi-project
  structure that did not apply, the color palette was the default template theme,
  and there were no content pages explaining the project's purpose or token design.
root_cause: >
  The repo was forked directly from andamio-app-template, which ships with
  generic Andamio branding, a multi-instance navigation model, and a neutral
  default theme. No identity layer existed to separate Cardano XP as its own product.
resolution_type: full-stack identity layer
---

# Template to Standalone Product Identity

## Problem

Cardano XP was forked from the Andamio app template. Everything about it — colors, fonts, logos, navigation labels, page copy, metadata, footer links — said "Andamio." A visitor would see an Andamio product, not a distinct Cardano reputation experiment.

Specific issues:
- `metadataBase` pointed to `andamio.io`
- Footer links went to `docs.andamio.io`, `andamio.io`, Andamio GitHub/Twitter
- Transaction UI strings said "Andamio protocol" and "Andamio platform"
- Landing page had generic icon strip + 3 CTA cards from the template
- No tokenomics page, no about page, no project story
- `andamio.png` still in the logos directory
- `package.json` name was `andamio-app-template`

## Solution

Six phases, each building on the previous:

### Phase 1: Landing Page Redesign

Replaced the icon strip + 3-column CTA grid with a single bold hero:
- Custom brand mark (gold "XP" square + "Cardano XP" in display font) replaces the SVG logo
- Headline with gold accent color highlight
- Single "Connect Wallet" CTA with breathing gold glow animation (`xp-pulse-glow`)
- Secondary links: "What is this?" and "Tokenomics"
- Wallet connection flow unchanged — button triggers existing `handleEnter` → `RegistrationFlow`

**`src/components/landing/landing-hero.tsx`** — gutted default state, kept authenticating/scanning/registration states.

### Phase 2: Brand Separation

**`src/config/branding.ts`:**
- `links.website` → reads from `NEXT_PUBLIC_SITE_URL` env var, defaults to `cardano-xp.io`
- `links.github` → `Andamio-Platform/cardano-xp`
- `links.twitter` → removed (no Cardano XP social presence yet)
- `links.docs` → kept `docs.andamio.io` (transaction help links still needed)
- Tagline, description updated to Cardano XP messaging

**`src/config/marketing.ts`:**
- Removed `secondaryCta` ("What is Andamio?")
- Footer links replaced with `poweredBy` object
- All copy updated

**`src/app/layout.tsx`:**
- `metadataBase` reads from `NEXT_PUBLIC_SITE_URL` env var

**`src/config/transaction-ui.ts`:**
- "Andamio protocol" → "Cardano XP" in 3 transaction descriptions

### Phase 3: Asset Cleanup

- Removed `public/logos/andamio.png`
- Removed `public/landing-page-icons/` (6 PNGs, only referenced in old hero)
- Removed unused `Image` and `MARKETING` imports from landing hero

### Phase 4: Visual Identity

**`--radius: 0`** in `globals.css` `:root` — every shadcn component gets sharp corners from one change. No component code touched.

**Font change:** Space Grotesk → DM Sans for display. Strong, geometric, doesn't draw attention. Loaded in `layout.tsx` with weights 500/600/700.

**Layered background system** on landing page (`page.tsx`):
```
xp-grid      → 48px structural grid lines
xp-mesh-deep → 4-stop radial gradient mesh (all three hue families)
xp-glow-spot → single warm gold accent light at center
xp-vignette  → inset box-shadow darkened edges for focus
```

**App layout** (`app-layout.tsx`) also gets `xp-grid` + `xp-mesh-bg` for consistent depth across all routes.

**New CSS utilities in `globals.css`:**
- `xp-mesh-deep` — more intense mesh gradient for hero
- `xp-grid` — subtle 48px grid overlay
- `xp-vignette` — darkened edges via inset box-shadow
- `xp-glow-spot` — radial gold accent light
- `xp-pulse-glow` — breathing gold box-shadow animation for CTA

### Phase 5: New Content Pages

**`/xp` — Tokenomics page** (`src/app/(app)/xp/page.tsx`):
- Hero: "Let's try something different with tokens."
- Three-step mechanism: Earn XP → Build reputation → Let others earn it too
- Stats grid: 100k supply, tasks only, on-chain credentials, permissionless
- Problem statement, loop diagram, "What this is not", supply exhaustion answer

**`/about` — About page** (`src/app/(app)/about/page.tsx`):
- Story: built in ~3 hours of vibe coding, forgive the AI slop
- Three things you can do: give feedback, earn XP, build track record
- Why this exists: Catalyst indictment, "we have a public ledger, we should use it"
- CTA: Connect Wallet, View Tasks, Read Tokenomics

### Phase 6: Navigation & Copy

**Unified nav bar** — replaced separate AuthStatusBar + AppNavBar with single glass nav:
- Same `AppNavBar` component used on landing page and all app routes
- Brand mark (gold XP square), flat nav links, network badge, user alias, theme toggle, auth action
- Uses `xp-glass` utility for frosted backdrop-blur

**Navigation labels** (`navigation.ts`):
- "Learn" → "About" (links to `/about`)
- "Credentials" → "My XP"
- Added "Tokenomics" (links to `/xp`)

**Headline iterations:**
- "Support Cardano development, earn rewards" → too trite
- "Put your track record on-chain" → too narrow
- **"Build new systems."** → final, with subtext about real experiments on Cardano

## Key Patterns

**Single CSS variable for global radius:** `--radius: 0` cascades to all `--radius-sm`, `--radius-md`, etc. via `calc()`. No per-component overrides needed.

**Config-driven branding:** All user-visible text flows through `BRANDING` and `MARKETING` objects. New pages call `getPageMetadata()` rather than hardcoding metadata.

**Environment-variable metadataBase:** `NEXT_PUBLIC_SITE_URL` allows different domains for dev/preview/production without code changes.

**Layered CSS backgrounds:** Fixed `pointer-events-none` divs with `aria-hidden`, stacked via source order. Each layer is a single CSS utility class — composable and independently adjustable.

## Prevention Strategies

### Avoid Template Identity Drift

1. **Never merge upstream template changes blindly.** Use `git merge --no-commit` and inspect every incoming change against `src/config/`, `globals.css`, and `layout.tsx`.

2. **Rename `package.json` name** from `andamio-app-template` to `cardano-xp` — leaks into build logs and error stacks.

3. **Treat `src/config/` as a protected zone.** The four config files (`branding.ts`, `marketing.ts`, `navigation.ts`, `cardano-xp.ts`) are the identity perimeter.

4. **`--radius: 0` is deliberate.** Any shadcn component update that reintroduces border-radius will fight this. Check after updates.

5. **Fonts are identity.** DM Sans display + Inter body is what distinguishes from the template. Don't swap casually.

6. **The three OKLCH hues are sacred:** h248 (Depth), h85 (Earned), h175 (Milestone). Hardcoded throughout CSS utilities.

### Ongoing Audit

Run periodically to catch Andamio string leaks:
```bash
grep -ri "andamio" src/ --include="*.tsx" --include="*.ts" \
  | grep -v components/andamio \
  | grep -v andamio-auth \
  | grep -v generated
```

Should return only:
- `config/branding.ts` (docs.andamio.io for transaction help, support email)
- `config/transaction-ui.ts` (docs URL references)
- `marketing.ts` (poweredBy footer)

### Remaining Items

- [ ] Rename `package.json` name to `cardano-xp`
- [ ] Create OG image at `public/og-image.png` (1200x630, branded)
- [ ] Replace `support@andamio.io` when Cardano XP has its own support channel
- [ ] Eventually create Cardano XP docs to replace `docs.andamio.io` transaction help links

## Related Documents

- **Origin brainstorm:** `docs/brainstorms/2026-03-15-standalone-identity-brainstorm.md`
- **Implementation plan:** `docs/plans/2026-03-15-feat-standalone-identity-landing-page-plan.md`
- **Prior structural separation:** `docs/solutions/architecture/strip-template-to-single-course-app.md`
- **Theme system:** `docs/solutions/ui-bugs/cardano-dapp-theme-system.md`
- **Template independence (git):** `docs/plans/2026-03-06-refactor-template-independence-plan.md`
- **Project inception:** `docs/solutions/project-setup/cardano-xp-inception.md`

## Files Changed

| File | What changed |
|------|-------------|
| `src/app/page.tsx` | Layered background, unified nav, removed SVG logo |
| `src/components/landing/landing-hero.tsx` | Brand mark, bold headline, glow CTA, secondary links |
| `src/components/layout/app-nav-bar.tsx` | Unified glass nav with brand mark, auth, theme toggle |
| `src/components/layout/app-layout.tsx` | Removed AuthStatusBar, added mesh background |
| `src/components/layout/studio-layout.tsx` | Removed AuthStatusBar |
| `src/config/branding.ts` | Links, tagline, description updated for Cardano XP |
| `src/config/marketing.ts` | Copy, footer, CTA updated; Andamio references removed |
| `src/config/navigation.ts` | About, Contribute, Tokenomics, My XP |
| `src/config/transaction-ui.ts` | "Andamio protocol/platform" → "Cardano XP" |
| `src/styles/globals.css` | `--radius: 0`, new background utilities, pulse glow |
| `src/app/layout.tsx` | DM Sans font, metadataBase from env var |
| `src/app/(app)/xp/page.tsx` | New tokenomics page |
| `src/app/(app)/about/page.tsx` | New about page |
| `.env.example` | Added `NEXT_PUBLIC_SITE_URL` |
| `public/logos/andamio.png` | Removed |
| `public/landing-page-icons/*` | Removed (6 PNGs) |
