---
title: "refactor: Full Responsive Design Pass"
type: refactor
status: completed
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-responsive-design-requirements.md
---

# Full Responsive Design Pass

## Overview

CSS/Tailwind-only changes to make every page in the Cardano XP app look polished on phones (320-480px), tablets (768px), and large screens (1280px+). No new features, no logic changes — strictly responsive layout fixes.

## Problem Frame

The app looks good on laptop screens but has overflow, cramped layouts, and hidden content on mobile viewports. The navigation bar has no mobile menu pattern, some grids use fixed column counts, and one table lacks a scroll wrapper entirely. Users on phones cannot navigate reliably or view all content. (see origin: docs/brainstorms/2026-03-28-responsive-design-requirements.md)

## Requirements Trace

- R1. Nav bar fully usable on phones — all actions accessible
- R2. Container padding/spacing scales smoothly 320px-1536px+
- R3. Footer readable, no overflow on small screens
- R4. All text readable without horizontal scroll
- R5. Heading sizes scale appropriately
- R6. Long content (addresses, hashes) truncates/wraps gracefully
- R7. Grids collapse to single-column on phones
- R8. Cards don't overflow containers
- R9. Dashboard stat grids scannable on mobile (2-col minimum)
- R10. Tables usable on mobile
- R11. No table content silently disappears
- R12. Touch targets at least 44px on mobile
- R13. Form inputs/buttons full-width or appropriately sized on mobile
- R14. Modals/dialogs don't overflow viewport
- R15. Landing hero looks intentional on mobile
- R16. XP stat cards/charts readable on phones
- R17. Task/course cards display key info without overflow
- R18. Editor usable on tablets
- R19. Admin functional on tablet+ (mobile admin out of scope)

## Scope Boundaries

- CSS/Tailwind class changes only — no component restructuring unless layout literally cannot be fixed with styles alone
- No new routes, features, or components (exception: mobile nav trigger button is the minimum structural addition needed for R1)
- No logic, data flow, or API changes
- Admin pages: tablet+ only
- Editor: functional on tablet, acceptable-but-not-broken on mobile
- No changes to design tokens, color palette, `--radius: 0`, or `border-muted-foreground/30` border colors (documented identity choices)
- Never truncate hashes/policy IDs — `break-all` wrapping is intentional per institutional learning
- Never animate width/height — only transform and opacity (CSS-first rule from theme docs)

## Context & Research

### Relevant Code and Patterns

- **Progressive padding pattern**: `px-4 sm:px-6 lg:px-8` used in `AppLayout` — follow this for all spacing
- **Section header pattern**: `flex-col sm:flex-row sm:items-center sm:justify-between` in `AndamioSectionHeader` — model for flex-to-stack
- **Dialog responsive pattern**: `max-w-[calc(100%-2rem)] sm:max-w-lg` in `dialog.tsx` — already handles mobile well
- **Sheet component**: `sheet.tsx` exists with `w-3/4 sm:max-w-sm` — ideal for mobile nav drawer
- **Table scroll pattern**: `AndamioTableContainer` wraps with `overflow-x-auto` — standard for all tables
- **Touch target utility**: `.touch-target` class exists in `globals.css` (`min-h-[2.75rem] min-w-[2.75rem]`) but is unused
- **`xs` breakpoint (375px)**: Defined in theme but used only in `auth-status-bar.tsx`
- **Heading scale pattern**: `text-4xl sm:text-5xl` used consistently across pages

### Institutional Learnings

