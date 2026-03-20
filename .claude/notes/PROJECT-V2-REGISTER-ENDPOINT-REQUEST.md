# Request: Project V2 Register Endpoint

**Date**: January 14, 2026
**From**: T3 App Template
**To**: Andamio DB API Team

---

## Summary

We need a **Register** endpoint for Project V2 to handle the case where:
- A project already exists **on-chain** (visible via Andamioscan)
- The owner wants to **add it to the database** with a title to manage it in Studio

## Current Situation

The existing V2 endpoints don't cover this use case:

| Endpoint | Purpose | Issue |
|----------|---------|-------|
| `/project-v2/admin/project/create` | Create new project | Requires `pending_tx_hash` - designed for minting flow |
| `/project-v2/admin/project/sync` | Sync from chain | Only syncs on-chain data, doesn't accept `title` |
| `/project-v2/admin/project/update` | Update project | Returns 404 if project not in DB yet |

**The gap**: No way to register an existing on-chain project into the database with a custom title.

## Reference: How Courses Handle This

The Course system has `/course/owner/course/create`:

```json
{
  "course_code": "string (required)",
  "title": "string (required)",
  "description": "string",
  "image_url": "string"
}
```

This creates a course record in DRAFT status, allowing the owner to set metadata before or after the on-chain artifact exists.

## Requested Endpoint

### `POST /project-v2/admin/project/register`

**Purpose**: Register an existing on-chain project into the database

**Request Body**:
```json
{
  "project_id": "string (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "image_url": "string (optional)"
}
```

**Behavior**:
1. Verify the authenticated user is the project admin (via Andamioscan)
2. Check project doesn't already exist in DB (409 if exists)
3. Create DB record with provided metadata
4. Set status to ON_CHAIN (since it already exists on-chain)
5. Return the created `ProjectV2Output`

**Responses**:
- `201`: Project registered successfully
- `400`: Invalid request
- `401`: Unauthorized
- `403`: User is not the project admin
- `404`: Project not found on-chain
- `409`: Project already registered

## UI Flow

1. User visits `/studio/project`
2. Page shows on-chain projects from Andamioscan
3. Projects not in DB show "Register" button
4. User clicks Register, enters title
5. Frontend calls `/project-v2/admin/project/register`
6. Project now appears with title and is manageable in Studio

## Alternative Approaches Considered

1. **Modify `/project-v2/admin/project/sync` to accept title** - Could work, but changes the semantics of "sync"
2. **Make `pending_tx_hash` optional in `/create`** - Confusing since it's designed for minting flow
3. **Two-step: sync then update** - Current workaround, but update fails if sync doesn't create DB record

## Priority

**High** - This is blocking the basic Project Studio workflow. Users can mint projects on-chain but can't manage them in the T3 app without this endpoint.

---

*Please reach out if you need clarification or want to discuss alternative approaches.*
