# Solutions

Documented solutions to problems encountered in this codebase. Each solution compounds team knowledge — the first fix takes research, documented fixes take minutes.

## Categories

| Category | Purpose |
|----------|---------|
| `build-errors/` | Compilation, bundling, type errors |
| `test-failures/` | Test setup, flaky tests, assertion issues |
| `runtime-errors/` | Exceptions, crashes, undefined behavior |
| `performance-issues/` | Slow queries, memory leaks, bottlenecks |
| `database-issues/` | Migrations, schema, data integrity |
| `security-issues/` | Auth, XSS, injection, CORS |
| `ui-bugs/` | Styling, layout, responsive, hydration |
| `integration-issues/` | API, third-party services, webhooks |
| `logic-errors/` | Business logic, state management |

## Document Structure

Each solution follows this schema:

```yaml
---
title: Brief descriptive title
category: build-errors  # one of the categories above
tags: [mesh-sdk, wallet, cip-30]  # searchable tags
severity: high  # low | medium | high | critical
date_solved: 2026-03-06
related_issues: []  # GitHub issue numbers
---
```

Then markdown sections:

- **Symptom** — What you observed
- **Root Cause** — Why it happened
- **Solution** — How to fix it (with code)
- **Prevention** — How to avoid it

## Usage

Document a solution after fixing a non-trivial problem:

```bash
/workflows:compound
```

Search for existing solutions:

```bash
# The learnings-researcher agent searches this directory
# when planning features or debugging issues
```

## Philosophy

> Each unit of engineering work should make subsequent units of work easier — not harder.

1. First time you solve a problem → Research (30 min)
2. Document the solution → 5 min
3. Next occurrence → Quick lookup (2 min)
4. Knowledge compounds → Team gets smarter