- **No mobile nav exists**: Old `mobile-nav.tsx` was deleted during template strip. Never replaced. (from `strip-template-to-single-course-app.md`)
- **Glass nav performance**: `backdrop-blur-xl` is GPU-intensive on mobile Safari. Consider reducing blur intensity at smaller breakpoints. (from `cardano-dapp-theme-system.md`)
- **Auth-state nav items**: Nav has variable-width content (mint prompt, alias, network badge). Must account for all auth states in mobile layout. (from `onboarding-ux-overhaul.md`)
- **Footer gap**: `gap-x-12` causes poor single-item wrapping on mobile. (from `footer-component-not-shared-dark-mode-border.md`)
- **Background layers**: Fixed-position decorative divs render at full viewport — intentional. Landing page `xp-mesh-deep` uses heavy radial gradients. (from `template-to-standalone-product-identity.md`)

## Key Technical Decisions

- **Mobile nav: Sheet drawer triggered by hamburger icon**: The app has ~6 nav items plus auth-dependent items. A Sheet (already in the component library) triggered by a hamburger button on small screens is the simplest pattern. It avoids adding a new component — Sheet already exists with mobile-friendly sizing. The hamburger trigger is the one structural addition needed.
- **Tables: horizontal scroll containers**: The codebase already uses `AndamioTableContainer` with `overflow-x-auto` for most tables. Extending this pattern to the wallet page table is simpler and more consistent than card-view alternatives. Column hiding with `hidden md:table-cell` is already used and sufficient when critical data remains visible.
- **Admin layout: CSS min-width gate**: Since mobile admin is explicitly out of scope (R19), the admin `ResizablePanelGroup` just needs to work at 768px+. Adding responsive panel sizes (larger sidebar % on tablet) is sufficient without restructuring.
- **Touch targets: apply existing utility**: The `.touch-target` class already exists. Apply it to nav links and small interactive elements rather than inventing new patterns.

## Open Questions

### Resolved During Planning

- **Table responsive pattern**: Horizontal scroll containers. The `AndamioTableContainer` pattern already exists and works. Extending it to the wallet page table is the path of least resistance.
- **Nav mobile pattern**: Sheet drawer. The Sheet component already exists with responsive sizing (`w-3/4 sm:max-w-sm`). Adding a hamburger trigger on `sm:hidden` and moving nav links into a Sheet on mobile is minimal structural change.
- **Editor responsiveness**: CSS-only is sufficient. The editor page is a demo — `md:grid-cols-2` on extension kits and flexible editor height are the only changes needed.

### Deferred to Implementation

- **Exact nav items in Sheet vs. always-visible**: May need to test which items to keep visible on mobile vs. move into the Sheet. Start with all nav links in Sheet, keep only brand + hamburger + wallet connect visible.
- **Admin panel sizes at tablet widths**: The exact `defaultSize` values for the ResizablePanelGroup at 768px need testing. Start with 25%/75% and adjust.

## Implementation Units

- [ ] **Unit 1: Mobile Navigation — Sheet Drawer**

**Goal:** Add a mobile-friendly navigation pattern so all nav items and actions are accessible on phones.

**Requirements:** R1, R12

**Dependencies:** None

**Files:**
- Modify: `src/components/layout/app-nav-bar.tsx`

**Approach:**
- Add a hamburger menu button visible only below `sm` breakpoint (`sm:hidden`)
- Use the existing `Sheet` component to create a slide-out nav drawer
- Move all nav links + Sign Out + auth-state items into the Sheet on mobile
- Keep visible on mobile: brand logo, hamburger trigger, wallet connect button
- Hide the inline nav links on mobile (`hidden sm:flex`)
- Ensure touch targets in Sheet are 44px+ (use `.touch-target` utility or explicit `min-h-[44px]`)
- Sheet should close on nav link click

**Patterns to follow:**
- `Sheet` component from `src/components/ui/sheet.tsx` — `w-3/4 sm:max-w-sm` pattern
- `auth-status-bar.tsx` progressive disclosure pattern as a reference

