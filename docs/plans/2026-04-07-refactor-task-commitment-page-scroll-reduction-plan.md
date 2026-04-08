---
title: "Refactor: Task Commitment Page — Eliminate Excessive Scrolling"
type: refactor
status: active
date: 2026-04-07
deepened: 2026-04-07
---

# Refactor: Task Commitment Page — Eliminate Excessive Scrolling

## Enhancement Summary

**Deepened on:** 2026-04-07
**Sections enhanced:** 6 proposed changes + technical considerations + edge cases
**Research sources:** repo-research-analyst, learnings-researcher, spec-flow-analyzer (18 gaps identified), Context7 (TipTap, React docs), 16 parallel review/design/research agents

### Key Improvements from Research
1. **Use `EditorContext.Provider`** to share TipTap editor instance — prevents content loss when editor moves in component tree (from TipTap docs)
2. **Use `flushSync` + `scrollIntoView`** for guaranteed scroll after state change (from React docs)
3. **Use `useLayoutEffect`** instead of `useEffect` for height measurement — synchronous pre-paint measurement avoids flash of uncollapsed content (from React docs)
4. **Unify evidence validation** across 3 inconsistent checks (from SpecFlow gap analysis)
5. **Add expiration guard** — users can currently write evidence for expired tasks with no warning (from SpecFlow gap analysis)

### New Considerations Discovered
- The REFUSED flow already has an inline editor (200px) — must unify with new-commitment editor pattern
- `TaskAction` component lacks `ConfirmDialog` that `TaskCommit` has — Design Principle 4 violation
- `taskStatus` prop not being passed to `TaskCommit` (line 823) — silent bug
- Cancel button destroys evidence with zero confirmation — data loss risk
- The `deniedFallback` lookup uses `find()` which returns first match, potentially stale

---

## Overview

The individual task commitment page (`/tasks/[taskhash]`) requires 6-8 full scroll actions to complete a commitment. Task metadata, redundant reward info, raw hashes, the commitment card, and the evidence editor are all stacked linearly in a single column with no progressive disclosure. The page reads like a document when it should feel like an app.

## Problem Statement / Motivation

James's walkthrough reveals the core UX failure: a user who wants to commit to a task must scroll past redundant information, connect their wallet mid-page, scroll more, find an editor that appears outside its logical container, type evidence, then scroll again to submit. The page violates multiple design system principles (Invisible Infrastructure, Breathing Room) and the excessive vertical stacking creates a passive reading experience instead of an active app interaction.

### Research Insights — Problem Analysis

**State machine complexity:** The commitment card has 9 distinct terminal states with a massive conditional tree (lines 317-796). The worst-case scroll depths occur in:
- **New commitment editing** (~Very High): stats + hash + content + XP card + commitment card + editor (300px) + TaskCommit card
- **REFUSED resubmission** (~Very High): stats + hash + content + XP card + editor (200px) + TaskAction card all inside commitment card

**Scroll depth by flow (estimated on 1080p):**

| Flow | Current Scroll Actions | After Refactor |
|------|----------------------|----------------|
| Unauthenticated visitor | 4-5 | 1-2 |
| New commitment (editing) | 6-8 | 2-3 |
| Committed (read-only) | 3-4 | 1 |
| REFUSED resubmission | 5-7 | 2-3 |
| ACCEPTED + claiming | 4-5 | 1-2 |

---

## Proposed Solution

Six targeted changes to the single 853-line component (`task-detail-content.tsx`) and its child components, ordered by scroll-reduction impact:

### Change 1: Remove Redundant XP Reward Card (~100-150px saved)

**File:** `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` lines 289-314

The dedicated "XP Reward" card repeats information already shown in stat card #2 of the stats grid. Remove the entire `AndamioCard` block. The stat grid's "XP Reward" `AndamioDashboardStat` already shows the token count.

#### Research Insights

**Design Principle 5 (Breathing Room):** "Forbids: Layouts where removing one element would make the page *better*." This card is the textbook violation — it duplicates stat #2 in a larger format.

**Pattern check:** No other page in the codebase has a dedicated card that repeats information already shown in a stat grid. This is an outlier.

**Edge case:** If the task has multiple token types (e.g., XP + another token), the stat grid only shows the count. Verify the stat card displays sufficient detail, or add a tooltip showing token breakdown.

---

### Change 2: Collapse Task Hash into Expandable Details (~60px saved)

**File:** `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` lines 268-273

The raw 64-character hex hash is displayed prominently, violating Design Principle 1 (Invisible Infrastructure). Replace with a collapsible `<details>` element labeled "Technical Details" that is collapsed by default. Only the task hash goes here for now.

