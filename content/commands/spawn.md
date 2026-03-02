# /sc:spawn

## Purpose
Decompose a parent task into well-defined, parallelizable sub-tasks with clear boundaries, interfaces, and dependency tracking to enable concurrent or phased execution.

## Activation
- Persona: architect
- Mode: balanced

## Context
Large tasks are the enemy of predictable delivery. A single monolithic task
like "build the authentication system" hides dozens of smaller decisions,
creates unclear ownership, and makes progress invisible. The spawn command
applies disciplined decomposition to break a parent task into sub-tasks that
can be worked on independently -- potentially in parallel by multiple agents
or sessions. Each sub-task has clear inputs, outputs, acceptance criteria,
and declared dependencies on other sub-tasks.

The spawn command is the counterpart to `/sc:task` (which manages individual
tasks) and complements `/sc:workflow` (which manages the overall process).
Think of spawn as the work breakdown structure generator.

## Behavioral Flow

### Step 1 -- Decompose Parent Task (20% effort)

1. Parse `$ARGUMENTS` to extract the parent task description.
2. If `$ARGUMENTS` references a saved task (e.g., from a prior `/sc:save` or
   `/sc:task` session), load that task's full context.
3. Analyze the parent task to identify its constituent parts:
   - **Functional decomposition**: What distinct features or behaviors must
     be implemented?
   - **Layer decomposition**: What work is needed at each architectural layer
     (data, logic, API, UI, tests, docs)?
   - **Temporal decomposition**: What must happen first, second, third?
4. List all identified sub-components without filtering or prioritizing yet.
5. If the parent task is too vague to decompose meaningfully, ask one targeted
   question: "What is the expected outcome when this task is done?"
6. If the parent task is already atomic (cannot be meaningfully decomposed),
   inform the user: "This task is already at an appropriate granularity for
   direct execution. Use `/sc:task` instead."

### Step 2 -- Identify Parallelizable Work (20% effort)

1. For each sub-component from Step 1, determine:
   - **Inputs**: What does this sub-task need before it can start?
   - **Outputs**: What does this sub-task produce?
   - **Dependencies**: Which other sub-tasks must complete first?
2. Build a dependency graph:
   - Tasks with no dependencies can run in parallel (Wave 1).
   - Tasks that depend only on Wave 1 tasks form Wave 2.
   - Continue until all tasks are assigned a wave.
3. Identify the critical path: the longest chain of dependent tasks that
   determines the minimum total elapsed time.
4. Flag opportunities for parallelism:
   - "Sub-tasks A, B, and C have no dependencies on each other and can
     run in parallel."
   - "Sub-task D depends on A but not B or C, so it can start as soon
     as A finishes."
5. Identify shared resources or contention points:
   - Multiple sub-tasks modifying the same file.
   - Multiple sub-tasks requiring the same test fixtures.
   - Multiple sub-tasks depending on the same external service.

### Step 3 -- Define Sub-Task Boundaries (25% effort)

1. For each sub-task, define a clear specification:

   ```markdown
   ### Sub-Task {ID}: {Title}
   - **Description**: One paragraph explaining what this sub-task accomplishes.
   - **Inputs**: List of required inputs (files, data, API responses).
   - **Outputs**: List of deliverables (files created/modified, APIs exposed).
   - **Acceptance Criteria**: Specific, testable conditions for "done".
   - **Dependencies**: List of sub-task IDs that must complete first.
   - **Estimated Effort**: S / M / L / XL.
   - **Risk Level**: low / medium / high.
   - **Wave**: {wave number} (which parallel batch this belongs to).
   ```

2. Apply these boundary-setting rules:
   - **Single responsibility**: Each sub-task should do one thing well.
   - **Minimal interface**: The interface between sub-tasks should be as
     small as possible (prefer passing data through files or simple function
     signatures over complex shared state).
   - **Independent testability**: Each sub-task should be verifiable
     without running the other sub-tasks.
   - **Reversibility**: If a sub-task fails or is rejected, it should be
     possible to undo without affecting other sub-tasks.

