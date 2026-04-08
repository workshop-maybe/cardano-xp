---
title: "refactor: Consolidate navbar into dropdown menu groups"
type: refactor
status: completed
date: 2026-04-08
---

# refactor: Consolidate navbar into dropdown menu groups

## Overview

Replace the flat 8-item navigation bar with 2 grouped dropdown menus, reducing visual clutter from 8+ top-level items to 2 dropdown triggers. Uses the existing Radix NavigationMenu primitives already in the codebase.

## Problem Frame

The navbar currently renders 8 flat links (About, Access Token, Contribute, Tokenomics, My XP, Wallet, Sponsors, Transparency) plus conditional Admin, network badge, user alias, wallet name, and Sign Out — all in a single row. On anything narrower than a wide desktop monitor, this creates a crowded, hard-to-scan bar that fights for horizontal space with the right-side status/control items.

## Requirements Trace

- R1. Top-level nav items reduced to 2 visible triggers (from 8)
- R2. All current destinations remain accessible — no pages removed from navigation
- R3. Dropdowns open on hover (desktop), following standard NavigationMenu patterns
- R4. Active state indication preserved — active dropdown trigger highlights when any child route is active
- R5. Mobile sheet menu updated to reflect grouped structure with section headings
- R6. Glass aesthetic and existing design tokens preserved
- R7. Admin link, network badge, and user controls unchanged in the right-side area

## Scope Boundaries

- No new pages or routes added
- No changes to admin routes, footer, or right-side controls (badge, alias, wallet name, sign out)
- No changes to mobile hamburger trigger behavior (Sheet stays)
- No changes to authentication or wallet connection logic

## Context & Research

### Relevant Code and Patterns

- `src/config/navigation.ts` — flat `APP_NAVIGATION` array, `isNavItemActive()` helper
- `src/components/layout/app-nav-bar.tsx` — renders flat links from config, Sheet for mobile
- `src/components/ui/navigation-menu.tsx` — **existing Radix NavigationMenu primitives** (NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink) — unused by the navbar today
- `src/components/andamio/andamio-navigation-menu.tsx` — re-exports of the above (use ui/ directly)
- `src/config/routes.ts` — PUBLIC_ROUTES, AUTH_ROUTES used by nav items

### Institutional Learnings

- Responsive design requirements (docs/brainstorms/2026-03-28-responsive-design-requirements.md) R1: "Navigation bar must be fully usable on phones — all critical actions accessible without hidden overflow"

## Key Technical Decisions

- **Use Radix NavigationMenu**: Already in the codebase, provides hover-triggered dropdowns with proper accessibility (keyboard nav, focus management, screen reader announcements) out of the box. No new dependency.

- **Two dropdown groups**: Grouping into 2 categories strikes the best balance between decluttering and discoverability:
  - **Project** — About, Tokenomics, Sponsors, Transparency (informational pages about the project)
  - **Participate** — Access Token, Contribute, My XP, Wallet (contributor action/status pages)

- **No standalone top-level links besides dropdowns**: Wallet moves into "Participate" rather than staying standalone. Two triggers is cleaner than two triggers + a link.

- **Mobile: grouped sections with headings**: The Sheet menu gains section headers ("Project", "Participate") rather than a flat list, improving scannability.

## Open Questions

### Resolved During Planning

- **Should Wallet be standalone or grouped?** → Grouped under Participate. It's a contributor action, and keeping it standalone would leave 3 top-level items which is still fine but the grouping is more logical.
- **Dropdown content layout?** → Simple vertical list of links (not a grid/card layout). The items per group (4 each) don't warrant a complex layout.

### Deferred to Implementation

- Exact animation timing and easing for dropdown open/close — tune during implementation against the Radix defaults
- Whether dropdown content needs a glass backdrop or solid background — try glass first, fall back to solid if readability suffers

## Implementation Units

- [x] **Unit 1: Restructure navigation config for groups**

**Goal:** Change the navigation data model from flat array to grouped structure with labels and children.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `src/config/navigation.ts`
- Modify: `src/config/index.ts` (update barrel export to include `NAV_GROUPS` and `isGroupActive`)

**Approach:**
- Replace the flat `APP_NAVIGATION` array with a `NAV_GROUPS` structure: `{ label: string; items: { name, href }[] }[]`
- Keep `isNavItemActive` unchanged
- Add `isGroupActive(pathname, group)` helper that returns true if any child item is active
- Export both the old flat shape (for backward compat during transition) and the new grouped shape — or just replace directly since only `app-nav-bar.tsx` consumes it

**Patterns to follow:**
- Existing `APP_NAVIGATION` const pattern with `as const`
- Existing route imports from `./routes`

**Test expectation:** none — pure config data restructure with no behavioral logic beyond the existing `isNavItemActive`

**Verification:**
- TypeScript compiles without errors
- `NAV_GROUPS` contains all 8 current nav items across 2 groups

- [x] **Unit 2: Replace desktop flat links with NavigationMenu dropdowns**

**Goal:** Swap the flat `<Link>` list in the desktop nav area with Radix NavigationMenu triggers and dropdown content panels.

