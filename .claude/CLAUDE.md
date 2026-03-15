# Cardano XP

## What this is

A standalone, public-facing project built on the Andamio app template. The process is as much the product as the code. Five non-code outputs:

1. **Build journal** (`journal/`) — chronological record of development using agent skills
2. **Learning skills** (`.claude/skills/`) — ship with the repo so anyone can explore the codebase
3. **XP tokenomics** (`docs/tokenomics.md`) — on-chain token design
4. **About Andamio** (`docs/about-andamio.md`) — platform context
5. **Content pipeline** — raw material batched to `orch` at milestones

## Journal discipline

After completing meaningful work, run `/journal` to create a new entry. Every session should leave a trace. The journal is evidence that anyone can follow to reproduce the build.

## Repo origin

This project was forked from the Andamio app template via GitHub (not copied locally). Use the real fork+clone flow to keep the process authentic.

## Token design

XP is a reputation token, not a financial instrument. 100k fixed supply, tasks are the only mint, XP can be given to others. Credentials snapshot XP balance as permanent on-chain proof. See `docs/tokenomics.md` for full design.
