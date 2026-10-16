---
name: run-tests
description: Run the project's test suite. Only when the user explicitly asks to run tests.
disable-model-invocation: true
---

# Run tests

Only run after the user explicitly requests it.

1. Detect the test command from `package.json` (e.g. `npm test`); if none exists, tell the user and ask how to proceed.
2. Run it and report results faithfully: pass/fail counts, and full output only for failing tests.
3. Do not fix failures or commit unless the user asks.
