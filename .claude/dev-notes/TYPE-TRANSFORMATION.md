# Type Transformation Pattern

## Overview

Andamio API returns snake_case JSON. The app transforms to camelCase TypeScript types.

This is **industry best practice** - each layer uses its native convention.

## The Pattern

```
API Response (snake_case)     Transform in Hooks      App Types (camelCase)
─────────────────────────  →  ──────────────────  →  ─────────────────────
task_hash: string             transformTask()        taskHash: string
task_evidence_hash            src/types/project.ts   taskEvidenceHash
task_commitment_status                               taskCommitmentStatus
content.title                                        title (flattened)
```

## Why This Pattern?

1. **API stays clean** - Go convention (snake_case in JSON)
2. **App stays idiomatic** - TypeScript convention (camelCase)
3. **Transform at boundary** - Hooks handle conversion
4. **Components stay simple** - Use flat, camelCase types

## Transform Functions

Location: `src/types/project.ts`

```typescript
// API type (generated, snake_case)
interface ApiTypesTask {
  task_hash: string;
  task_evidence_hash?: string;
  content?: { title?: string; description?: string };
}

// App type (manual, camelCase, flattened)
interface Task {
  taskHash: string;
  taskEvidenceHash?: string;
  title: string;
  description: string;
}

// Transform function
const transformTask = (api: ApiTypesTask): Task => ({
  taskHash: api.task_hash,
  taskEvidenceHash: api.task_evidence_hash,
  title: api.content?.title ?? '',
  description: api.content?.description ?? '',
});
```

## Available Transforms

| Function | API Type | App Type | Purpose |
|----------|----------|----------|---------|
| `transformApiTask` | `ApiTypesTask` | `Task` | DB task records |
| `transformOnChainTask` | `OrchestrationProjectTaskOnChain` | `Task` | On-chain tasks from indexer |
| `transformProjectDetail` | `OrchestrationMergedProjectDetail` | `Project` | Full project with relations |
| `transformProjectListItem` | `OrchestrationMergedProjectListItem` | `Project` | Project list items |
| `transformApiProject` | `ApiTypesProject` | `Project` | DB project records |
| `transformApiCommitment` | `ApiTypesTaskCommitment` | `TaskCommitment` | Task commitments |

## Writing API Params

Request params TO the API must use snake_case:

```typescript
// ✅ Correct - snake_case for API params
fetch('/api/gateway/api/v2/project/user/task/get', {
  method: 'POST',
  body: JSON.stringify({ task_hash: taskHash })
});

// ❌ Wrong - camelCase rejected by API
fetch('/api/gateway/api/v2/project/user/task/get', {
  method: 'POST',
  body: JSON.stringify({ taskHash: taskHash })
});
```

## External vs App Types

Some types are **external** (from Andamioscan indexer) and use snake_case:

```typescript
// External type - use snake_case
interface AndamioscanTask {
  task_id: string;           // NOT taskHash
  lovelace_amount: number;   // NOT lovelaceAmount
  expiration_posix: number;  // NOT expirationPosix
}

// App type - use camelCase
interface Task {
  taskHash: string;
  lovelaceAmount: string;
  expirationTime?: string;
}
```

**Rule:** Check the type source before accessing fields:
- `~/types/project.ts` types → camelCase
- `~/lib/andamioscan-events.ts` types → snake_case
- `~/types/generated/gateway.ts` raw types → snake_case

## File Locations

| Purpose | Location |
|---------|----------|
| Generated API types | `src/types/generated/gateway.ts` |
| App types & transforms | `src/types/project.ts` |
| Type re-exports | `src/types/generated/index.ts` |
| External Andamioscan types | `src/lib/andamioscan-events.ts` |

## Regenerating Types

When API changes:

```bash
npx swagger-typescript-api \
  -p ~/projects/01-projects/andamio-api/docs/swagger.json \
  -o src/types/generated \
  -n gateway.ts \
  --no-client
```

Or use the npm script:

```bash
npm run generate:types
```

Then update transform functions in `src/types/project.ts` if new fields were added.

## API Taxonomy Conventions

From the API taxonomy, field naming follows these rules:

| Suffix | Meaning | Example |
|--------|---------|---------|
| `_hash` | Content-addressed identifier | `task_hash`, `slt_hash` |
| `_id` | Cardano policy ID only | `project_id`, `course_id` |
| Prefixed status | Domain-specific status | `task_commitment_status` |
| `is_` prefix | Boolean flags | `is_public`, `is_active` |

## Deprecation Notes

The `getString()` helper in `src/lib/type-helpers.ts` was created to handle `NullableString` API fields that generated as `object` type. With proper app types, this helper is largely **no longer needed** but is kept for defensive coding in edge cases.

---

*Last updated: Phase 3.8 - Type taxonomy compliance*