3. Define the interface contracts between dependent sub-tasks:
   - What is the expected format of data passed between them?
   - What file paths or function signatures must be agreed upon?
   - What error conditions should the downstream sub-task handle?

4. If two sub-tasks are tightly coupled (changing one always requires
   changing the other), merge them into a single sub-task and note why.

### Step 4 -- Create Sub-Task Specs (25% effort)

1. Assemble the complete spawn specification document:

   ```markdown
   # Spawn: {Parent Task Title}

   ## Parent Task
   {Original task description}

   ## Decomposition Summary
   - Total sub-tasks: {N}
   - Waves: {M}
   - Critical path: {list of sub-task IDs on critical path}
   - Estimated total effort: {sum of estimates}
   - Maximum parallelism: {number of tasks in largest wave}

   ## Dependency Graph
   Wave 1 (no dependencies):  [ST-001, ST-002, ST-003]
   Wave 2 (depends on Wave 1): [ST-004, ST-005]
   Wave 3 (depends on Wave 2): [ST-006]

   ## Sub-Tasks
   {Individual sub-task specifications from Step 3}

   ## Interface Contracts
   {Data formats, file paths, function signatures shared between sub-tasks}

   ## Risk Assessment
   - {Risk 1}: {impact} / {mitigation}
   - {Risk 2}: {impact} / {mitigation}
   ```

2. Validate the specification:
   - Every sub-task has at least one acceptance criterion.
   - The dependency graph has no cycles.
   - All outputs of predecessor tasks match the inputs of successor tasks.
   - The wave assignments are consistent with the dependency graph.
   - No sub-task is estimated as XL (if so, suggest further decomposition).

3. If validation fails, fix the issues and note what was changed.

### Step 5 -- Track Dependencies (10% effort)

1. Produce a machine-readable dependency summary:
   ```
   ST-001: [] (no dependencies)
   ST-002: [] (no dependencies)
   ST-003: [] (no dependencies)
   ST-004: [ST-001, ST-002]
   ST-005: [ST-003]
   ST-006: [ST-004, ST-005]
   ```

2. Identify the recommended execution order for serial execution
   (if parallelism is not available):
   - Topological sort of the dependency graph.
   - Break ties by estimated effort (smaller first) to surface issues early.

3. Suggest how to track progress:
   - "Use `/sc:task` to manage individual sub-tasks."
   - "Use `/sc:save` to persist the spawn specification for future sessions."

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to load existing task definitions
  or prior save files. Use `write_file` to persist the spawn specification.
- **Search tools**: Use `grep` or `ripgrep` to find references to the parent
  task in existing codebase or documentation.
- **Git tools**: Use `git_log` or `git_diff` to understand what work has
  already been done toward the parent task.

### Tool Selection Priority
1. Prefer reading existing context (saves, tasks) over asking the user to
   re-explain.
2. Use search tools to verify that sub-task boundaries align with the actual
   codebase structure (e.g., check if proposed file boundaries match existing
   module organization).
3. Do not execute any code or tests during decomposition.

### Error Handling
- If a referenced prior task or save file cannot be found, proceed with
  decomposition based on the `$ARGUMENTS` text alone.
- If the dependency graph has cycles, report the cycle and ask the user
  which dependency to break.

## Boundaries

### WILL DO:
- Decompose parent tasks into well-defined sub-tasks.
- Identify dependencies and parallelization opportunities.
- Define clear interfaces between sub-tasks.
- Assign wave numbers for parallel execution scheduling.
- Estimate effort and risk for each sub-task.
- Validate that the decomposition is complete and consistent.
- Produce machine-readable dependency graphs.
- Suggest execution order for both parallel and serial scenarios.
- Reference existing project structure to inform decomposition.

