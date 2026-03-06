---
name: ship
description: Version bump, docs check, commit, PR, merge, and clean up — the full shipping workflow
---

# Skill: Ship

<purpose>
Manage the complete workflow for shipping changes: bump the version, verify docs are current, commit, push, create a PR, merge it, and clean up the local branch. Every step includes safety checks to prevent data loss.
</purpose>

<scope>
- Bump development version in `VERSION` and `package.json`
- Run `/documentarian` to confirm docs are up to date
- Build and typecheck verification (`npm run typecheck`, `npm run build`)
- Commit with conventional commit message
- Push branch and create PR via `gh`
- Squash-merge the PR (repo disallows merge commits)
- Switch to main, pull latest, delete local branch
</scope>

## Commands

| Command | Description |
|---------|-------------|
| `/ship` | Full workflow (all phases) |
| `/ship version` | Bump version only |
| `/ship pr` | Push + create PR only (skip version bump) |
| `/ship merge` | Merge existing PR + clean up only |

## Workflow

<phase name="preflight">
### Phase 1: Preflight Checks

Before anything else, verify the working state is safe to proceed.

<action>
```bash
# Current branch (must NOT be main)
git branch --show-current

# Check for uncommitted changes
git status

# Verify we have changes to ship
git diff --stat
git diff --cached --stat

# Check typecheck passes
npm run typecheck
```
</action>

<abort-if>
- On `main` branch (must be on a feature/fix branch)
- Typecheck fails
- No changes to commit (nothing to ship)
</abort-if>

<ask-user>
If the branch name doesn't match a clear issue or feature, ask:
- What is this change about? (for commit message)
</ask-user>
</phase>

<phase name="compound">
### Phase 2: Compound Knowledge

Before shipping, capture what was learned during this work.

<action>
Run `/workflows:compound` to document any insights, patterns, or lessons learned from this implementation.
</action>

<compound-engineering>
**Why this matters**: Each documented solution compounds team knowledge. The first time you solve a problem takes research (30 min). Document it, and the next occurrence takes minutes (2 min).

The compound workflow captures:
- **Symptom**: What was observed
- **Root cause**: Why it happened
- **Solution**: How to fix it (with code)
- **Prevention**: How to avoid it

Documentation lands in `docs/solutions/` organized by category:
- `build-errors/` — Compilation, bundling, types
- `runtime-errors/` — Exceptions, crashes
- `integration-issues/` — API, third-party services
- `ui-bugs/` — Styling, layout, hydration
- And more...

The `learnings-researcher` agent searches this directory when planning features or debugging, surfacing relevant past solutions automatically.
</compound-engineering>

<skip-if>
- Trivial changes (typo fixes, version bumps only, CI tweaks)
- Changes already documented in a previous session
</skip-if>
</phase>

<phase name="version-bump">
### Phase 3: Version Bump

Bump the development version using the format: `v{MAJOR}.{MINOR}.{PATCH}-dev-{YYYYMMDD}-{letter}`

<version-format>
| Component | Description |
|-----------|-------------|
| `MAJOR.MINOR.PATCH` | Semantic version (stays same during dev) |
| `YYYYMMDD` | Today's date |
| `letter` | Sequential letter for same-day releases: a, b, c... |

**Auto-increment logic**:
1. Read current version from `VERSION` file
2. If date matches today, increment the letter (a -> b -> c...)
3. If date is older, reset to today's date with letter `a`
</version-format>

<action>
1. Read `VERSION` file
2. Calculate next version
3. Update `VERSION` file with new version string
4. Sync to `package.json`:
   ```bash
   # Strip leading 'v' for npm (package.json uses bare semver)
   npm version "<version-without-v>" --no-git-tag-version --allow-same-version
   ```
5. Verify both files match
</action>

<important>
- The `VERSION` file includes the `v` prefix (e.g., `v2.0.0-dev-20260131-a`)
- `package.json` uses the bare version without `v` (e.g., `2.0.0-dev-20260131-a`)
- Both must always agree. Use `npm version` with `--no-git-tag-version` to update package.json without creating a git tag.
</important>
</phase>

<phase name="docs-check">
### Phase 4: Documentation Check

Verify documentation is current with the changes being shipped.

<action>
1. Run `/documentarian` skill to review changes and update docs
2. Verify typecheck still passes:
   ```bash
   npm run typecheck
   ```
</action>

<ask-user>
After the documentarian review, ask:
- Are these doc updates acceptable, or do you want to adjust anything?
</ask-user>
</phase>

<phase name="commit">
### Phase 5: Commit

Create a well-formed conventional commit.

<commit-conventions>
This repo uses conventional commits. Infer the type from the branch name and changes:

| Prefix | When |
|--------|------|
| `fix:` | Bug fixes, renames, corrections |
| `feat:` | New endpoints, new functionality |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation-only changes |
| `chore:` | Dependencies, CI, tooling |

