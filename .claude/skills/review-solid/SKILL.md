---
name: review-solid
description: Review current uncommitted changes against SOLID and provider-independence rules. Use after coding and before the user's review.
---

# SOLID review

1. Run `git diff` (and `git status` for new files).
2. Delegate to the `solid-reviewer` agent, or review directly using the checklist in CLAUDE.md.
3. Report findings by severity with file:line and a suggested fix.
4. Do not edit code, run tests, or commit unless the user asks.
