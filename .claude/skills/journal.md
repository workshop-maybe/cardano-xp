---
name: journal
description: Create a new numbered journal entry documenting what was done, decisions made, and skills used
user_invocable: true
---

# /journal

Create a new build journal entry in `journal/`.

## Steps

1. List existing files in `journal/` to determine the next entry number (format: `NNN-slug.md`)
2. Review recent conversation context to identify:
   - What was done
   - Key decisions made
   - Which agent skills or tools were used
   - Any open questions or next steps
3. Ask the user for a short slug if not provided as an argument (e.g., "tokenomics-research")
4. Write the entry with this structure:

```markdown
# NNN — Title

**Date:** YYYY-MM-DD

## What happened

[Concise narrative of what was done in this session]

## Decisions

- [Bullet list of decisions made and why]

## Skills used

- [Which agent skills, slash commands, or tools were used and for what]

## Open questions

- [Anything unresolved or deferred]
```

5. Keep entries concise. The journal is evidence, not prose. Someone should be able to skim all entries in 10 minutes and understand the full build.
