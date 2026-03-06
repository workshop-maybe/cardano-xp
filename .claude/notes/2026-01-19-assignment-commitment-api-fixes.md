# Assignment Commitment API Fixes

**Date:** January 19, 2026

## Summary

Fixed API field naming issues in `src/components/learner/assignment-commitment.tsx` causing 401/400 errors when fetching/creating assignment commitments.

## Issues Found

### 1. Wrong Endpoint Namespace
- **Before:** `/api/v2/course/shared/assignment-commitment/get`
- **After:** `/api/v2/course/student/assignment-commitment/get`
- **Reason:** `shared` endpoints require teacher permissions; `student` endpoints infer user from JWT

### 2. Wrong Field Name
- **Before:** `policy_id` in request bodies
- **After:** `course_id` in request bodies
- **Error:** `400 Bad Request - "course_id and module_code are required"`

## Files Changed

**`src/components/learner/assignment-commitment.tsx`**
- Line 196: `policy_id` → `course_id` (get)
- Line 295: `policy_id` → `course_id` (update-evidence)
- Line 333: `policy_id` → `course_id` (delete)
- Line 539: `policy_id` → `course_id` (create - sync flow)
- Line 560: `policy_id` → `course_id` (update-evidence - sync flow)

Also changed endpoint from `shared` to `student` namespace (line 191).

## Known Issue: Sync Problem

On-chain commitment exists but DB record missing because:
1. TX succeeded (on-chain) ✓
2. Side effect failed (DB create returned 400 due to `policy_id` issue) ✗

The component has sync flow code but it's disabled:
```typescript
// TODO: Re-enable when V2 student state endpoint is available
const hasOnChainCommitment = false;
```

## Endpoint Status

### Successful (200)
| Method | Endpoint |
|--------|----------|
| GET | `/api/v2/course/user/slts/list/{course_id}/{module_code}` |
| GET | `/api/v2/course/user/assignment/get/{course_id}/{module_code}` |
| GET | `/api/v2/courses/{course_id}/details` |
| GET | `/api/v2/course/user/courses/list` |
| GET | `/api/v2/course/user/course/get/{course_id}` |
| GET | `/api/v2/course/user/modules/list/{course_id}` |
| GET | `/api/v2/course/user/lessons/list/{course_id}/{module_code}` |
| POST | `/api/v2/course/student/courses/list` |
| POST | `/api/v2/course/teacher/courses/list` |
| POST | `/api/v2/course/teacher/assignment-commitments/list` |
| POST | `/api/v2/project/contributor/projects/list` |
| POST | `/api/v2/project/manager/projects/list` |
| POST | `/api/v2/tx/course/student/assignment/commit` |

### Failed
| Status | Endpoint | Error |
|--------|----------|-------|
| 404 | `GET /api/v2/course/user/course-module/get/{id}/{code}` | Endpoint doesn't exist on gateway |
| 404 | `POST /api/v2/user/unconfirmed-tx` | Endpoint doesn't exist on gateway |
| 404 | `POST /api/v2/course/student/assignment-commitment/get` | Expected - no DB record (sync issue) |

## Next Steps

1. ~~Test new assignment submission with fixed code~~
2. ~~Consider re-enabling on-chain state detection for sync flow~~ ✅ Fixed Jan 27, 2026
3. Investigate missing endpoints (`course-module/get`, `unconfirmed-tx`)

---

## Update: January 27, 2026 - On-Chain Sync Flow Enabled

**Problem**: Student "james" had an on-chain commitment but 404 from `/assignment-commitment/get` because the DB record was never created (original side effect failed due to `policy_id` bug).

**Root Cause**: The sync flow UI was disabled because `hasOnChainCommitment` was hardcoded to `false`.

**Fix**: Enabled on-chain state detection using existing `getCourseStudent()` function:

```typescript
// Before (disabled)
const hasOnChainCommitment = false;
const hasCompletedOnChain = false;
const refetchOnChain = async () => { /* No-op */ };

// After (enabled)
const [onChainStudent, setOnChainStudent] = useState<AndamioscanStudent | null>(null);
const refetchOnChain = useCallback(async () => {
  const studentState = await getCourseStudent(courseId, user.accessTokenAlias);
  setOnChainStudent(studentState);
}, [courseId, user?.accessTokenAlias]);

const hasOnChainCommitment = onChainStudent?.current === sltHash;
const hasCompletedOnChain = onChainStudent?.completed.includes(sltHash);
```

