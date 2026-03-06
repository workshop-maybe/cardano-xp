---
title: Full Responsive Design Pass for Mobile and Tablet Viewports
date: 2026-03-28
category: ui-bugs
module: layout, navigation, pages
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - Navigation bar overflows on phones with 6+ inline links and no hamburger menu
  - Sign Out button hidden on mobile with no alternative access
  - Stats grids use fixed column counts that overflow at 320px
  - Wallet transaction table has no scroll wrapper, overflows page on mobile
  - Footer items wrap awkwardly due to large gap-x-12 spacing
root_cause: config_error
resolution_type: code_fix
severity: medium
tags:
  - responsive
  - mobile
  - tailwind
  - navigation
  - sheet-drawer
  - viewport
  - breakpoints
  - touch-targets
---

# Full Responsive Design Pass for Mobile and Tablet Viewports

## Problem

The Cardano XP app looked good on laptop screens (1280px+) but had overflow, cramped layouts, and hidden functionality on mobile (320-480px) and tablet (768px) viewports. Users on phones couldn't navigate reliably, couldn't sign out, and encountered horizontal scroll on several pages.

## Symptoms

- Nav bar rendered 6+ inline links with no mobile menu pattern, causing overflow on phones
- Sign Out button (`hidden sm:flex`) was inaccessible on mobile
- Tasks page stats grid used fixed `grid-cols-3`, overflowing at 320px
- Wallet transaction table was a raw `<table>` with no `overflow-x-auto` wrapper
- Footer `gap-x-12` caused single-item-per-line wrapping on mobile
- XP page "loop" section had side-by-side flex items unreadable at narrow widths
- Card containers used fixed `p-8` padding, wasting space on mobile
- Admin resizable panel layout had too-small minimum sidebar size for tablets

## What Didn't Work

This was greenfield responsive work, not a debugging exercise. The key discovery during planning was that the old `mobile-nav.tsx` had been deleted during the template strip (documented in `strip-template-to-single-course-app.md`) and was never replaced, leaving no mobile navigation pattern.

## Solution

12 files changed across 8 implementation units, all CSS/Tailwind class modifications except one structural addition (Sheet drawer for mobile nav).

### Unit 1: Mobile Navigation (Sheet Drawer)

Added a hamburger menu button (`sm:hidden`) that triggers the existing shadcn/ui Sheet component (side="left"). All nav links, auth-state items, and Sign Out are accessible in the Sheet with 44px minimum touch targets. Desktop nav wrapped in `hidden sm:flex`.

```tsx
// Hamburger trigger (mobile only)
<Sheet>
  <SheetTrigger asChild>
    <button className="sm:hidden inline-flex min-h-[44px] min-w-[44px] items-center justify-center ...">
      <Menu className="h-5 w-5" />
    </button>
  </SheetTrigger>
  <SheetContent side="left">
    {/* All nav links wrapped in SheetClose asChild for auto-close on click */}
  </SheetContent>
</Sheet>

// Desktop nav links hidden on mobile
<div className="hidden sm:flex items-center gap-1 sm:gap-2">
  {APP_NAVIGATION.map(...)}
</div>
```

### Unit 2-8: Responsive Class Patterns

**Progressive padding:** `p-8` -> `p-4 sm:p-8` (applied to ~15 card containers across about, xp, and other pages)

**Progressive gap:** `gap-x-12` -> `gap-x-4 sm:gap-x-12` (footer)

**Responsive grids:** `grid-cols-3` -> `grid-cols-1 sm:grid-cols-3` (tasks stats), `grid-cols-5` -> `grid-cols-4 sm:grid-cols-5` (wallet dialog)

**Flex-to-stack:** `flex items-center justify-between` -> `flex flex-col sm:flex-row sm:items-center sm:justify-between` (contributor status bar, loop section)

**Table scroll:** Wrapped wallet page `<table>` in `<div className="overflow-x-auto">`, hid Date column on mobile with `hidden sm:table-cell`

**Admin tablet fix:** Increased ResizablePanel `minSize` from 12 to 15, `defaultSize` from 20 to 22. Added `overflow-x-auto` on tabs list.

## Why This Works

The root cause was missing responsive Tailwind breakpoint classes. The app was built desktop-first with many fixed values (`grid-cols-3`, `p-8`, `gap-x-12`) that worked at 1280px+ but overflowed or became cramped at narrower viewports. The fix applies mobile-first Tailwind classes that stack/collapse on small screens and expand at `sm:` (640px) or `md:` (768px) breakpoints.

The Sheet drawer was necessary because with 6+ nav items plus auth-state-dependent items, no CSS-only solution could make the inline nav work at 320px. The Sheet component already existed in the UI library with mobile-friendly sizing.

## Prevention

- **Use mobile-first Tailwind patterns from the start.** When adding grid or flex layouts, always specify the mobile base (`grid-cols-1`) and add responsive variants (`sm:grid-cols-3`) rather than starting with the desktop layout.
- **Test the `xs` breakpoint (375px) and 320px viewport** when building new pages. The app defines a custom `xs: 375px` breakpoint that should be used for progressive disclosure.
- **Apply the progressive padding pattern** (`p-4 sm:p-8`) to all new card containers. Never use fixed `p-8` on content areas.
- **Always wrap `<table>` elements** in `<div className="overflow-x-auto">` for horizontal scroll on mobile. Use the existing `AndamioTableContainer` component which does this automatically.
- **Ensure all interactive elements have 44px minimum touch targets** on mobile. The `.touch-target` utility exists in `globals.css` for this purpose.

## Related Issues

- `docs/solutions/architecture/strip-template-to-single-course-app.md` - Documented deletion of old `mobile-nav.tsx` that created the nav gap
- `docs/solutions/ui-bugs/cardano-dapp-theme-system.md` - Design system rules (--radius: 0, animation constraints, glass nav performance)
- `docs/solutions/ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md` - Auth-state nav items that must appear in both mobile Sheet and desktop inline nav
- `docs/solutions/ui-bugs/footer-component-not-shared-dark-mode-border.md` - Footer gap-x-12 issue and border-muted-foreground/30 design decision
- `docs/plans/2026-03-28-001-refactor-responsive-design-plan.md` - Full implementation plan with 8 units
- `docs/brainstorms/2026-03-28-responsive-design-requirements.md` - Requirements document (19 requirements, all addressed)