#### Research Insights

**Implementation pattern:** Use native HTML `<details>/<summary>` for accessibility. Style the summary with existing text-muted-foreground classes:

```tsx
<details className="text-sm">
  <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
    Technical Details
  </summary>
  <div className="mt-2 p-3 bg-muted rounded-md">
    <code className="text-xs break-all">{task.taskHash}</code>
  </div>
</details>
```

**Why `<details>` over a custom accordion:** Native HTML, zero JS cost, accessible by default (keyboard + screen reader), and follows the progressive disclosure principle without adding component complexity.

---

### Change 3: Collapsible Task Description for Long Content (~200-800px saved)

**File:** `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` lines 276-286

This is the highest-impact change for worst-case flows. When the rendered `ContentDisplay` exceeds ~200px height, collapse it with a gradient fade and a "Show full description" toggle. Short descriptions (1-2 paragraphs) render fully without collapse.

#### Research Insights

**Use `useLayoutEffect` for height measurement (from React docs):**

`useLayoutEffect` runs synchronously after DOM mutations but before the browser paints. This prevents a flash of uncollapsed content that would occur with `useEffect`.

```tsx
const contentRef = useRef<HTMLDivElement>(null);
const [isCollapsed, setIsCollapsed] = useState(true);
const [needsCollapse, setNeedsCollapse] = useState(false);

useLayoutEffect(() => {
  if (contentRef.current) {
    const height = contentRef.current.getBoundingClientRect().height;
    setNeedsCollapse(height > 200);
  }
}, [task.contentJson]);
```

