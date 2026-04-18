# Feedback Pipeline

Cardano XP is a feedback tool for Cardano builders. The feedback we receive from our own contributors becomes the roadmap for improving Cardano XP itself. This directory makes that loop visible.

## The Loop

1. **Contributor earns credential** — a student completes the prereq assignment (Module 101) with real feedback about the app, signs a tx, and earns their Cardano XP membership token
2. **Feedback becomes a report** — `/xp-watch` pulls every commitment from the Andamio API, flattens the tiptap evidence, and writes a dated snapshot to `reports/`
3. **Report becomes issues** — `/ce:brainstorm` against the report drafts a GitHub issue per actionable piece of feedback, crediting the reporter
4. **Issues become PRs** — work gets picked up against the open issues; each PR is a visible record of a change made in response to community feedback
5. **Credential + improved app** — the contributor keeps their on-chain credential forever; the app gets better

Every step is a public artifact. The point: from "user said something" to "user can see their feedback shipped" there is a continuous paper trail.

## Running the pipeline

```bash
bash .claude/skills/xp-watch/scripts/generate-report.sh
```

Requires:

- `andamio` CLI (`brew install andamio-cli` or see andamio-cli docs)
- Authenticated: `andamio auth status`
- `jq` installed
- `.env` or `.env.local` populated with `NEXT_PUBLIC_COURSE_ID` and `NEXT_PUBLIC_PROJECT_ID`

In Claude Code, invoke `/xp-watch` to run the pipeline and read the report back in the same session.

## Files

- `reports/YYYY-MM-DD-HHmm.md` — one snapshot per run. Each snapshot is complete; deduplication happens downstream in issue drafting, not here.

## Why this lives in the repo

The feedback report is evidence that real people contributed and real action was taken. Keeping it as a committed artifact (rather than in a private ops vault) means:

- Anyone can see what feedback has come in
- The connection between a specific contributor's commitment and a specific issue is traceable
- The pipeline itself is open-source — other Andamio-powered dApps can fork this pattern
