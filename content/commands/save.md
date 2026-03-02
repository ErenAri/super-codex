# /sc:save

## Purpose
Capture and persist the current session's context, decisions, progress, and key insights so that future sessions can resume without loss of continuity.

## Activation
- Persona: architect
- Mode: balanced

## Context
The save command is the memory backbone of SuperCodex. Every interactive session
accumulates valuable state: architectural decisions, rejected alternatives,
partially completed plans, discovered constraints, and implicit knowledge that
exists only in the conversation context. Without explicit persistence, all of
this is lost when the session ends. The save command transforms ephemeral
conversation state into durable, structured artifacts that downstream commands
(`/sc:task`, `/sc:spawn`, `/sc:workflow`) can consume.

## Behavioral Flow

### Step 1 -- Identify Session State (15% effort)

1. Scan the entire conversation history for stateful content.
2. Classify each piece of state into one of these categories:
   - **Decisions**: Choices made with rationale (e.g., "chose PostgreSQL over SQLite because...").
   - **Progress**: Tasks started, completed, or blocked.
   - **Discoveries**: Bugs found, constraints identified, assumptions invalidated.
   - **Context**: Environment details, file paths, tool versions, branch names.
   - **Open Questions**: Unresolved items that need future attention.
3. If the session has no meaningful state to save, inform the user and exit early.
4. If the session state is ambiguous, ask one clarifying question before proceeding.

Effort guardrail: Do not spend more than 15% of total effort on this step.
If the session is short (under 10 exchanges), this step should complete in
under 30 seconds of reasoning time.

### Step 2 -- Collect Key Decisions (25% effort)

1. For each decision identified in Step 1, extract:
   - **What** was decided.
   - **Why** it was decided (rationale, tradeoffs considered).
   - **What alternatives** were rejected and why.
   - **Confidence level**: high / medium / low.
   - **Reversibility**: easily reversible / costly to reverse / irreversible.
2. Assign a short identifier to each decision (e.g., `DEC-001`).
3. Preserve the original phrasing where possible; do not over-summarize.
4. If a decision contradicts or updates an earlier decision in the same session,
   note the supersession explicitly.
5. For progress items, capture:
   - Task description and status (not-started / in-progress / done / blocked).
   - Blockers, if any, with enough context to act on them.
   - Files or functions touched.
6. For discoveries, capture:
   - The finding in one sentence.
   - Supporting evidence (error messages, stack traces, file references).
   - Impact assessment: does this change the plan?

Effort guardrail: Spend the most time here. Accuracy of decisions is critical;
progress and discoveries can be captured more quickly.

### Step 3 -- Format for Persistence (25% effort)

1. Assemble the collected state into a structured markdown document with the
   following sections:

   ```markdown
   # Session Save -- {ISO 8601 timestamp}

   ## Summary
   One paragraph overview of what happened in this session.

   ## Decisions
   | ID | Decision | Rationale | Confidence | Reversibility |
   |----|----------|-----------|------------|---------------|
   | DEC-001 | ... | ... | high | easily reversible |

   ## Progress
   - [x] Completed task description
   - [ ] In-progress task (blocked by: ...)
   - [ ] Not started task

   ## Discoveries
   - Finding 1: description (evidence: ...)

   ## Open Questions
   - Question 1: context and importance

   ## Context Snapshot
   - Branch: ...
   - Key files: ...
   - Environment: ...
   ```

2. Ensure the document is self-contained: a reader with no prior context should
   be able to understand the state of the project from this file alone.
3. Keep the total length under 500 lines. If the session was very long, prioritize
   decisions and blockers over routine progress.
4. Use relative file paths where possible for portability.

### Step 4 -- Write Context Files (20% effort)

1. Determine the save location. Default: `.codex/supercodex/sessions/`.
2. Generate a filename: `session-{YYYY-MM-DD}-{HH-MM-SS}.md`.
3. Before writing, check if the target directory exists. If not, create it.
4. Write the formatted document to the target file.
5. If an `index.md` file exists in the sessions directory, append a one-line
   entry linking to the new session file.
6. If the user specified a custom save path via arguments, use that instead.

Important: Never overwrite an existing file without explicit user confirmation.
If a filename collision is detected, append a numeric suffix (e.g., `-1`, `-2`).

### Step 5 -- Confirm Saved (15% effort)

