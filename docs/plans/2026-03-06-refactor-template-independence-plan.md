---
title: Template Independence from App-v2
type: refactor
status: completed
date: 2026-03-06
origin: docs/brainstorms/2026-03-06-template-independence-brainstorm.md
---

# Template Independence from App-v2

Make the template fully standalone by removing all structural ties to andamio-app-v2.

## Acceptance Criteria

- [x] `git remote -v` shows only `origin` (no `upstream`)
- [x] `.claude/skills/` contains only 6 directories (no `_advanced/`)
- [x] CLAUDE.md has no cross-repo references
- [x] No files reference "sync with app" or "upstream"

## Tasks

### 1. Remove git upstream remote

```bash
git remote remove upstream
```

### 2. Delete advanced skills directory

```bash
rm -rf .claude/skills/_advanced/
```

### 3. Update CLAUDE.md

Remove these sections:
- "Notion Integration (Soft Launch)" (lines 127-146)
- "Cross-Repo: Onboarding Guide Pipeline" (lines 148-160)
- "Skills Reference" table (lines 162-176)

Replace Skills Reference with simplified version listing only 6 core skills.

### 4. Update SKILLS-AUDIT.md

Remove "Advanced Skills (Archived)" section — only show 6 core skills.

### 5. Clean up ship skill

The `/ship` skill references "sync with app" patterns. Remove any sync-related content.

### 6. Delete notes referencing app-v2

```bash
rm .claude/notes/2026-01-19-assignment-commitment-api-fixes.md
```

(Or review and keep if standalone-relevant)

## Verification

```bash
# Should show only origin
git remote -v

# Should show 6 directories + 1 file
ls .claude/skills/

# Should find no matches
grep -r "upstream\|app-v2\|sync.*template" .claude/
```

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-06-template-independence-brainstorm.md](../brainstorms/2026-03-06-template-independence-brainstorm.md)
