---
name: review-solid
description: Review current uncommitted changes against SOLID and provider-independence rules. Use after coding and before the user's review.
---

# SOLID review

1. Run `git status --short` and `git diff --stat`; full diffs only per file where needed.
2. Delegate to the `solid-reviewer` agent (it owns the checklist); do not restate its rules.
3. Report findings by severity with file:line and a suggested fix.
4. Do not edit code, run tests, or commit unless the user asks.
