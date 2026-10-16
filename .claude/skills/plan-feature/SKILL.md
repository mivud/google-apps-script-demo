---
name: plan-feature
description: Create an implementation plan for a feature and wait for user approval before coding. Use for any task with non-trivial logic.
---

# Plan a feature

0. **Context check before a big task.** If the task is large (multiple files or modules, new module, schema or data-flow change) and the session already carries a lot of context (long history, big file reads, finished unrelated work), stop and recommend one of these before planning, then wait:
   - `/compact` with a focus hint (what to keep: current goal, decisions, open issues), when the history is still related to this task.
   - `/clear` then `/start-session frontend|backend|full`, when the earlier work is unrelated or already committed.
   Always ask the user to confirm first (AskUserQuestion: compact / clear and restart / continue as is) and never suggest or trigger a compact silently. Skip this step when the context is small. Claude cannot run these commands itself; the user does.
1. Read the relevant code (CLAUDE.md is already loaded).
2. If anything is ambiguous, ask the user questions first (use AskUserQuestion) and stop.
3. Delegate to the `architect` agent or write the plan directly with these sections (English):
   - Goal and non-goals
   - Affected files / new files
   - Interfaces and signatures
   - Data flow (Mermaid diagram)
   - SOLID notes and provider-independence check
   - Risks and open questions
   - Ordered task list
4. Present the plan and **stop**. Do not write code until the user approves.
