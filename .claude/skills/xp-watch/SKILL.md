---
name: xp-watch
description: Read assignment and task commitments for this app via the andamio CLI and write a report of all feedback. Read-only. Invoke with /xp-watch. Output feeds into /ce:brainstorm and /ce:plan for turning feedback into issues.
---

# XP Watch

Pulls every pending and accepted commitment for this app's prereq course and project, flattens the tiptap evidence JSON to readable markdown, and writes a dated report to `docs/feedback/reports/`. The report is the input for issue drafting; drafted issues get opened against this repo, and PRs close the loop.

Course and project IDs are read from environment variables so the same skill works for any Andamio-powered dApp.

## Triggers

`/xp-watch`. No polling, no background process.

## Prerequisites

- `andamio` CLI on PATH, authenticated (`andamio auth status`)
- `jq` installed
- `.env` or `.env.local` populated with `NEXT_PUBLIC_COURSE_ID` and `NEXT_PUBLIC_PROJECT_ID`

## Step 1: Run the report script

From the repo root:

```bash
bash .claude/skills/xp-watch/scripts/generate-report.sh
```

The script writes `docs/feedback/reports/YYYY-MM-DD-HHmm.md` and prints the absolute path on stdout.

## Step 2: Read the report back

Read the file and summarize:

- Total count of assignment commitments + task commitments
- New student aliases since the most recent prior report (if one exists)
- One-line gist of each commitment (student, status, first sentence of their feedback)

Do not edit the report file — it's a snapshot.

## Step 3: Hand off

Tell the user the report is ready and suggest: "Run `/ce:brainstorm` with this file as input to draft issues."

## Rules

- Read-only. Never run `andamio tx` or mutate state.
- If both queries return `{"data": []}`, still write the report — an empty snapshot is a valid record.
- Don't dedupe against prior reports. Each run is a full pull. Dedup is for `/ce:brainstorm`.
- If the CLI errors, surface verbatim and stop. Don't retry.
