---
name: review-security-backend
description: Security review of backend changes (Apps Script, shared library, Supabase). Use after backend coding, before the user's review, and whenever a change touches auth, input, storage or config.
---

# Backend security review

1. Run `git status --short` and `git diff --stat -- backend`; full diffs only per file where needed.
2. Delegate to the `security-reviewer-backend` agent (it owns the checklist); do not restate its rules. Run it in parallel with `solid-reviewer` when both apply.
3. Report findings by severity with file:line and a concrete fix; fix critical and high findings before asking the user to review.
4. Do not run tests, commit or push unless the user asks.
