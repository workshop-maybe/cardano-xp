---
date: 2026-03-28
topic: responsive-design
---

# Full Responsive Design Pass

## Problem Frame

The Cardano XP app looks good on laptop screens but has gaps on mobile and tablet viewports. Users accessing the app on phones (320-480px) encounter overflow issues, cramped layouts, and hidden content that degrades the experience. A responsive-only pass is needed to make every page feel polished and native-quality across all devices.

## Requirements

**Global Layout & Navigation**
- R1. Navigation bar must be fully usable on phones — all critical actions (wallet connect, nav links) accessible without hidden overflow
- R2. Page container padding and spacing must scale smoothly from 320px to 1536px+ viewports
- R3. Footer must remain readable and not overflow on small screens

**Typography & Content**
- R4. All text must remain readable without horizontal scrolling on any viewport
- R5. Heading sizes must scale appropriately — no oversized headings that dominate small screens
- R6. Long content (addresses, hashes, URLs) must truncate or wrap gracefully on mobile

**Grid & Card Layouts**
- R7. Grid layouts must collapse to single-column on phones, with appropriate intermediate steps for tablets
- R8. Cards must not overflow their container or create horizontal scroll on any viewport
- R9. Dashboard stat grids must remain scannable on mobile (2-col minimum, not 4-col cramped)

**Tables & Data**
- R10. Tables must be usable on mobile — either responsive card view, horizontal scroll container, or smart column hiding with no loss of critical data
- R11. No table content should silently disappear on mobile without an alternate way to access it

**Forms & Interactive Elements**
- R12. Touch targets must be at least 44px for all interactive elements on mobile
- R13. Form inputs and buttons must be full-width or appropriately sized on mobile
- R14. Modals and dialogs must not overflow the viewport on small screens

**Page-Specific**
- R15. Landing page hero must look intentional on mobile — not a squeezed desktop layout
- R16. XP page stat cards and charts must be readable on phones
- R17. Task and course cards must display key info without overflow on mobile
- R18. Editor page must be usable on tablets (mobile editing is acceptable as cramped but not broken)
- R19. Admin pages must be functional on tablet and above (mobile admin is a non-goal)

## Success Criteria

- Every page renders without horizontal scroll on a 320px viewport
- No text is cut off or unreadable on any viewport
- Touch targets meet 44px minimum on mobile
- Visual quality feels intentional and polished on iPhone SE (375px), iPhone 14 (390px), iPad (768px), and laptop (1280px+)
- No functional regressions — all features remain accessible

## Scope Boundaries

- No new features, routes, or components
- No logic changes or data flow modifications
- No refactoring beyond what responsive layout requires
- Admin pages: tablet+ only (mobile admin is out of scope)
- Editor: functional on tablet, acceptable-but-not-broken on mobile
- No changes to color scheme, typography scale, or design tokens beyond responsive adjustments

## Key Decisions

- **Mobile-first approach**: Fix mobile breakpoints first, verify tablet, confirm desktop unchanged
- **Responsive-only**: Strictly CSS/Tailwind changes — no component restructuring unless a layout literally cannot be fixed with styles alone
- **Progressive disclosure over hiding**: Prefer collapsible sections or scrollable containers over simply hiding content on mobile

## Outstanding Questions

### Deferred to Planning
- [Affects R10][Needs research] Best pattern for making data tables responsive — card view vs. scroll container vs. hybrid approach
- [Affects R1][Needs research] Whether nav needs a mobile hamburger menu or if current link reduction is sufficient
- [Affects R18][Technical] Extent of editor responsiveness achievable with CSS-only changes

## Next Steps

-> `/ce:plan` for structured implementation planning
