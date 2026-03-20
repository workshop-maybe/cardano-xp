# About Andamio

Andamio is a protocol and platform for on-chain credentials, contribution tracking, and course delivery on Cardano.

## What It Does

- **Courses**: Structured learning built around Student Learning Targets (SLTs) — falsifiable capability claims in the format "I can [verb] [outcome] [evidence]"
- **Projects**: Task-based contribution tracking with on-chain credential snapshots
- **Credentials**: Portable, composable, on-chain proof of what you've done and what you can do

## Why It Matters for Cardano XP

Cardano XP is built on top of Andamio's app template. The XP token system uses Andamio's project and credential infrastructure:

1. **Projects** define tasks that contributors can complete
2. **XP tokens** are minted when tasks are completed (tasks are the only mint)
3. **Credentials** snapshot your XP balance as permanent on-chain proof
4. **Courses** teach people how to contribute (the "Vibe Code a Node" example)

Anyone can host a project on Andamio and distribute XP to contributors. The protocol enforces prerequisites — so project creators can require specific credentials or XP thresholds without knowing the contributor personally.

## The Stack

| Layer | What | Repo |
|-------|------|------|
| App template | Next.js starter with wallet connection, credential display | `andamio-app-template` |
| API | Gateway for course, project, and credential operations | `andamio-api` (v2.1.0) |
| CLI | Command-line access to protocol operations | `andamio-cli` |
| Protocol | On-chain validators, token minting, state machines | `andamio-core` |

## Links

- Platform: https://app.andamio.io
- Docs: https://docs.andamio.io
- GitHub: https://github.com/andamioio
