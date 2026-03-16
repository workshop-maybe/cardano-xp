---
title: Footer system status not displaying on all app pages
slug: footer-system-status-missing-pages
category: ui-bugs
tags:
  - footer
  - layout
  - visibility
  - styling
  - dark-mode
components_affected:
  - AppFooter
  - AppLayout
  - Landing Page
symptom: Footer with system status information was only showing on the landing page, not on other app pages. The footer also lacked "built on Cardano" text and had an invisible border in dark mode.
date_documented: 2026-03-16
---

# Footer Component Not Shared + Dark Mode Border Visibility

## Root Cause

The footer displaying system status information (network, version, status, agent state) was initially implemented inline only on the landing page (`src/app/page.tsx`). This meant:

1. **Inconsistent presence** — The footer only appeared on the landing page, not on application pages accessed through the main app
2. **Duplicate code** — Footer logic would need to be repeated or manually added to other pages
3. **Missing branding** — The footer didn't include "built on Cardano" messaging
4. **Subtle styling** — The border used `border-border` which was too faint in dark mode, making the footer visually indistinct

## Solution

The solution involved creating a reusable, shared footer component and integrating it into the core application layout:

1. **Extracted AppFooter component** (`src/components/layout/app-footer.tsx`) — A dedicated "use client" component that renders the system status bar
2. **Integrated into AppLayout** (`src/components/layout/app-layout.tsx`) — Added `<AppFooter />` to the main application layout so it appears on all app pages
3. **Updated landing page** (`src/app/page.tsx`) — Imported and used the shared `AppFooter` component instead of inline footer
4. **Fixed border visibility** — Changed from `border-border` to `border-muted-foreground/30` to ensure visibility in dark mode
5. **Added Cardano branding** — Included "built on cardano" text in the footer content

## Code Examples

**AppFooter Component** (`src/components/layout/app-footer.tsx`):
```tsx
"use client";

import { env } from "~/env";

export function AppFooter() {
  const network = env.NEXT_PUBLIC_CARDANO_NETWORK;

  return (
    <footer className="relative z-10 py-3 px-6 border-t border-muted-foreground/30">
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-1 text-[11px] text-muted-foreground/60 font-mono tracking-wide">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">network</span>
          <span className="text-secondary/80">{network}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">status</span>
          <span className="text-foreground/70">prototype</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">v</span>
          <span className="text-foreground/70">0.0.1</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground/40">agent</span>
          <span className="text-emerald-500/80">ready for feedback</span>
        </span>
        <span className="text-muted-foreground/40">
          built on cardano
        </span>
        <a href="https://andamio.io" target="_blank" rel="noopener noreferrer"
          className="text-muted-foreground/40 hover:text-foreground/60 transition-colors">
          powered by andamio
        </a>
      </div>
    </footer>
  );
}
```

**AppLayout Integration** (`src/components/layout/app-layout.tsx`):
```tsx
import { AppFooter } from "./app-footer";

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative flex h-screen w-full flex-col ...">
      <AppNavBar />
      <main className="relative z-10 flex-1 overflow-y-auto ...">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
```

**Key styling change** — Border visibility:
- Before: `border-t border-border` (invisible in dark mode)
- After: `border-t border-muted-foreground/30` (visible in both modes)

## Prevention Strategies

### Avoid Component Duplication
- Never import layout components (Footer, Nav) directly in page files
- Use layout.tsx files to wrap page content with shared components
- Document component scope in JSDoc comments

### Layout Composition in Next.js
- Root layout handles providers only (ThemeProvider, Auth, etc.)
- Route group layouts render shared UI (AppLayout, StudioLayout)
- Landing page should use a layout wrapper, not inline components

### Dark Mode Border Visibility
- The `border-border` variable is too subtle in dark mode (oklch 0.27)
- Use `border-muted-foreground/30` or define semantic border utilities
- Always test borders in both light and dark mode before shipping

## Related Documentation

This is the first solution documented for this codebase. Related architectural decisions:
- Theme system uses OKLCh color scales
- Layout pattern: AppLayout wraps all app routes
- Glass effects and border styling follow XP design system
