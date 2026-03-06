# Commitment Status Audit

**Date:** 2026-03-26
**Scope:** Assignment commitments (course/student) and Task commitments (project/contributor) across DB, API, and frontend layers in cardano-xp.

---

## Assignment Commitments (Course Side)

### Full Lifecycle

```
(no record)
  → AWAITING_SUBMISSION    (student enrolled, no submission)
  → PENDING_TX_COMMIT      (enrollment TX in flight)
  → SUBMITTED              (evidence submitted, awaiting teacher)
  → PENDING_TX_ASSESS      (assessment TX in flight)
  → ACCEPTED / REFUSED     (teacher decision)
  → PENDING_TX_CLAIM       (credential claim TX in flight)
  → CREDENTIAL_CLAIMED     (on-chain credential minted)

Branch: → PENDING_TX_LEAVE → LEFT (student dropped)
```

### Status at Each Layer

| DB Status | API Normalizes To | on_chain_status | Frontend Normalizes To | User Sees (Label) | Badge Variant | UI Behavior |
|-----------|------------------|-----------------|----------------------|-------------------|---------------|-------------|
| AWAITING_SUBMISSION | AWAITING_SUBMISSION | — | IN_PROGRESS | "In Progress" | secondary | Editor shown |
| COMMITTED (legacy) | SUBMITTED | — | PENDING_APPROVAL | "Pending Review" | secondary | Read-only, awaiting teacher |
| SUBMITTED | SUBMITTED | — | PENDING_APPROVAL | "Pending Review" | secondary | Read-only, awaiting teacher |
| ACCEPTED | ACCEPTED | "completed" | ASSIGNMENT_ACCEPTED | "Completed" | default (green) | Credential claim form |
| REFUSED | REFUSED | — | ASSIGNMENT_DENIED | "Needs Revision" | default | Revision editor shown |
| CREDENTIAL_CLAIMED | CREDENTIAL_CLAIMED | "completed" | CREDENTIAL_CLAIMED | "Credential Earned" | default | Read-only banner |
| LEFT | LEFT | — | NOT_STARTED | "Not Started" | outline | — |
| PENDING_TX_COMMIT | PENDING_TX_COMMIT | — | IN_PROGRESS | "Joining..." | secondary | Spinner |
| PENDING_TX_ASSESS | PENDING_TX_ASSESS | — | IN_PROGRESS | "Under Review" | secondary | Spinner |
| PENDING_TX_CLAIM | PENDING_TX_CLAIM | — | IN_PROGRESS | "In Progress" | secondary | Spinner |
| PENDING_TX_LEAVE | PENDING_TX_LEAVE | — | IN_PROGRESS | "In Progress" | secondary | Spinner |
| — (chain only) | — | "current" | PENDING_APPROVAL | "Pending Review" | secondary | Fallback |
| — (chain only) | — | "completed" | ASSIGNMENT_ACCEPTED | "Completed" | default | Credential claim |

### Frontend Normalization Chain

1. **Hook layer** (`use-assignment-commitment.ts:124`): `commitmentStatus ?? on_chain_status ?? "PENDING_APPROVAL"`
2. **STATUS_MAP** (`use-assignment-commitment.ts:125`): SUBMITTED→PENDING_APPROVAL, ACCEPTED→ASSIGNMENT_ACCEPTED, REFUSED→ASSIGNMENT_REFUSED
3. **Canonical type** (`assignment-status.ts`): `normalizeAssignmentStatus()` with additional aliases
4. **Display** (`assignment-status-badge.tsx`): STATUS_META lookup for label, icon, tooltip, variant

### Key Files

| Purpose | File |
|---------|------|
| Hook + STATUS_MAP | `src/hooks/api/course/use-assignment-commitment.ts` |
| List hook (different normalization) | `src/hooks/api/course/use-student-assignment-commitments.ts` |
| Canonical type + normalizer | `src/lib/assignment-status.ts` |
| Badge component | `src/components/learner/assignment-status-badge.tsx` |
| Main UI component | `src/components/learner/assignment-commitment.tsx` |
| Teacher view | `src/components/teacher/pending-reviews-list.tsx` |

---

## Task Commitments (Project Side)

### Full Lifecycle

```
(no record)
  → DRAFT                  (DB record created, not yet on-chain)
  → PENDING_TX_COMMIT      (join + commit TX in flight)
  → COMMITTED / SUBMITTED  (on-chain, awaiting manager)
  → PENDING_TX_ASSESS      (assessment TX in flight)
  → ACCEPTED / REFUSED     (manager decision)
  → PENDING_TX_CLAIM       (credential claim TX in flight)
  → REWARDED               (credential claimed)

Branch: → PENDING_TX_LEAVE → ABANDONED
```

### Status at Each Layer