**Why `useLayoutEffect` over `ResizeObserver`:** For this case, content is static (task description doesn't change after load). `useLayoutEffect` measures once synchronously. `ResizeObserver` would be needed only if the content could resize dynamically (e.g., images loading, embeds expanding). Use `ResizeObserver` as a fallback if `ContentDisplay` renders asynchronously.

**Gradient overlay pattern:**

```tsx
<div className="relative">
  <div
    ref={contentRef}
    className={needsCollapse && isCollapsed ? "max-h-[200px] overflow-hidden" : ""}
  >
    <ContentDisplay content={task.contentJson} />
  </div>
  {needsCollapse && isCollapsed && (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
  )}
  {needsCollapse && (
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {isCollapsed ? "Show full description" : "Show less"}
    </button>
  )}
</div>
```

**Edge cases:**
- If `ContentDisplay` uses lazy-loaded images, the initial height measurement will be wrong. Add an `onLoad` handler or use `ResizeObserver` as backup.
- Ensure the gradient `from-card` matches the actual card background in both light and dark modes.
- Consider whether the 200px threshold should be adjustable per viewport (e.g., taller on desktop, shorter on mobile).

---

### Change 4: Move Evidence Editor Inside Commitment Card (spatial fix, no height reduction)

**File:** `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` lines 772-794 (trigger) and 799-850 (editor)

Currently, clicking "Commit to This Task" shows "Complete your submission below" inside the commitment card, but the editor renders as a sibling after the card closes (40-80px visual gap). This is a broken spatial reference.

Move the evidence editor, TaskCommit TX card, and Cancel button inside the commitment card, replacing the "Complete your submission below" text. This matches the existing REFUSED flow pattern (lines 533-637) where the editor is already inside the card.

#### Research Insights

**Critical: TipTap editor remount prevention (from TipTap docs):**

When moving the editor from outside to inside the commitment card, the editor's position in the React tree changes. This causes React to unmount and remount it, destroying content.

**Solution: Use `EditorContext.Provider` to share the editor instance:**

```tsx
// Lift editor creation to the parent level
const editor = useEditor({
  extensions: [...],
  content: evidence,
  onUpdate: ({ editor }) => setEvidence(editor.getJSON()),
});

const providerValue = useMemo(() => ({ editor }), [editor]);

// Inside the commitment card:
<EditorContext.Provider value={providerValue}>
  <EditorContent editor={editor} />
</EditorContext.Provider>
```

This decouples the editor instance lifecycle from its render position. The editor can be rendered anywhere in the tree without losing state.

**Alternative (simpler):** Keep the `evidence` state in a `useRef` alongside the `useState`. Even if the editor remounts, initialize it from the ref. This is less elegant but requires fewer changes.

**scrollIntoView with `flushSync` (from React docs):**

React batches state updates, so calling `scrollIntoView` immediately after `setIsEditingEvidence(true)` may target a DOM element that doesn't exist yet.

```tsx
import { flushSync } from 'react-dom';

const commitmentCardRef = useRef<HTMLDivElement>(null);

const handleStartEditing = () => {
  flushSync(() => {
    setIsEditingEvidence(true);
  });
  // DOM is now updated — safe to scroll
  commitmentCardRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
};
```

**Why `flushSync`:** Without it, React may batch the state update with other pending updates, and `scrollIntoView` fires before the editor DOM node exists. `flushSync` forces synchronous rendering of the state change.

---

### Change 5: Reduce Evidence Editor minHeight (~100-150px saved)

**File:** `src/components/editor/components/ContentEditor/index.tsx` line 164

The default `minHeight="300px"` is excessive for evidence submissions (typically 1-3 short paragraphs). Pass `minHeight="150px"` from both the new-commitment and REFUSED evidence editors. The editor still grows as the user types.

#### Research Insights

**Current usage audit:** The REFUSED flow already uses `minHeight="200px"` (line 577). After this refactor, both flows should use identical `minHeight="150px"` for consistency.

**Auto-grow behavior:** TipTap editors grow as content is added. Setting `minHeight="150px"` gives enough initial space for 3-4 lines of text while saving 150px of vertical space. The editor will expand as needed.

**Mobile consideration:** On iPhone SE (667px viewport height), a 150px editor + toolbar (~40px) + TaskCommit card (~250px) = ~440px inside the commitment card. This leaves ~227px for the card header and action buttons — tight but workable. Test at 375px width specifically.

---

### Change 6: Compact Stats on Mobile (~150-200px saved on small viewports)

**File:** `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` lines 239-265

The 4-card stats grid renders as 2x2 on mobile, pushing the action area ~300px below the fold. Switch to a more compact layout on mobile:
- Use `grid-cols-2 md:grid-cols-4` (already in place) but reduce card padding: `p-3 sm:p-4` instead of the default card padding
- Consider using `AndamioDashboardStat` without wrapping `AndamioCard` on mobile to reduce chrome

#### Research Insights

**From responsive design solution (`docs/solutions/ui-bugs/full-responsive-design-pass-mobile-tablet-2026-03-28.md`):**
- Always use progressive padding: `p-3 sm:p-4` (not fixed `p-4`)
- Use the custom `xs: 375px` breakpoint for smallest devices
- Test at 320px, 375px, and 640px+ viewports

**Pattern:** Other pages in the codebase use the same `grid-cols-2 md:grid-cols-4` pattern for stat grids. Changing padding here should be consistent with how other stat grids render.

---

## Technical Considerations

### Architecture Impact
- All changes are scoped to `task-detail-content.tsx` and its direct children. No routing, data fetching, or state management changes.
- The commitment card's conditional rendering tree (lines 317-796) is already complex. Moving the editor inside adds one more branch but follows the established REFUSED-flow pattern.

### State Transitions During Editing

#### Research Insights — Race Conditions and State Safety

**Expiration risk (SpecFlow Gap 4):**
The page displays `task.expirationTime` but never validates it. Add a client-side check:

```tsx
const isExpired = task.expirationTime
  ? new Date(task.expirationTime) < new Date()
  : false;

// In the commitment card's eligible-but-uncommitted branch:
{isExpired ? (
  <div className="text-center py-6">
    <p className="text-destructive font-medium">This task has expired</p>
    <p className="text-sm text-muted-foreground mt-1">
      The deadline for this task has passed.
    </p>
  </div>
) : (
  // ... normal commit button / editor flow
)}
```

**Note:** This is a client-side guard only. The on-chain transaction would fail anyway for expired tasks, but this prevents the user from wasting time writing evidence.

**Status change during editing (SpecFlow Gap 5 + 7):**
If `commitmentStatus` changes while the user is writing evidence (React Query polling), the editor disappears and content is lost.

Mitigation: Use a `useRef` to preserve evidence:

```tsx
const evidenceRef = useRef<JSONContent | null>(null);

// When evidence state changes, update the ref
useEffect(() => {
  if (evidence) evidenceRef.current = evidence;
}, [evidence]);

// When editor initializes, use ref as initial content
// This survives status changes that unmount/remount the editor
```

Also pass `taskStatus` to `TaskCommit` (currently missing at line 823). This allows `TaskCommit` to display a warning if the task status changes during editing.

**Cancel confirmation (SpecFlow Gap 12):**
The Cancel button (line 839) destroys evidence with no confirmation. Use the project's existing `ConfirmDialog` component:

```tsx
<ConfirmDialog
  title="Discard your work?"
  description="Your evidence submission will be lost."
  confirmText="Discard"
  onConfirm={() => {
    setIsEditingEvidence(false);
    setEvidence(null);
  }}
>
  <Button variant="outline">Cancel</Button>
</ConfirmDialog>
```

Only show the confirm dialog when `hasValidEvidence` is true (user has typed content). If evidence is empty, cancel immediately.

### Evidence Validation Inconsistency

#### Research Insights

Three different validation checks exist — this is a bug-class issue:

| Location | Check | Strictness |
|----------|-------|-----------|
| New commitment (line 822) | `evidence && Object.keys(evidence).length > 0` | Loose — passes `{ type: "doc" }` with no content |
| REFUSED resubmit (lines 144-149) | `hasValidEvidence` — checks for non-empty paragraph content | Strict |
| TaskCommit (internal) | `computedHash` must be non-null | Hash-based |

**Unify on `hasValidEvidence`** for all evidence submissions. Extract the check to a shared utility if not already:

```tsx
const hasValidEvidence = useMemo(() => {
  if (!evidence) return false;
  const content = evidence as { content?: Array<{ content?: Array<{ text?: string }> }> };
  return content.content?.some(
    (node) => node.content?.some((child) => child.text?.trim())
  ) ?? false;
}, [evidence]);
```

Use this for both: (a) enabling/disabling the submit button, (b) determining whether Cancel needs confirmation.

### Design Principle Compliance

#### Research Insights

**Principle 4 (Moments of Commitment) — ConfirmDialog parity:**

`TaskCommit` (new commitments) wraps its button in a `ConfirmDialog` (line 406) that explains the action before signing. `TaskAction` (REFUSED resubmissions) does NOT — its button is a bare `TransactionButton` (line 287).

Fix: Add `ConfirmDialog` to `TaskAction` in `src/components/tx/task-action.tsx`. This is a one-file change:

```tsx
// In task-action.tsx, wrap the TransactionButton:
<ConfirmDialog
  title="Resubmit Your Work"
  description="This will submit your updated evidence for review."
  confirmText="Sign & Submit"
  onConfirm={handleSubmit}
>
  <Button>Submit Updated Evidence</Button>
</ConfirmDialog>
```

**Principle 1 (Invisible Infrastructure):** After removing the redundant XP Reward card, verify the remaining stat grid doesn't expose policy IDs. The `AndamioDashboardStat` for XP should show the token count and name, not the policy ID.

---

## System-Wide Impact

- **Interaction graph:** Changes are view-layer only. No transaction logic, API calls, or state mutations change.
- **Error propagation:** Evidence validation unification may surface previously-hidden empty submissions that would have failed on-chain. This is a correctness improvement.
- **State lifecycle risks:** Moving the editor inside the card means the editor's `evidence` state lives in the same render tree as commitment status. If status changes, the REFUSED branch already handles this correctly — the new-commitment branch should follow the same pattern. Use `EditorContext.Provider` or `useRef` to prevent content loss.
- **API surface parity:** No API changes. The `ContentEditor` `minHeight` prop is already parameterized.

### Research Insights — Cross-Layer Concerns

**From TX crash recovery solution (`docs/solutions/runtime-errors/tx-crash-recovery-localstorage-persistence.md`):** The TX watcher store persists in-flight transactions to localStorage. Moving the editor inside the commitment card doesn't affect this — the editor state is separate from TX state. But ensure the Cancel button doesn't clear TX state if a transaction is already in-flight.

**From server prefetch solution (`docs/solutions/performance-issues/server-prefetch-hydration-expansion-dedup-sanitization.md`):** The task detail page (`tasks/[taskhash]/page.tsx`) already has server-side prefetching. None of the proposed changes affect the server component or data fetching layer.

---

## Acceptance Criteria

### Functional Requirements
- [ ] XP Reward card (lines 289-314) is removed; reward info shows only in stats grid
- [ ] Task hash is hidden behind a collapsed "Technical Details" `<details>` element
- [ ] Long task descriptions (>200px rendered height) collapse with gradient fade and "Show full description" toggle
- [ ] Evidence editor + TaskCommit card render inside the commitment card when `isEditingEvidence` is true
- [ ] Clicking "Commit to This Task" scrolls the commitment card into view (using `flushSync`)
- [ ] Evidence editor uses `minHeight="150px"` in both new-commitment and REFUSED flows
- [ ] Cancel button shows confirmation dialog when evidence has content (`hasValidEvidence`)
- [ ] Expired tasks show "This task has expired" instead of the commit button
- [ ] `taskStatus` is passed to `TaskCommit` component
- [ ] `TaskAction` (REFUSED flow) has a `ConfirmDialog` matching `TaskCommit`
- [ ] Evidence validation is unified on `hasValidEvidence` check across all flows

### Non-Functional Requirements
- [ ] Page renders without horizontal overflow at 320px, 375px, and 640px+ viewports
- [ ] No layout shift when toggling description collapse or editor visibility
- [ ] All interactive elements maintain 44px minimum touch targets
- [ ] TipTap editor content is preserved when `isEditingEvidence` toggles (no remount content loss)
- [ ] Height measurement uses `useLayoutEffect` (no flash of uncollapsed content)

### Quality Gates
- [ ] Stats grid padding uses progressive `p-3 sm:p-4` pattern
- [ ] No raw hashes, policy IDs, or technical identifiers visible in primary UI
- [ ] Design principles 1, 4, and 5 are satisfied
- [ ] Evidence validation is identical between new-commitment and REFUSED flows

## Success Metrics

- A user can view task info, connect wallet, write evidence, and submit in **2 or fewer scroll actions** on desktop
- The commitment card (primary action area) is visible **above the fold** for authenticated users on 1080p displays
- Mobile users can complete the full commitment flow without scrolling past the commitment card boundary

## Dependencies & Risks

- **ContentDisplay height measurement:** The collapsible description (Change 3) requires measuring rendered height of `ContentDisplay`. Use `useLayoutEffect` for synchronous measurement. If this component renders asynchronously or uses images, add a `ResizeObserver` fallback.
- **Editor state preservation:** Moving the editor inside the commitment card changes its position in the React tree. Use `EditorContext.Provider` to share the editor instance (preferred) or `useRef` to preserve content across remounts (simpler).
- **REFUSED flow parity:** The REFUSED flow already has an inline editor with `minHeight="200px"` and stricter validation. After this refactor, both flows should use identical editor configuration (`minHeight="150px"`, `hasValidEvidence` check).
- **`flushSync` performance:** `flushSync` forces synchronous rendering, which blocks the main thread. For a single state update (`setIsEditingEvidence`), this is negligible. Do not use `flushSync` in hot paths or loops.

## Implementation Sequence

1. **Remove redundant XP Reward card** — simplest change, immediate scroll reduction
2. **Collapse task hash** — simple `<details>` element swap
3. **Move evidence editor inside commitment card** — structural change, test editor remount behavior with `EditorContext.Provider`
4. **Add `flushSync` + `scrollIntoView` on editor toggle** — must come after structural change
5. **Reduce editor minHeight to 150px** — prop change in two locations (new-commitment + REFUSED)
6. **Add collapsible task description** — requires `useLayoutEffect` height measurement, most complex UI change
7. **Fix edge cases:**
   - Expiration check (client-side guard)
   - Cancel confirmation dialog (with `hasValidEvidence` guard)
   - Evidence validation unification (extract shared `hasValidEvidence`)
   - `TaskAction` ConfirmDialog parity
   - `taskStatus` passthrough to `TaskCommit`
8. **Compact mobile stats** — progressive padding `p-3 sm:p-4`

## Key Files

| File | Role | Changes |
|------|------|---------|
| `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx` | Main component (853 lines) | All 6 changes + edge cases |
| `src/components/editor/components/ContentEditor/index.tsx` | Editor minHeight default (line 164) | No change needed — pass `minHeight` as prop |
| `src/components/tx/task-commit.tsx` | TaskCommit TX card | Receives `taskStatus` prop (already supported) |
| `src/components/tx/task-action.tsx` | TaskAction TX card | Add `ConfirmDialog` wrapper |
| `src/app/(app)/tasks/[taskhash]/page.tsx` | Server component | No changes needed |

## Sources & References

### Internal
- Design system philosophy: `.skills/design-system/philosophy.md` (Principles 1, 4, 5)
- Design system spacing: `.skills/design-system/spacing.md`
- Responsive design solution: `docs/solutions/ui-bugs/full-responsive-design-pass-mobile-tablet-2026-03-28.md`
- Onboarding UX solution: `docs/solutions/ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md`
- TX crash recovery: `docs/solutions/runtime-errors/tx-crash-recovery-localstorage-persistence.md`
- Server prefetch: `docs/solutions/performance-issues/server-prefetch-hydration-expansion-dedup-sanitization.md`

### External (from Context7)
- TipTap React performance — `useEditorState` and `EditorContext.Provider`: https://github.com/ueberdosis/tiptap-docs/blob/main/src/content/guides/performance.mdx
- React `useLayoutEffect` for DOM measurement: https://react.dev/reference/react/useLayoutEffect
- React `flushSync` for synchronous DOM updates: https://react.dev/reference/react-dom/flushSync
- React `scrollIntoView` with refs: https://react.dev/reference/react/useRef