**Test scenarios:**
- Happy path: On 375px viewport, hamburger icon is visible, tapping opens Sheet with all nav links
- Happy path: On 375px viewport, Sign Out is accessible inside the Sheet
- Happy path: On 768px+ viewport, inline nav is visible, no hamburger icon
- Edge case: All auth states (unauthenticated, authenticated without alias, authenticated with alias) render correctly in both mobile Sheet and desktop inline nav
- Edge case: Sheet closes when a nav link is tapped
- Integration: Conditional "Mint Access Token" and "Admin" links appear correctly in mobile Sheet based on auth state

**Verification:**
- All nav items and Sign Out accessible at 320px via Sheet
- No horizontal overflow on nav bar at 320px
- Desktop nav unchanged at 1280px

---

- [ ] **Unit 2: Footer Responsive Fix**

**Goal:** Fix footer wrapping so items display cleanly on mobile.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `src/components/layout/app-footer.tsx`

**Approach:**
- Change `gap-x-12` to `gap-x-4 sm:gap-x-12` so items wrap more tightly on mobile
- Verify `flex-wrap` still produces readable 2-3 item rows on 320px

**Patterns to follow:**
- Progressive gap pattern matching `AppLayout` progressive padding approach

**Test scenarios:**
- Happy path: At 320px, footer items wrap into readable rows with tight gap
- Happy path: At 1280px, footer layout unchanged with `gap-x-12`

**Verification:**
- Footer items readable and evenly spaced at 320px without overflow

---

- [ ] **Unit 3: Landing Page Hero Mobile Polish**

**Goal:** Make the landing page hero feel intentional on mobile, not a squeezed desktop layout.

**Requirements:** R15, R5

**Dependencies:** None

**Files:**
- Modify: `src/components/landing/landing-hero.tsx`
- Modify: `src/app/page.tsx` (if parent section padding needs adjustment)

**Approach:**
- Reduce parent section padding on mobile: `px-4 sm:px-6` instead of fixed `px-6`
- Adjust CTA button layout to use `sm:flex-row` instead of jumping to `lg:flex-row` — buttons should go side-by-side on tablets
- Verify headline `text-4xl sm:text-5xl md:text-7xl` scales well at 320px (may need `text-3xl` at base)
- Reduce `max-w-xs` on CTA buttons to allow wider buttons on small phones

**Patterns to follow:**
- About page heading pattern: `text-4xl sm:text-5xl`

**Test scenarios:**
- Happy path: At 375px, hero headline is readable, not oversized, CTA buttons are stacked and full-width
- Happy path: At 768px, CTA buttons are side-by-side
- Happy path: At 1280px, layout unchanged
- Edge case: At 320px, headline doesn't cause horizontal scroll

**Verification:**
- No horizontal scroll at 320px
- CTA buttons transition from stacked to side-by-side at appropriate breakpoint
- Hero feels intentional, not squeezed

---

- [ ] **Unit 4: Tasks Page Responsive Fixes**

**Goal:** Fix the 3-column stats grid and cramped contributor status bar on mobile.

**Requirements:** R7, R9, R17

**Dependencies:** None

**Files:**
- Modify: `src/app/(app)/tasks/tasks-content.tsx`

