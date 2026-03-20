# Template Independence from App-v2

**Date:** 2026-03-06
**Status:** Ready for planning

## What We're Building

Make the andamio-app-template a fully standalone starting point for developers. Remove all structural ties to andamio-app-v2 so the template works without assuming any other repos exist.

## Why This Approach

**Problem:** The template currently has git upstreams, cross-repo skill references, and documentation pipelines that assume the full Andamio development ecosystem. This confuses new developers who just want to build a Cardano dApp.

**Solution:** Structural separation — remove the relationship while preserving the dev team's ability to manually cherry-pick useful features from app-v2 when needed.

**Philosophy:** Amaze and delight without overwhelming. A clean slate that "just works."

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Git relationship | Remove `upstream` remote | Template should have its own clean history |
| Advanced skills (17) | Delete entirely | Cherry-pick from app-v2 as needed; less confusion |
| Cross-repo docs pipeline | Remove from CLAUDE.md | Template shouldn't assume other repos exist |
| Core skills (6) | Keep as-is | auth, transactions, design-system, fix, ship, getting-started |
| Gateway API types | Keep generating from API | Shared infrastructure, not a repo dependency |

## What Changes

### Remove
- [ ] Git `upstream` remote pointing to app-v2
- [ ] `.claude/skills/_advanced/` directory (17 skills)
- [ ] CLAUDE.md "Cross-Repo: Onboarding Guide Pipeline" section
- [ ] CLAUDE.md Notion integration section (soft launch, assumes ecosystem)
- [ ] SKILLS-AUDIT.md "Advanced Skills" section
- [ ] Any "sync with app" references in commit messages/docs

### Keep
- [x] 6 core skills: getting-started, auth, transactions, design-system, fix, ship
- [x] Gateway API integration (`npm run generate:types`)
- [x] CLAUDE.md core rules (types, naming, styling, wallet UI)
- [x] Design system components and patterns

### Update
- [ ] CLAUDE.md — streamline for standalone use
- [ ] SKILLS-AUDIT.md — only show 6 core skills
- [ ] README or docs to reflect standalone nature

## Out of Scope

- Changing the Gateway API relationship (shared infrastructure is fine)
- Removing design-system skill content (still valuable)
- Creating new skills (6 is enough for now)

## Success Criteria

1. A developer can clone the template and build without knowing app-v2 exists
2. No references to "upstream", "sync", or cross-repo workflows
3. `git remote -v` shows only `origin`
4. `.claude/skills/` contains only 6 skill directories
5. CLAUDE.md is self-contained

## Open Questions

None — decisions made during brainstorm.

---

**Next:** `/workflows:plan` to execute the separation
