---
name: review-security-frontend
description: Security review of frontend changes (React/Vite, adapters, env config, deploy files). Use after frontend coding, before the user's review, and whenever a change touches rendering of data, env vars, storage, URLs or dependencies.
---

# Frontend security review

1. Run `git status --short` and `git diff --stat -- frontend`; full diffs only per file where needed.
2. Delegate to the `security-reviewer-frontend` agent (it owns the checklist); do not restate its rules. Run it in parallel with `solid-reviewer` when both apply.
3. Report findings by severity with file:line and a concrete fix; fix critical and high findings before asking the user to review.
4. Do not run tests, commit or push unless the user asks.