| DB Status | API Normalizes To | on_chain_status | Frontend Normalizes To | User Sees (Label) | Badge Variant | UI Behavior |
|-----------|------------------|-----------------|----------------------|-------------------|---------------|-------------|
| DRAFT | DRAFT | — | DRAFT | "Draft" | secondary | — |
| COMMITTED | SUBMITTED | — | SUBMITTED | "Submitted" | secondary | Evidence viewer + edit |
| SUBMITTED | SUBMITTED | — | SUBMITTED | "Submitted" | secondary | Evidence viewer + edit |
| ACCEPTED | ACCEPTED | "committed" | ACCEPTED | "Accepted" | default (green) | Two-path CTA: browse tasks / leave & claim |
| REFUSED | REFUSED | "refused" | REFUSED | "Needs Revision" | destructive (red) | Alert + revision editor |
| REWARDED | REWARDED | — | REWARDED | "Rewards Claimed" | default | Read-only |
| ABANDONED | ABANDONED | — | ABANDONED | "Abandoned" | secondary | — |
| PENDING_TX_COMMIT | PENDING_TX_COMMIT | — | PENDING_TX_COMMIT | "Joining..." | outline | TX hash, refresh button |
| PENDING_TX_SUBMIT | PENDING_TX_COMMIT | — | PENDING_TX_COMMIT | "Joining..." | outline | TX hash, refresh button |
| PENDING_TX_ASSESS | PENDING_TX_ASSESS | — | PENDING_TX_ASSESS | "Under Review" | outline | TX hash, refresh button |
| PENDING_TX_CLAIM | PENDING_TX_CLAIM | — | PENDING_TX_CLAIM | (no label) | outline | TX hash, refresh button |
| — (chain only) | — | "committed" | ACCEPTED | "Accepted" | default | Leave & claim CTA |
| — (chain only) | — | "submitted" | SUBMITTED | "Submitted" | secondary | Evidence viewer + edit |
| — (chain only) | — | "refused" | REFUSED | "Needs Revision" | destructive | Alert + revision editor |

### Frontend Normalization Chain

1. **Hook layer** (`use-project-contributor.ts:278`): `content?.commitment_status ?? api.on_chain_status`
2. **PROJECT_STATUS_MAP** (`use-project-contributor.ts:172`): COMMITTED→ACCEPTED, APPROVED→ACCEPTED, REJECTED→REFUSED, DENIED→REFUSED
3. **Display** (`format-status.ts`): `formatCommitmentStatus()` for labels, `getCommitmentStatusVariant()` for badge color
4. **UI branching** (`contributor/page.tsx`): status string comparisons

### Key Files

| Purpose | File |
|---------|------|
| Hook + PROJECT_STATUS_MAP | `src/hooks/api/project/use-project-contributor.ts` |
| Manager hook | `src/hooks/api/project/use-project-manager.ts` |
| Display labels + variants | `src/lib/format-status.ts` |
| Contributor dashboard | `src/app/(app)/contributor/page.tsx` |
| Task detail page | `src/app/(app)/tasks/[taskhash]/page.tsx` |
| Admin commitments | `src/app/(admin)/admin/project/commitments/page.tsx` |
| Resolved statuses constant | `src/config/ui-constants.ts` (RESOLVED_COMMITMENT_STATUSES) |

---

## Manager/Teacher View Statuses

### Manager Assessment Panel (Task Commitments)

| Status | Manager Sees | Hint Text | Assessable? |
|--------|-------------|-----------|-------------|
| AWAITING_SUBMISSION | "Awaiting Submission" | "Contributor committed. Waiting for evidence." | No |
| SUBMITTED | "Submitted" | "Evidence submitted. Ready for review." | **Yes** |
| PENDING_TX_* | "Pending TX" | "A transaction is in progress." | No |
| ACCEPTED | "Accepted" | "Work accepted. Reward available." | No |
| REFUSED | "Needs Revision" | "Work refused. Contributor can resubmit." | No |
| DENIED | "Denied" | "Permanently rejected. Deposit returned." | No |
| (unregistered/chain-only) | varies | — | **Yes** |

### Teacher Review (Assignment Commitments)

| Status | Teacher Sees | Assessable? |
|--------|-------------|-------------|
| PENDING_APPROVAL | "Pending Review" | **Yes** |
| ACCEPTED | "Accepted" | No |
| REFUSED | "Refused" | No |

---

## Cross-Cutting: Self-Healing Transitions (API Layer)

The API reconciles DB status against on-chain state on every read. These are **forward-only** transitions:

### Assignment Commitments

| DB Says | Chain Says | Heals To |
|---------|-----------|----------|
| AWAITING_SUBMISSION | "current" + has content | SUBMITTED |
| AWAITING_SUBMISSION | "completed" | ACCEPTED |
| COMMITTED (legacy) | "current" + has content | SUBMITTED |
| COMMITTED (legacy) | "completed" | ACCEPTED |
| SUBMITTED | "completed" | ACCEPTED |

### Task Commitments

| DB Says | Chain Says | Heals To |
|---------|-----------|----------|
| COMMITTED | in TasksAccepted | ACCEPTED |
| SUBMITTED | in TasksAccepted | ACCEPTED |
| SUBMITTED | NOT in TasksSubmitted | ACCEPTED |