If the branch name contains an issue number (e.g., `fix/batch-status-endpoint-path`), reference it.
</commit-conventions>

<action>
```bash
# Stage specific files (never use git add -A)
git add <changed-files>

# Commit with conventional message
git commit -m "$(cat <<'EOF'
<type>: <description> (#<issue>)

<body explaining why, not what>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```
</action>

<important>
- Stage files explicitly by name — never `git add -A` or `git add .`
- Never commit `.env`, credentials, or secrets
- Always include `Co-Authored-By` trailer
- Use HEREDOC for commit message formatting
- **Include all local changes**: If `/ship` discovers additional uncommitted changes on the branch (e.g., new skills, doc updates, config changes), include them in the commit and PR. Don't cherry-pick only the "primary" fix — ship everything on the branch together.
</important>
</phase>

<phase name="push-and-pr">
### Phase 6: Push and Create PR

Push the branch and open a pull request.

<action>
```bash
# Push with upstream tracking
git push -u origin <branch-name>

# Create PR with squash-friendly format
gh pr create --title "<type>: <short description>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points of what changed and why>

## Files changed
<grouped list of changed files>

## Test plan
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] <domain-specific checks>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
</action>

<pr-conventions>
- **Title**: Under 70 characters, conventional commit format
- **Body**: Summary bullets, files changed, test plan checklist
- If an issue exists, include `Closes #<number>` in the body
- If there are downstream impacts, note them
</pr-conventions>
</phase>

<phase name="merge">
### Phase 7: Merge PR

Safely merge the PR using squash merge (required by this repo).

<action>
```bash
# Check for CI failures (if any checks exist)
gh pr checks <pr-number>

# Squash merge and delete remote branch
gh pr merge <pr-number> --squash --delete-branch
```
</action>

<important>
- This repo does NOT allow merge commits — always use `--squash`
- `gh pr merge --delete-branch` automatically deletes the remote branch
- If merge fails due to conflicts, abort and notify the user
</important>
</phase>

<phase name="cleanup">
### Phase 8: Switch to Main and Clean Up

Return to main branch with latest changes. Handle the case where `gh pr merge` already switched branches.

<action>
```bash
# Switch to main (may already be on main after gh pr merge)
git checkout main

# Pull latest (includes the squash-merged commit)
git pull

# Delete local branch (may already be deleted by gh pr merge)
git branch -d <branch-name> 2>/dev/null || true

# Verify clean state
git status
git log --oneline -3
```
</action>

<important>
- Use `git branch -d` (lowercase) — never `-D` (force delete)
- The `-d` flag refuses to delete unmerged branches, preventing data loss
- If branch delete fails with "not fully merged", STOP and warn the user
- `|| true` handles the case where gh already cleaned up the branch
</important>
</phase>

<phase name="summary">
### Phase 9: Summary

Display a final summary of what was shipped.

<display>
```
Ship Complete
═══════════════════════════════════════════
Version:  <new-version>
Branch:   <branch-name> → main (merged + deleted)
PR:       <pr-url>
Commit:   <commit-message-first-line>
```
</display>
</phase>

---

## Safety Guarantees

<safety>
| Risk | Mitigation |
|------|------------|
| Committing secrets | Explicit file staging, never `git add -A` |
| Force-pushing | Never used — only regular `git push` |
| Losing unmerged work | `git branch -d` (not `-D`) refuses if unmerged |
| Merging to wrong branch | PR targets `main` by default |
| Merge conflicts | `gh pr merge` fails cleanly, no data loss |
| Wrong merge strategy | Always `--squash` (merge commits disallowed) |
| Stale local main | `git pull` after merge |
</safety>

---

## Quick Reference

<commands>
```bash
# Check current version
cat VERSION

# Stamp version from git tags (CI-style)
bash scripts/stamp-version.sh

# Dry-run version stamp
bash scripts/stamp-version.sh --dry

# Typecheck
npm run typecheck

# Full build
npm run build

# Lint
npm run lint

# View PR status
gh pr status

# View specific PR
gh pr view <number>
```
</commands>

---

## Troubleshooting

<troubleshooting>
| Issue | Solution |
|-------|----------|
| `gh pr merge` fails with merge commit error | Use `--squash` flag (this repo requires it) |
| Branch already deleted | `git branch -d` will say "not found" — safe to ignore |
| PR has conflicts | Pull main into branch, resolve conflicts, push, then merge |
| Typecheck fails | Fix type errors before committing — never ship broken code |
| Build fails | Fix the build before committing — never ship broken code |
| VERSION and package.json out of sync | Update VERSION, then run `npm version` with `--no-git-tag-version` |
| `gh` not authenticated | Run `gh auth login` |
</troubleshooting>