**Changes**:
- `src/components/learner/assignment-commitment.tsx`:
  - Import `getCourseStudent` and `AndamioscanStudent` from `~/lib/andamioscan-events`
  - Add `onChainStudent` state and `onChainLoading` state
  - Implement `refetchOnChain` callback using `getCourseStudent()`
  - Compute `hasOnChainCommitment` by comparing `onChainStudent.current` with `sltHash`
  - Compute `hasCompletedOnChain` by checking if `sltHash` is in `completed` array
  - Display on-chain evidence hash in sync flow UI for verification

**Result**: Users with orphaned on-chain commitments now see the "Sync Required" UI and can re-create their DB record.

---

## Update: January 27, 2026 - V2 Merged API Integration

**API Update**: Gateway team deployed merged commitment endpoints that use on-chain data as source of truth.

### Breaking Change
- Removed: `POST /api/v2/course/shared/commitment/get` (was DB-only)
- Use instead: `POST /api/v2/course/student/assignment-commitment/get` (merged)

### New Response Shape

The commitment endpoints now return a `source` field:

| Value | Meaning |
|-------|---------|
| `"merged"` | Both on-chain AND DB data present |
| `"chain_only"` | On-chain commitment exists, no DB content yet |
| `"db_only"` | DB record exists but not confirmed on-chain (pending) |

**Response structure**:
```typescript
interface CommitmentApiResponse {
  data?: {
    course_id?: string;
    module_code?: string;
    slt_hash?: string;
    on_chain_status?: string;
    on_chain_content?: string;  // Evidence hash from chain
    content?: {
      commitment_status?: string;
      evidence?: Record<string, unknown>;  // Rich evidence from DB
      assignment_evidence_hash?: string;
    };
    source?: "merged" | "chain_only" | "db_only";
  };
  warning?: string;
}
```

### Frontend Changes

**Files updated**:
- `src/components/learner/assignment-commitment.tsx`:
  - Updated `CommitmentApiResponse` interface to match V2 merged response
  - Updated `Commitment` internal type to include `source` and on-chain fields
  - Changed sync flow condition from `hasOnChainCommitment && !commitment` to `commitment?.source === "chain_only"`
  - Removed unused `hasOnChainCommitment` variable (now handled by API)
  - Display `commitment.onChainContent` instead of `onChainStudent.currentContent`

- `src/app/(app)/studio/course/[coursenft]/teacher/page.tsx`:
  - Updated endpoint from `/shared/assignment-commitment/get` to `/student/assignment-commitment/get`
  - Updated request body field names to match V2 API

**Simplified logic**:
- Before: Frontend fetched on-chain state separately, then checked `hasOnChainCommitment && !commitment` to show sync UI
- After: API returns `source: "chain_only"` when on-chain exists but no DB, frontend just checks `commitment?.source === "chain_only"`

### Result

Users with on-chain commitments but missing DB records now:
1. See "Evidence Sync Required" banner (secondary color)
2. See on-chain evidence hash for verification
3. Can enter evidence and sync to database
4. After sync, API returns `source: "merged"` and normal UI appears

---

## Update: January 27, 2026 - Breaking Change: slt_hash Required

**API Breaking Change**: The commitment endpoint now requires `slt_hash` instead of `module_code`.

### Why?
The previous implementation compared `module_code` (human-readable like "101") with on-chain `slts_hash` (cryptographic hash). These are completely different values and would never match.

### Old Request (no longer works)
```json
{
  "course_id": "...",
  "module_code": "101"
}
```

### New Request (required)
```json
{
  "course_id": "...",
  "slt_hash": "ede8491c9295506bcd7a6462e4e5b4d681cf4e13bce5fdd0f6b2fd95621971ee",
  "course_module_code": "101"
}
```

### Frontend Changes

**`src/components/learner/assignment-commitment.tsx`**:
- Changed request body: `module_code` → `slt_hash` (required), added `course_module_code` (optional)
- Added guard: skip API call if `sltHash` prop is null
- Added `sltHash` to useCallback dependencies

**`src/app/(app)/studio/course/[coursenft]/teacher/page.tsx`**:
- Changed request body: `module_code` → `slt_hash`, `access_token_alias` removed
- Uses `commitment.sltHash` from the TeacherAssignmentCommitment type

### Note
The `sltHash` is already available:
- In `AssignmentCommitment` component: passed as prop from parent (computed from SLTs or fetched from module)
- In teacher page: available on `TeacherAssignmentCommitment.sltHash` from the list endpoint
