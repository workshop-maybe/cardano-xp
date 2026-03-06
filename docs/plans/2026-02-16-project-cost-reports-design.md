# Project Cost Reports — Design Document

## Problem

Andamio's enterprise contract with Intersect OSC (§4.2) requires a real-time dashboard documenting:

1. Number of maintainers onboarded
2. Number of milestones completed
3. Transaction fees incurred
4. Commission paid
5. Total ADA spent

These reports serve as retroactive documentation of costs already paid on-chain.

## Design Principles

- **Contract is the fee schedule** — use the fixed fee structure from the enterprise agreement, not raw on-chain fees
- **Client-side aggregation** — derive all metrics from the existing `useProject()` hook (no new API endpoints)
- **Owner/manager access only** — same role check the studio page already enforces
- **Cumulative KPIs now, monthly breakdown later** — assessments/contributors lack timestamps; file API issue for that

## Architecture

### Data Flow

```
useProject(projectId)
  → ProjectDetail { contributors[], assessments[], treasuryFundings[] }
    → useCostReportData(projectDetail)
      → { maintainersOnboarded, milestonesCompleted, transactionFees, commissionPaid, totalAdaSpent }
        → KPI cards + export
```

No new API endpoints. No new routes. One new tab on the existing studio project page.

### Fee Schedule (from contract Exhibit A)

| Event | Fee (ADA) | Derivation |
|-------|-----------|------------|
| Access token mint | 8.3 | Per contributor in `contributors[]` |
| Milestone TX fees | ~4.0 | Per assessment with `decision === "ACCEPTED"` |
| Commission | 30.0 | 1% of 3,000 ADA reward, per accepted milestone |

### Metric Derivation

| Metric | Source | Calculation |
|--------|--------|-------------|
| Maintainers onboarded | `projectDetail.contributors` | `contributors.length` |
| Milestones completed | `projectDetail.assessments` | `assessments.filter(a => a.decision === "ACCEPTED").length` |
| Transaction fees | Derived | `(contributors.length × 8.3) + (acceptedCount × 4.0)` |
| Commission paid | Derived | `acceptedCount × 30.0` |
| Total ADA spent | Derived | `transactionFees + commissionPaid` |

## UI

### Location

New "Reports" tab on `/studio/project/[projectid]?tab=reports`, alongside existing Overview, Tasks, Commitments, Settings tabs.

### Layout

**KPI Cards Row** — 5 cards showing cumulative totals for each contract metric.

**Export Buttons** — CSV and PDF download.

**Monthly Breakdown Table** — deferred until API provides timestamps on assessments and contributor joins. Placeholder text explains this.

### Access Control

Visible to project owners and managers only. Uses the existing `userRole` derivation already on the studio project page. No new auth logic.

## Export

### CSV

Client-side generation via `Blob` + `URL.createObjectURL`. Contains:
- Project name, ID, network, report date
- The 5 cumulative metrics
- Monthly rows (when timestamps become available)

### PDF

Uses `@react-pdf/renderer` (new dependency). Contains:
- Branded header with project name and date
- KPI summary table
- Monthly breakdown (when available)
- Footer: "Data derived from on-chain activity on Cardano"

## Files

### New Files (~4)

| File | Purpose |
|------|---------|
| `src/components/studio/project-cost-report.tsx` | Main Reports tab content (KPI cards, export buttons) |
| `src/components/studio/cost-report-pdf.tsx` | `@react-pdf/renderer` PDF document |
| `src/hooks/api/project/use-cost-report-data.ts` | Hook deriving 5 metrics from ProjectDetail |
| `src/lib/cost-report-utils.ts` | CSV generation, fee constants, slot-to-date utility |

### Modified Files (~1)

| File | Change |
|------|--------|
| `src/app/(studio)/studio/project/[projectid]/page.tsx` | Add "Reports" tab to validTabs, import and render ProjectCostReport |

### New Dependency

`@react-pdf/renderer` — React-native PDF generation (no headless browser needed)

## Deferred (API Issue)

File a GitHub issue on `andamio-api` requesting:

- `slot` or `timestamp` field on `ProjectAssessmentOnChain`
- `slot` or `timestamp` field on `ProjectContributorOnChain`

This unblocks the monthly breakdown table. Until then, the dashboard shows cumulative totals only.

## Not In Scope

- New routes (tab only)
- New API endpoints
- Real on-chain fee lookups (contract schedule used instead)
- Course-level reporting (project only)
- Historical trend charts