**Requirements:** R1, R3, R4, R6

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/layout/app-nav-bar.tsx`

**Approach:**
- Import `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink` from `~/components/ui/navigation-menu`
- Replace the `hidden sm:flex` div that maps `APP_NAVIGATION` with a `<NavigationMenu>` containing one `NavigationMenuItem` per group
- Each trigger shows the group label ("Project", "Participate") with the chevron indicator
- Each content panel lists the child links vertically
- Override trigger styles to match existing glass nav aesthetic (text-xs, font-medium, muted-foreground base, foreground on hover/active)
- Override content panel styles: glass or popover background, border-border/30, matching existing rounded-sm pattern
- Use `isGroupActive()` to highlight the trigger when any child route is active
- Preserve the Admin link as a standalone link after the NavigationMenu (it's conditional and styled differently)

**Patterns to follow:**
- Existing trigger style in `navigation-menu.tsx` (`navigationMenuTriggerStyle`) — customize to match the navbar's compact aesthetic
- Existing `cn()` utility for conditional classes
- Existing active state pattern: `bg-foreground/10 text-foreground` for active, `text-muted-foreground hover:bg-foreground/5` for inactive

**Test expectation:** none — UI-only change, visual verification via browser

**Verification:**
- Desktop nav shows 2 dropdown triggers instead of 8 flat links
- Hovering a trigger opens a dropdown with the grouped links
- Clicking a link navigates to the correct page
- Active route highlights both the link and the parent trigger
- Admin link still appears for admin users, styled distinctly

- [x] **Unit 3: Update mobile Sheet menu with grouped sections**

**Goal:** Replace the flat link list in the mobile Sheet with grouped sections using headings.

**Requirements:** R2, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/layout/app-nav-bar.tsx`

**Approach:**
- In the `<SheetContent>`, iterate over `NAV_GROUPS` instead of `APP_NAVIGATION`
- Render each group's label as a small section heading (text-xs uppercase tracking-wider text-muted-foreground, with top margin between groups)
- Render child links under each heading using the existing SheetClose + Link pattern
- Admin link stays at the bottom of the nav section, as it does now
- User status + sign out section at the bottom is unchanged

**Patterns to follow:**
- Existing SheetClose + Link pattern for nav items
- Existing active state styling

**Test expectation:** none — UI-only change, visual verification via browser

**Verification:**
- Mobile hamburger menu shows 2 labeled sections with their respective links
- All 8 destinations accessible
- Admin link still appears conditionally
- Touch targets remain 44px minimum (unchanged from existing implementation)

- [x] **Unit 4: Style refinement and glass aesthetic alignment**

**Goal:** Ensure dropdown panels match the navbar's glass aesthetic and feel polished.

**Requirements:** R6

**Dependencies:** Unit 2

**Files:**
- Modify: `src/components/layout/app-nav-bar.tsx`

**Approach:**
- Fine-tune dropdown content panel: `xp-glass` or `bg-popover/95 backdrop-blur-sm` for the panel background
- Ensure border, shadow, and rounded corners match the navbar style
- Adjust NavigationMenu trigger sizing to match the existing `px-2.5 py-1.5 text-xs` compact pattern
- Test at various desktop widths (1024px, 1280px, 1440px) to confirm the navbar doesn't wrap
- Verify the dropdown doesn't clip against the viewport edge

**Patterns to follow:**
- `xp-glass` utility class used by the navbar
- `border-border/30` border style
- Existing spacing and sizing (h-12 navbar, text-xs links)

**Test expectation:** none — pure visual styling

**Verification:**
- Dropdown panels feel like a natural extension of the glass navbar
- No visual jarring between the trigger and the content panel
- Content panel readable against both light and dark backgrounds
- Nav doesn't overflow or wrap at 1024px desktop width

## System-Wide Impact

- **Interaction graph:** Only `app-nav-bar.tsx` consumes `APP_NAVIGATION` from `navigation.ts`. No other components are affected by the config restructure.
- **Error propagation:** N/A — no error paths in navigation rendering
- **State lifecycle risks:** None — the NavigationMenu hover state is managed entirely by Radix
- **API surface parity:** Mobile and desktop nav remain in sync through shared `NAV_GROUPS` config
- **Unchanged invariants:** Admin link behavior, right-side controls (badge, alias, wallet, sign out), authentication flow, route definitions — all untouched

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Radix NavigationMenu default styles clash with glass aesthetic | Override trigger and content styles with existing design tokens; test visually |
| Dropdown feels slow or janky on hover | Radix defaults are well-tuned; adjust `delayDuration` prop if needed |
| Two top-level items feels too sparse | The Admin link (conditional) and right-side controls fill the bar; if it feels empty, a "Learn" direct link to `/learn` could be promoted — but start with 2 groups |

## Sources & References

- Existing component: `src/components/ui/navigation-menu.tsx` (Radix NavigationMenu primitives)
- Radix NavigationMenu docs for hover behavior and accessibility
- Related: `docs/brainstorms/2026-03-28-responsive-design-requirements.md` R1