1. Report to the user:
   - The file path where the session was saved.
   - A brief summary of what was captured (e.g., "3 decisions, 5 progress items,
     2 open questions").
   - Any items that were ambiguous or could not be confidently captured.
2. Suggest next steps:
   - "Run `/sc:task` to create action items from open questions."
   - "Run `/sc:save` again before ending your next session."
3. If the save was partial or had warnings, clearly flag them.

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to check for existing session files
  before writing. Use `write_file` to persist the session document.
- **Directory tools**: Use `list_directory` to inspect the sessions folder
  structure.
- **Git tools**: If available, use `git_status` or `git_log` to capture the
  current branch and recent commit context automatically.
- **Search tools**: Use `grep` or `ripgrep` if you need to find references to
  specific decisions in prior session files.

### Tool Selection Priority
1. Prefer MCP file tools over shell commands for portability.
2. Fall back to shell commands only if MCP tools are unavailable.
3. Never use tools that modify source code or project configuration.

### Error Handling
- If file write fails (permissions, disk space), report the error clearly and
  offer to output the session document to stdout instead.
- If git tools are unavailable, skip the context snapshot section rather than
  failing.

## Boundaries

### WILL DO:
- Save session summaries, decisions, and progress to structured markdown files.
- Capture architectural decisions with rationale and confidence levels.
- Record discovered bugs, constraints, and invalidated assumptions.
- Track task status (not-started, in-progress, done, blocked).
- Preserve open questions for future sessions.
- Create session index files for easy navigation.
- Capture environment context (branch, key files, tool versions).
- Ask for confirmation before overwriting existing files.
- Suggest follow-up commands after saving.

### WILL NOT DO:
- Modify project source code, configuration files, or build scripts.
- Overwrite existing user files without explicit confirmation.
- Save sensitive information (API keys, passwords, tokens) to session files.
- Execute code or run tests as part of the save process.
- Make decisions on behalf of the user about what to keep or discard.
- Delete or archive old session files without user direction.
- Modify `.codex/` configuration files (only write to the sessions subfolder).
- Push changes to git or modify the git state in any way.

## Output Format

### Primary Output
A markdown file written to `.codex/supercodex/sessions/session-{timestamp}.md`
containing all captured state.

### Console Output
```
Session saved to: .codex/supercodex/sessions/session-2026-03-01-14-30-00.md

Captured:
  - 3 decisions (2 high confidence, 1 medium)
  - 5 progress items (2 done, 2 in-progress, 1 blocked)
  - 2 discoveries
  - 4 open questions

Next steps:
  - /sc:task to create action items from open questions
  - /sc:save before ending your next session
```

### Edge Cases

- **Empty session**: If no meaningful state is found, output:
  "No significant session state to save. The session contained only exploratory
  questions with no decisions or progress to persist."
- **Very long session**: If the session exceeds 100 exchanges, summarize
  routine progress items and preserve all decisions verbatim.
- **Conflicting decisions**: If the session contains contradictory decisions
  (e.g., "use Redis" then later "actually use Memcached"), capture both with
  explicit notation that the later decision supersedes the earlier one.
- **Resumption context**: If this session was itself a continuation of a
  previous saved session, note the lineage in the Summary section.

### Error Output
- File write failure: "Failed to write session file: {error}. Session content
  printed below for manual saving."
- Permission denied: "Cannot write to {path}. Check directory permissions or
  specify an alternative path: `/sc:save --path=/alternative/path`"

## Next Steps
After saving, the user may want to:
- `/sc:task` -- Convert open questions and blocked items into actionable tasks.
- `/sc:spawn` -- Break large in-progress items into parallelizable sub-tasks.
- `/sc:workflow` -- Review and optimize the development workflow based on
  session patterns.
- `/sc:sc` -- Check the overall SuperCodex status and available commands.

## Examples

### Example 1: Standard Session Save
```
User: /sc:save

Agent: Scanning session for stateful content...

Found:
  - 2 architectural decisions
  - 3 completed tasks, 1 blocked task
  - 1 discovery (performance regression in auth module)
  - 2 open questions

Session saved to: .codex/supercodex/sessions/session-2026-03-01-14-30-00.md
```

### Example 2: Save with Custom Path
```
User: /sc:save --path=docs/session-notes/sprint-12.md

Agent: Writing session state to docs/session-notes/sprint-12.md...
Session saved successfully.
```

### Example 3: Empty Session
```
User: /sc:save

Agent: No significant session state to save. The session contained only
exploratory questions with no decisions or progress to persist.
```

### Example 4: Resumption from Prior Session
```
User: /sc:save

Agent: This session continues from session-2026-02-28-16-45-00.md.
Lineage noted in the summary section.

Session saved to: .codex/supercodex/sessions/session-2026-03-01-09-00-00.md
```

## Argument Handling

The `$ARGUMENTS` string may contain:

| Argument | Description | Default |
|----------|-------------|---------|
| `--path=<filepath>` | Custom save location | `.codex/supercodex/sessions/` |
| `--format=<fmt>` | Output format: `markdown`, `json` | `markdown` |
| `--include=<categories>` | Comma-separated list of categories to include | all |
| `--exclude=<categories>` | Comma-separated list of categories to exclude | none |
| `--dry-run` | Show what would be saved without writing | false |
| (no arguments) | Save everything to default location | -- |

If `$ARGUMENTS` is empty, save the full session to the default location.
If `$ARGUMENTS` contains unrecognized flags, warn the user and proceed with
recognized flags only.

## Quality Checklist
Before finalizing the save, verify:
- [ ] Every decision has a rationale (not just "decided X").
- [ ] Progress items have clear status indicators.
- [ ] Open questions include enough context to act on without re-reading the
      full conversation.
- [ ] No sensitive data (keys, tokens, passwords) is included.
- [ ] File paths are relative where possible.
- [ ] The document is self-contained and readable standalone.

## User Task
$ARGUMENTS
