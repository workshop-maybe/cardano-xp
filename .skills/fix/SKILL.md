---
name: fix
description: Open a new local branch and fix a GitHub issue
---

# Skill: Fix

<purpose>
Given a GitHub issue number, fetch the issue details, create a local branch, investigate the codebase, plan a fix, and implement it. Hands off to `/review-pr` when the fix is ready to merge.
</purpose>

<scope>
- Fetch and analyze GitHub issues
- Create appropriately named branches
- Investigate root cause by exploring the codebase
- Plan and implement fixes with user approval
- Verify the fix type-checks and builds
- Hand off to `/review-pr` for commit, PR, and review
</scope>

## Commands

| Command | Description |
|---------|-------------|
| `/fix` | Prompt for an issue number, then start the workflow |
| `/fix 42` | Start the workflow for issue #42 |

## Workflow

<phase name="input">
### Phase 1: Get the Issue

If an issue number was provided as an argument, use it. Otherwise, prompt the user.

<action>
```bash
# Fetch the issue details
gh issue view <number>
```
</action>

Display a short summary of the issue to the user: title, labels, body.

<abort-if>
- Issue doesn't exist or is closed
- Issue is assigned to a different repo (redirect the user)
</abort-if>
</phase>

<phase name="branch">
### Phase 2: Create a Branch

Create a local branch from latest `main`.

<action>
```bash
# Ensure we're on main and up to date
git checkout main
git pull

# Create branch using conventional naming
git checkout -b <type>/<short-description>
```
</action>

<branch-naming>
Infer the branch type from the issue labels and title:

| Issue signal | Branch prefix |
|--------------|---------------|
| `bug` label, "fix", "broken", "error" | `fix/` |
| `enhancement` label, "add", "new", "feature" | `feat/` |
| "refactor", "clean up", "reorganize" | `refactor/` |
| "docs", "documentation" | `docs/` |
| Unclear | Ask the user |

Use a short, kebab-case description derived from the issue title.
Example: issue "Dashboard sidebar doesn't collapse on mobile" -> `fix/dashboard-sidebar-mobile-collapse`
</branch-naming>
</phase>

<phase name="investigate">
### Phase 3: Investigate

Explore the codebase to understand the root cause. Use the Explore agent and relevant skills.

<action>
1. Identify which files, components, hooks, and routes are involved
2. Read the relevant source code
3. Check for related types in `~/types/generated/`
4. If the issue references error messages or logs, trace them through the code
5. Check recent commits for context (`git log --oneline -10`)
</action>

<delegate>
- Use the **issue-handler** skill if the issue might belong to the API or another repo
- Use the **typescript-types-expert** skill context for type-related issues
- Use the **design-system** skill context for styling or component issues
- Use the **hooks-architect** skill context for hook pattern issues
- Use the **react-query-auditor** skill context for caching or query issues
</delegate>
</phase>

<phase name="plan">
### Phase 4: Plan the Fix

Present the plan to the user before writing any code.

<ask-user>
Explain:
1. **Root cause**: What is going wrong and why
2. **Proposed fix**: What changes are needed and where
3. **Files to modify**: List of files that will be touched
4. **Risk assessment**: What could go wrong, what else this might affect

Wait for user approval before proceeding.
</ask-user>
</phase>

<phase name="implement">
### Phase 5: Implement

Write the fix, keeping changes minimal and focused.

<guidelines>
- Only change what is necessary to resolve the issue
- Don't refactor surrounding code unless it's part of the fix
- Don't add features beyond what the issue describes
- Follow existing patterns in the codebase
- Import types from `~/types/generated` — never define API types locally
- Import icons from `~/components/icons` — never from `lucide-react` directly
- Use semantic colors only — never hardcoded colors like `text-green-600`
- Use shadcn/ui components from `~/components/ui/`
- Never use `module` as a variable name — use `courseModule`
- Add or update tests if the fix is testable
</guidelines>
</phase>

<phase name="verify">
### Phase 6: Verify

Confirm the fix type-checks and builds before handing off.

<action>
```bash
# Type check
npm run typecheck

# Build check
npm run build
```
</action>

<abort-if>
- Type check fails — fix type errors before proceeding
- Build fails — fix compilation errors before proceeding
</abort-if>
</phase>

<phase name="handoff">
### Phase 7: Hand Off

Once the fix is verified, prompt the user to ship it.

<action>
Display a summary:
```
Fix Ready
═══════════════════════════════════════════
Issue:    #<number> — <title>
Branch:   <branch-name>
Files:    <count> files changed
Types:    passing
Build:    passing
```
</action>

<ask-user>
Ready to ship? Commit the changes, then run `/review-pr` to create and review the PR.
</ask-user>
</phase>

---

## Safety Guarantees

<safety>
| Risk | Mitigation |
|------|------------|
| Fixing the wrong issue | Always fetch and display the issue first |
| Overwriting local changes | Check `git status` before switching branches |
| Breaking unrelated code | Type-check and build verification before handoff |
| Scope creep | Plan phase requires explicit user approval |
| Wrong branch name | Inferred from issue, confirmed by user |
| Style violations | Implementation guidelines enforce project conventions |
</safety>

---

## Compound Engineering

After fixing a non-trivial bug, document what you learned:

```bash
/workflows:compound
```

This captures:
- The symptom (what was observed)
- Investigation steps (what you tried)
- Root cause (why it happened)
- The fix (how to solve it)
- Prevention (how to avoid it)

The documentation lands in `docs/solutions/` where it's searchable for future issues. Before starting Phase 3 (Investigate), check `docs/solutions/` — someone may have already solved this class of problem.
