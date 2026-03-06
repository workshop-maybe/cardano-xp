---
title: "Cardano XP — Project Inception"
category: project-setup
tags: [cardano, tokenomics, andamio-template, xp-token, agent-skills]
date_solved: 2026-03-15
related_issues: []
---

## What happened

Set up the cardano-xp project from scratch. All non-code foundations were defined before writing any application code.

## Five non-code outputs defined

1. **Build journal** (`journal/`) — Chronological entries documenting each session: what was done, decisions made, skills used. Evidence, not prose.
2. **Learning skills** (`.claude/skills/`) — Ship with the repo so anyone who clones it can explore the codebase interactively.
3. **XP tokenomics** (`docs/tokenomics.md`) — 100k fixed supply, tasks as only mint, XP circulated by giving. Credentials snapshot balance as permanent proof.
4. **About Andamio** (`docs/about-andamio.md`) — Platform context: what Andamio is and how this project uses it.
5. **Content pipeline** — Raw material batched to `orch` workspace at milestones for blog posts and videos.

## Repo structure created

```
cardano-xp/
├── journal/
│   └── 001-project-inception.md
├── docs/
│   ├── tokenomics.md
│   ├── about-andamio.md
│   └── solutions/project-setup/
├── .claude/
│   ├── CLAUDE.md
│   └── skills/
│       └── journal.md
```

## Key decisions

| Decision | Why |
|----------|-----|
| Standalone repo, not internal Andamio project | Public-facing demo — anyone curious can follow the process |
| Fork from GitHub, not local copy | Mirrors real user onboarding; keeps journal authentic |
| Content to orch at milestones, not continuously | Avoids noise; batches raw material when there's enough to work with |
| `/journal` skill over passive CLAUDE.md reference | Active > passive; also demonstrates the project's own thesis |
| XP as reputation token, not financial | "Earned by doing, circulated by giving" — explicitly not learn-to-earn |

## Tokenomics research conducted

Deep research on best practices produced five implementation notes added to `docs/tokenomics.md`:

1. **Live earning dashboard** — Surface on-chain XP state in the app, not a separate tool
2. **CIP-68 for credentials** — Store XP snapshot in on-chain datum for composable verification
3. **Give graph visibility** — Show recognition flows between users (the differentiator)
4. **Build journal as reproducibility proof** — Journal entries make "vibe coded on a Sunday" a verifiable claim
5. **Supply dynamics modeling** — Interactive model for what happens as XP gets distributed across projects

## Skills and tools used

- Conversation with Claude Code for project scoping
- `compound-engineering:research:best-practices-researcher` for tokenomics research
- `/compound` for documenting this inception
- `/journal` skill created for ongoing session documentation

## What's next

- Fork template from GitHub and clone
- First code session (journal entry 002)
- Tokenomics from orch may evolve — `docs/tokenomics.md` is the living doc