### WILL NOT DO:
- Execute any of the sub-tasks.
- Modify source code, configuration, or project files.
- Make scope decisions (adding or removing requirements from the parent task).
- Assign sub-tasks to specific people or agents without user direction.
- Estimate calendar time (only relative effort: S/M/L/XL).
- Create branches, commits, or PRs.
- Override the user's architectural preferences.

## Output Format

### Standard Spawn Output
The primary output is the spawn specification document described in Step 4.
This should be rendered directly in the conversation and optionally saved
to a file.

### Console Summary
```
Spawned: {Parent Task Title}
  Sub-tasks:  {N} total
  Waves:      {M} (max parallelism: {P})
  Critical path: ST-001 -> ST-004 -> ST-006
  Estimated effort: {total}

Wave 1: ST-001 (S), ST-002 (M), ST-003 (S)
Wave 2: ST-004 (M), ST-005 (S)
Wave 3: ST-006 (L)

Next steps:
  /sc:task ST-001   -- Start the first sub-task.
  /sc:save          -- Persist this decomposition.
```

### Edge Cases
- **Trivial parent task**: If the task has only 1-2 sub-components, skip the
  formal spawn process: "This task is small enough to execute directly. Use
  `/sc:task` for tracking."
- **Ambiguous dependencies**: If it is unclear whether two sub-tasks depend on
  each other, assume independence but flag it: "ST-003 and ST-004 may have a
  hidden dependency through shared state in module X. Verify before running
  in parallel."
- **Circular dependencies**: Report the cycle and suggest which edge to break:
  "ST-002 depends on ST-005 which depends on ST-002. Suggest breaking the
  dependency by defining an interface contract between them."
- **Very large decomposition**: If the parent task yields more than 15 sub-tasks,
  suggest grouping into epics: "This decomposition produced 22 sub-tasks.
  Consider grouping into 4 epics for manageability."

## Next Steps
After spawning sub-tasks, the user may want to:
- `/sc:task ST-001` -- Begin working on the first sub-task.
- `/sc:save` -- Persist the spawn specification for future sessions.
- `/sc:workflow` -- Review the overall workflow given the new sub-tasks.
- `/sc:spec-panel` -- Have the decomposition reviewed by the expert panel.

## Examples

### Example 1: Feature Decomposition
```
User: /sc:spawn Build user authentication with OAuth2 and email/password

Agent:
Spawned: User Authentication System
  Sub-tasks: 7 total
  Waves: 3 (max parallelism: 3)
  Critical path: ST-001 -> ST-004 -> ST-007
  ...
```

### Example 2: Refactoring Decomposition
```
User: /sc:spawn Migrate database layer from raw SQL to an ORM

Agent:
Spawned: Database Layer ORM Migration
  Sub-tasks: 5 total
  Waves: 3 (max parallelism: 2)
  ...
```

### Example 3: Atomic Task (No Spawn Needed)
```
User: /sc:spawn Fix the typo in the README

Agent: This task is already at an appropriate granularity for direct
execution. Use /sc:task instead.
```

## Argument Handling

The `$ARGUMENTS` string should contain the parent task description.

| Argument Pattern | Description |
|------------------|-------------|
| `<task description>` | Free-form description of the parent task |
| `--from-save=<file>` | Load parent task from a saved session file |
| `--max-wave=<N>` | Limit decomposition to N waves max |
| `--format=md` | Output as markdown (default) |
| `--format=json` | Output as JSON for programmatic consumption |

If `$ARGUMENTS` is empty, ask the user to describe the parent task.

## Quality Checklist
Before finalizing the spawn specification, verify:
- [ ] Every sub-task has a clear, testable acceptance criterion.
- [ ] The dependency graph has no cycles.
- [ ] Interface contracts are defined for all dependent pairs.
- [ ] No sub-task is estimated XL (suggest further decomposition).
- [ ] The critical path is identified and flagged.
- [ ] Shared resource contention points are documented.
- [ ] Wave assignments are consistent with dependencies.

## User Task
$ARGUMENTS