**Approach:**
- Change stats grid from fixed `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` (single column on mobile stacks stats vertically — scannable)
- Fix contributor status bar: change `flex items-center justify-between gap-4` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4` so text and button stack on mobile
- Verify task cards render cleanly in single column

**Patterns to follow:**
- Section header flex-to-stack pattern from `AndamioSectionHeader`
- Task detail stats `grid-cols-2 md:grid-cols-4` as a reference

**Test scenarios:**
- Happy path: At 320px, stats grid shows one stat per row, all readable
- Happy path: At 640px+, stats grid returns to 3-column layout
- Happy path: At 320px, contributor status text and button stack vertically
- Edge case: Large XP values (e.g., "100,000 XP") don't overflow stat cells at any breakpoint

**Verification:**
- No overflow in stats grid at 320px
- Contributor bar is usable on mobile with stacked layout
- Desktop layout at 1280px unchanged

---

- [ ] **Unit 5: XP Page Layout Fixes**

**Goal:** Fix the cramped "loop" section and verify stat grids on mobile.

**Requirements:** R16, R7

**Dependencies:** None

**Files:**
- Modify: `src/app/(app)/xp/xp-content.tsx`

**Approach:**
- Fix loop section: change `flex items-center gap-4` with two `flex-1` items to `flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4` so action and result stack on mobile
- Verify mechanism grid `md:grid-cols-3` collapses cleanly to single column
- Verify stats grid `sm:grid-cols-2 lg:grid-cols-4` handles 320px well
- Reduce `p-8` on mechanism cards to `p-4 sm:p-8` if they look cramped in single-column mobile

**Patterns to follow:**
- Tasks page flex-to-stack pattern
- Progressive padding: `p-4 sm:p-8`

**Test scenarios:**
- Happy path: At 320px, loop items stack vertically with action above result
- Happy path: At 640px+, loop items return to side-by-side
- Happy path: At 320px, mechanism cards single-column with reasonable padding
- Edge case: Treasury XP value with large numbers doesn't overflow

**Verification:**
- No cramped side-by-side text at 320px
- All stat values readable on mobile

---

- [ ] **Unit 6: Wallet Page Table Fix**

**Goal:** Wrap the wallet transaction table in a scroll container so it doesn't overflow on mobile.

**Requirements:** R10, R11

**Dependencies:** None

**Files:**
- Modify: `src/app/(app)/wallet/page.tsx`

**Approach:**
- Wrap the raw `<table>` in a `div` with `overflow-x-auto` (matching `AndamioTableContainer` pattern)
- Reduce cell padding from `p-4` to `p-2 sm:p-4` for tighter mobile layout
- Consider hiding the Date column on mobile with `hidden sm:table-cell` (date is least critical for transaction identification)
- Add `whitespace-nowrap` on amount values to prevent awkward wrapping

**Patterns to follow:**
- `AndamioTableContainer` from `src/components/andamio/andamio-table-container.tsx` — `overflow-x-auto` wrapper
- Tasks table column hiding: `hidden md:table-cell`

**Test scenarios:**
- Happy path: At 320px, table scrolls horizontally without page-level horizontal scroll
- Happy path: At 768px+, all columns visible without scrolling
- Edge case: Long transaction hashes don't break layout (should truncate or use `break-all`)
- Edge case: Table with 0 transactions renders correctly at all viewports

**Verification:**
- No page-level horizontal scroll at 320px
- All transaction data accessible (scroll or column visibility)

---

- [ ] **Unit 7: Admin Layout Tablet Fix**

**Goal:** Make the admin resizable panel layout work properly on tablets (768px+).

**Requirements:** R19

**Dependencies:** None

**Files:**
- Modify: `src/app/(admin)/admin/layout.tsx`
- Modify: `src/app/(admin)/admin/project/page.tsx` (tab overflow)

**Approach:**
- Admin sidebar: adjust `defaultSize` values for better tablet proportion (sidebar needs ~180px minimum for labels, which is ~23% at 768px)
- Fix tab overflow in project page: add `overflow-x-auto` or `flex-wrap` on the tabs list container
- Set `minSize` on sidebar panel to prevent it from being resized too small on tablet
- Since mobile admin is out of scope, no structural changes needed — just ensure the existing layout works at 768px

**Patterns to follow:**
- Existing `ResizablePanelGroup` usage
- `overflow-x-auto` scroll pattern for tabs

**Test scenarios:**
- Happy path: At 768px, admin sidebar and content are both usable
- Happy path: At 1280px, admin layout unchanged
- Edge case: All 4 project tabs visible at 768px (either scrollable or wrapped)
- Edge case: Sidebar panel cannot be resized below readable minimum

**Verification:**
- Admin is functional at 768px
- Tab labels don't overflow or get cut off

---

- [ ] **Unit 8: Global Touch Targets, Typography & Misc Fixes**

**Goal:** Apply touch target sizing, fix miscellaneous responsive issues across remaining components.

**Requirements:** R4, R5, R6, R8, R12, R13, R14

**Dependencies:** Units 1-7 (builds on earlier fixes, handles remaining issues)

**Files:**
- Modify: `src/app/(app)/about/page.tsx` (card padding)
- Modify: `src/app/(app)/credentials/page.tsx` (summary card flex)
- Modify: `src/app/(app)/contributor/page.tsx` (card header truncation)
- Modify: `src/components/auth/connect-wallet-button.tsx` (wallet grid)
- Modify: `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` (stat grid spacing)

**Approach:**
- About page: reduce grid cell padding from `p-8` to `p-4 sm:p-8` on mobile
- Credentials page: add `flex-wrap` to summary card `flex justify-between` container
- Contributor page: add `min-w-0` and `truncate` to task title in card headers to prevent overflow
- Connect wallet dialog: change `grid-cols-5` to `grid-cols-4 sm:grid-cols-5` so wallet icons have breathing room at 320px
- Task detail: verify `grid-cols-2` stats work at 320px, reduce padding if needed (`p-3 sm:p-4`)
- Apply touch-target minimum heights to small interactive elements where they appear undersized

**Patterns to follow:**
- Progressive padding: `p-4 sm:p-8`
- Flex-wrap pattern for justify-between containers
- `min-w-0 truncate` for overflow-prone text in flex containers

**Test scenarios:**
- Happy path: About page cards have comfortable padding at 320px
- Happy path: Credentials summary doesn't overlap at 320px
- Happy path: Contributor card titles truncate gracefully on mobile
- Happy path: Wallet connect dialog shows 4 icons per row at 320px, 5 at 640px+
- Edge case: Very long task titles truncate with ellipsis, not overflow
- Edge case: Touch targets on all interactive elements measure 44px+

**Verification:**
- No overflow on any of these pages at 320px
- All interactive elements have adequate touch targets
- Desktop layouts unchanged at 1280px

## System-Wide Impact

- **Interaction graph:** Changes are CSS/Tailwind only — no callbacks, middleware, or data flow affected. The one structural addition (hamburger button + Sheet in nav) uses existing components and has no side effects.
- **Error propagation:** No error handling changes. Responsive layout failures are visual only.
- **State lifecycle risks:** None. No state management changes.
- **API surface parity:** No API changes.
- **Integration coverage:** Visual regression is the primary risk. Each unit should be verified at 320px, 375px, 768px, and 1280px viewports.
- **Unchanged invariants:** All component props, data fetching, routing, auth flows, and transaction logic remain unchanged. The `--radius: 0` identity, `border-muted-foreground/30` borders, and `break-all` hash display are preserved.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Desktop layout regression | Verify each change at 1280px after mobile fixes. Mobile-first changes should not affect desktop when using `sm:` / `md:` / `lg:` prefixes correctly |
| Glass nav `backdrop-blur-xl` performance on mobile Safari | Monitor during implementation. If janky, reduce to `backdrop-blur-md` below `sm` breakpoint |
| Sheet nav z-index conflicts with glass nav | Sheet uses z-50 by default, nav uses z-40 — should layer correctly. Verify. |
| Auth-state nav items cause Sheet overflow | Sheet has scroll built in. Test all auth states in mobile Sheet |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-03-28-responsive-design-requirements.md](docs/brainstorms/2026-03-28-responsive-design-requirements.md)
- Related learnings: `docs/solutions/architecture/strip-template-to-single-course-app.md` (nav architecture)
- Related learnings: `docs/solutions/ui-bugs/cardano-dapp-theme-system.md` (design system rules)
- Related learnings: `docs/solutions/ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md` (auth-state nav items)
- Related learnings: `docs/solutions/ui-bugs/footer-component-not-shared-dark-mode-border.md` (footer gap issue)
