# 002 — Orchestration Scaffolding

**Date:** 2026-03-15
**Source:** Orchestration workspace + voice memo processing

## What happened

The orchestration workspace (orch) processed James's hiking trail voice memo and pushed context into this repo:

1. **tokenomics.md** — XP tokenomics v0: 100K supply, tasks-only mint, circulation by giving, credential snapshots, open platform, governance deferred to V2
2. **about-andamio.md** — What Andamio is, the stack, why it matters for XP
3. **project-context.md** — Full strategic context: origin story, connected outputs (video, substack, CF demo, pioneers), sprint cadence, companion project (vibecodeanode.com), lesson coach pathways, treasury proposal

## Decisions

- Cardano XP is the live CTA for Video #1 ("What Do We Want to Change?")
- vibecodeanode.com is the companion deep-dive course
- Treasury proposal (100K ADA) will route through Andamio — XP is the first experiment
- Three lesson coach personas: beginner, apprentice, teacher

## What's next

- Build the app from andamio-app-template
- Deploy to preprod
- Mint XP tokens
- Load first 3-4 feedback tasks
- Point cardano-xp.io at it

## Skills used

- `/voice-memo` processing in orch workspace
- Cross-repo context push from orch → xp