### TX Abandonment Reversions

When a PENDING_TX state expires without on-chain confirmation:

| Pending State | Reverts To |
|---------------|-----------|
| PENDING_TX_SUBMIT | COMMITTED |
| PENDING_TX_ASSESS | SUBMITTED |
| PENDING_TX_CLAIM | ACCEPTED |
| PENDING_TX_COMMIT | (no revert — record didn't exist before) |

---

## Issues and Questions

### 1. COMMITTED maps to different things depending on context

**Problem:** The string "COMMITTED" has three different meanings:
- **DB status** (task): An intermediate state after joining, before evidence. API normalizes to SUBMITTED.
- **DB status** (assignment): Legacy value. API normalizes to SUBMITTED.
- **on_chain_status** (task): Task is in TasksAccepted list = ACCEPTED.

The frontend `PROJECT_STATUS_MAP` maps `COMMITTED → ACCEPTED` because it was added for the on_chain_status fallback. But if a DB `COMMITTED` value ever reaches the frontend without API normalization, it would incorrectly display as ACCEPTED instead of SUBMITTED.

**Risk:** Low — the API normalizes COMMITTED→SUBMITTED before sending `content.commitment_status`. The fallback only fires when `content` is null (chain-only). But the dual meaning is confusing for anyone reading the code.

**Question:** Should the frontend map be renamed or documented more explicitly to indicate it handles on_chain_status values, not DB values?

### 2. Assignment and Task sides use different normalization patterns

**Problem:** The two commitment types have completely different frontend normalization:
- **Assignments:** Three layers — hook STATUS_MAP → `normalizeAssignmentStatus()` → `AssignmentStatusBadge` STATUS_META
- **Tasks:** Two layers — hook PROJECT_STATUS_MAP → `formatCommitmentStatus()` labels

The assignment side has a canonical `AssignmentStatus` type union. The task side uses raw strings with no type narrowing.

**Question:** Should the task side adopt the same pattern (canonical type + dedicated badge component)?

### 3. `format-status.ts` labels mix both commitment types

**Problem:** `COMMITMENT_STATUS_LABELS` in `format-status.ts` contains labels for BOTH assignment statuses (`ASSIGNMENT_ACCEPTED`, `ASSIGNMENT_DENIED`, `PENDING_APPROVAL`) AND task statuses (`SUBMITTED`, `ACCEPTED`, `REFUSED`). These are different concepts with overlapping names:
- `ACCEPTED` = task commitment accepted (user sees "Accepted")
- `ASSIGNMENT_ACCEPTED` = assignment commitment accepted (user sees "Completed")

This works because the normalizers produce different canonical values, but it means a single function (`formatCommitmentStatus`) serves two unrelated status domains.

**Question:** Should these be split into `formatAssignmentStatus()` and `formatTaskCommitmentStatus()`?

### 4. Missing labels for some task statuses

**Problem:** These task commitment statuses have no entry in `COMMITMENT_STATUS_LABELS`:
- `DRAFT` — falls through to title-case: "Draft"
- `REWARDED` — falls through to title-case: "Rewarded"
- `ABANDONED` — falls through to title-case: "Abandoned"
- `PENDING_TX_CLAIM` — falls through to title-case: "Pending Tx Claim"
- `UNKNOWN` — falls through to title-case: "Unknown"

The title-case fallback works but produces inconsistent style ("Pending Tx Claim" vs "Joining..." for PENDING_TX_COMMIT).

**Question:** Should explicit labels be added for completeness?

### 5. `on_chain_status` naming is misleading for tasks

**Problem:** The API sets `on_chain_status: "committed"` for tasks in the **TasksAccepted** list. This is counterintuitive — "committed" suggests the contributor committed to the task, not that the task was accepted/approved. The confusion already caused one bug (chain-only commitments showing as UNKNOWN, then incorrectly mapped to SUBMITTED before being corrected to ACCEPTED).

**Question:** This is an API-level naming issue. Is there appetite to change the API's on_chain_status values for task commitments to be more explicit (e.g., "accepted" instead of "committed")?

### 6. DENIED vs REFUSED — same display, different semantics

**Problem:** Both DENIED and REFUSED display as "Needs Revision" with the same destructive badge. But according to the admin panel hints:
- **REFUSED** = "Work refused. Contributor can resubmit."
- **DENIED** = "Permanently rejected. Deposit returned."

The frontend normalizer maps DENIED→REFUSED, so a permanently denied contributor sees "Needs Revision" with a resubmit button that will never succeed.

**Question:** Should DENIED have its own display label and UI behavior (e.g., "Permanently Rejected" with no resubmit option)?

### 7. Two duplicate commitments for the same task

**Observation:** The contributor dashboard screenshot shows two cards for "First Impression: Landing Page" — both with the same XP reward and status. This likely means the API returns two records for the same task (one from each data source in the merge). The page renders both without deduplication.

**Question:** Should the contributor page deduplicate commitments by `taskHash`, keeping the one with the highest-priority status? The admin commitments page already has deduplication logic.
