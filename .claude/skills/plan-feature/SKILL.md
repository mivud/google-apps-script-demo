---
name: plan-feature
description: Create an implementation plan for a feature and wait for user approval before coding. Use for any task with non-trivial logic.
---

# Plan a feature

1. Read CLAUDE.md and relevant code.
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
