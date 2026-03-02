# /sc:task

## Purpose
Parse a task description, decompose it into actionable steps, estimate effort, prioritize and sequence the steps, and produce a clear execution plan.

## Activation
- Persona: architect
- Mode: balanced

## Context
Effective task management is the difference between making steady progress and
spinning in circles. Developers often carry a vague sense of what needs to be
done without a concrete plan of attack. The task command transforms a loose
task description into a structured execution plan with ordered steps, effort
estimates, dependencies, and checkpoints. It does not execute the work -- it
creates the roadmap.

The task command integrates with the broader SuperCodex workflow:
- `/sc:spawn` feeds sub-tasks into `/sc:task` for detailed planning.
- `/sc:save` persists task state across sessions.
- `/sc:workflow` provides the process context for prioritization.
- `/sc:test` verifies the outcomes of completed tasks.

## Behavioral Flow

### Step 1 -- Parse Task Description (10% effort)

1. Extract the task description from `$ARGUMENTS`.
2. Identify the core objective: What is the single outcome the user wants?
3. Identify implicit requirements:
   - If the task mentions a feature, testing is implicitly required.
   - If the task modifies an API, documentation updates are implicitly required.
   - If the task touches data models, migration steps are implicitly required.
4. Identify explicit constraints mentioned in the description:
   - Time constraints ("before the release", "this sprint").
   - Scope constraints ("only the backend", "without changing the API").
   - Quality constraints ("must have 80% coverage", "must pass security review").
5. If the task description is a single word or phrase with no verb, expand it
   into a proper task statement by asking: "What specifically should be done
   regarding {topic}?"
6. If the task description references prior context (e.g., "continue the auth
   work"), attempt to load that context from saved sessions.

### Step 2 -- Decompose into Steps (25% effort)

1. Break the task into discrete, ordered steps. Each step should be:
   - **Atomic**: Completable in a single focused work session (under 2 hours).
   - **Verifiable**: Has a clear "done" condition that can be checked.
   - **Described as an action**: Starts with a verb (implement, write, configure,
     test, review, document).
2. Apply this standard decomposition template:

   **Phase 1 -- Preparation**
   - Understand the current state (read code, check documentation).
   - Set up prerequisites (branches, test fixtures, configuration).
   - Identify risks and unknowns.

   **Phase 2 -- Implementation**
   - Core changes, broken into the smallest meaningful increments.
   - Each increment should produce a working (possibly incomplete) system.

   **Phase 3 -- Verification**
   - Write and run tests.
   - Review changes for correctness, security, and performance.
   - Validate against acceptance criteria.

   **Phase 4 -- Finalization**
   - Update documentation.
   - Clean up temporary code, debug logging, and TODOs.
   - Prepare for code review or merge.

3. Number each step sequentially: `STEP-01`, `STEP-02`, etc.
4. For each step, write:
   - A one-sentence description of what to do.
   - The expected deliverable (file modified, test passing, etc.).
   - Any prerequisites (prior steps, external approvals, etc.).

### Step 3 -- Estimate Effort per Step (20% effort)

1. Assign a t-shirt size estimate to each step:
   - **XS**: Under 15 minutes. Trivial change, no research needed.
   - **S**: 15-30 minutes. Small change, minimal research.
   - **M**: 30-60 minutes. Moderate change, some research or iteration.
   - **L**: 1-2 hours. Significant change, requires careful thought.
   - **XL**: 2+ hours. Consider decomposing further with `/sc:spawn`.
2. Apply these estimation heuristics:
   - Reading and understanding code: S-M depending on codebase familiarity.
   - Writing new code with tests: M-L depending on complexity.
   - Modifying existing code: M (includes understanding + changing + retesting).
   - Writing documentation: S-M depending on scope.
   - Configuration changes: XS-S unless debugging is expected.
   - Code review preparation: S.
3. Flag any step estimated as XL:
   - "STEP-07 is estimated as XL. Consider running `/sc:spawn` to decompose
     it further."
4. Calculate the total estimated effort:
   - Sum of all steps using midpoint values (XS=10m, S=22m, M=45m, L=90m, XL=180m).
   - Present as both total time and a qualitative assessment:
     "Total estimated effort: approximately 4.5 hours (a comfortable full-day task)."
5. Add a contingency buffer:
   - Under 2 hours total: add 20% buffer.
   - 2-8 hours total: add 30% buffer.
   - Over 8 hours total: add 40% buffer and recommend `/sc:spawn`.

### Step 4 -- Prioritize and Sequence (25% effort)

1. Determine the execution order based on:
   - **Dependencies**: Steps that produce inputs for later steps go first.
   - **Risk reduction**: Steps that resolve unknowns or validate assumptions
     go before steps that build on those assumptions.
   - **Value delivery**: Steps that produce visible progress go before
     purely technical steps (to build momentum and enable early feedback).
   - **Fail-fast principle**: Steps most likely to reveal that the task is
     infeasible or needs redesign go first.
2. Identify checkpoints -- moments where the user should pause and verify:
   - After completing all preparation steps.
   - After completing the core implementation.
   - After all tests pass.
   - Before the final commit.
3. For each checkpoint, define:
   - What to verify: "All existing tests still pass."
   - How to verify: "Run `npm test` and check for zero failures."
   - What to do if verification fails: "Investigate the failure before proceeding.
     Use `/sc:troubleshoot` if needed."
4. Identify optional steps that can be skipped under time pressure:
   - Mark them with `[OPTIONAL]`.
   - Explain the tradeoff: "Skipping this reduces coverage but saves 30 minutes."
5. Produce the final sequenced plan.

### Step 5 -- Create Execution Plan (20% effort)

1. Assemble the complete execution plan document:

   ```markdown
   # Task: {Task Title}

   ## Objective
   {One sentence statement of the goal}

   ## Constraints
   {Any time, scope, or quality constraints}

   ## Execution Plan

   ### Phase 1: Preparation
   - [ ] STEP-01 (XS): {description} -- Deliverable: {deliverable}
   - [ ] STEP-02 (S): {description} -- Deliverable: {deliverable}
   > CHECKPOINT: {what to verify}

   ### Phase 2: Implementation
   - [ ] STEP-03 (M): {description} -- Deliverable: {deliverable}
   - [ ] STEP-04 (L): {description} -- Deliverable: {deliverable}
   - [ ] STEP-05 (M): {description} -- Deliverable: {deliverable}
   > CHECKPOINT: {what to verify}

   ### Phase 3: Verification
   - [ ] STEP-06 (M): {description} -- Deliverable: {deliverable}
   - [ ] STEP-07 (S): {description} -- Deliverable: {deliverable}
   > CHECKPOINT: {what to verify}

   ### Phase 4: Finalization
   - [ ] STEP-08 (S): {description} -- Deliverable: {deliverable}
   - [ ] STEP-09 [OPTIONAL] (S): {description} -- Deliverable: {deliverable}

   ## Effort Summary
   Total: {sum} ({qualitative assessment})
   Buffer: {percentage} -- Adjusted total: {adjusted sum}

   ## Risks
   - {risk 1}: {mitigation}
   - {risk 2}: {mitigation}
   ```

2. Validate the plan:
   - Every step has a clear deliverable.
   - Dependencies are respected in the ordering.
   - Checkpoints are placed at natural pause points.
   - The total effort is reasonable for the task scope.
3. If the plan has issues, fix them and note the corrections.

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to load existing task definitions,
  saved sessions, or prior execution plans.
- **Search tools**: Use `grep` to find related tasks, tests, or documentation
  in the project.
- **Git tools**: Use `git_status` to understand what work is in flight, and
  `git_log` to see what has been completed recently.

### Tool Selection Priority
1. Load existing context first (saves, prior tasks).
2. Search the codebase to understand the current state of what the task
   will modify.
3. Do not execute code, tests, or build commands.

### Error Handling
- If referenced context cannot be loaded, proceed with planning based on
  the arguments alone.
- If the task scope cannot be estimated (too novel or too uncertain), flag
  it explicitly and recommend a spike/research step first.

## Boundaries

### WILL DO:
- Break down tasks into actionable, atomic steps.
- Estimate effort for each step using t-shirt sizes.
- Sequence steps based on dependencies, risk, and value.
- Define checkpoints with clear verification criteria.
- Identify risks and suggest mitigations.
- Mark optional steps that can be skipped under time pressure.
- Track task progress through checklist format.
- Suggest further decomposition for XL steps.
- Create structured execution plans.

### WILL NOT DO:
- Execute any task steps (no code changes, no tests, no commits).
- Make scope decisions (adding or removing requirements).
- Assign calendar dates or deadlines.
- Commit to specific implementation approaches without user input.
- Skip the estimation step, even for seemingly simple tasks.
- Create tasks for work the user did not request.
- Prioritize based on business value (only technical sequencing).

## Output Format

### Standard Plan Output
The primary output is the execution plan document described in Step 5.

### Compact Plan Output (for simple tasks)
```
Task: {title}
Steps:
  1. (S) {step description}
  2. (M) {step description}
  3. (S) {step description}
Total: ~1.5 hours (with buffer)
```

### Edge Cases
- **Single-step task**: "This task is a single atomic action. No decomposition
  needed. Estimated effort: {size}. Proceed directly."
- **Research/spike task**: "This task has high uncertainty. Recommend a
  timeboxed research spike first: spend {time} investigating, then re-plan
  based on findings."
- **Blocked task**: If the task depends on external factors, note the blocker
  prominently: "BLOCKED: Waiting on {dependency}. Steps 1-3 can proceed;
  steps 4+ are blocked."
- **Recurring task**: If the task is something done repeatedly, suggest
  creating a workflow: "This task pattern recurs. Consider using
  `/sc:workflow` to formalize it."
- **Underspecified task**: "The task description lacks enough detail to create
  a reliable plan. Clarify: {specific questions}."

## Next Steps
After creating a task plan, the user may want to:
- Begin executing the first step.
- `/sc:spawn` -- Further decompose any XL steps.
- `/sc:save` -- Persist the plan for future sessions.
- `/sc:test` -- Plan the testing strategy in detail.
- `/sc:spec-panel` -- Review the approach before starting implementation.

## Examples

### Example 1: Feature Task
```
User: /sc:task Add pagination to the /api/users endpoint

Agent:
Task: Add Pagination to /api/users Endpoint

Objective: Add cursor-based pagination to the existing /api/users endpoint.

Execution Plan:
  Phase 1: Preparation
  - [ ] STEP-01 (S): Read current /api/users handler and query logic.
  - [ ] STEP-02 (XS): Check if pagination utilities exist in the codebase.
  > CHECKPOINT: Understand current implementation fully.

  Phase 2: Implementation
  - [ ] STEP-03 (M): Add cursor parameter parsing to the route handler.
  - [ ] STEP-04 (M): Modify the database query to support cursor-based pagination.
  - [ ] STEP-05 (S): Add pagination metadata to the response envelope.
  > CHECKPOINT: Manual test with curl to verify pagination works.

  Phase 3: Verification
  - [ ] STEP-06 (M): Write unit tests for cursor parsing and query modification.
  - [ ] STEP-07 (M): Write integration test for full pagination flow.
  > CHECKPOINT: All tests pass.

  Phase 4: Finalization
  - [ ] STEP-08 (S): Update API documentation with pagination parameters.
  - [ ] STEP-09 (XS): Clean up and prepare for code review.

Effort Summary: ~3.5 hours (with 30% buffer)
```

### Example 2: Bug Fix Task
```
User: /sc:task Fix the race condition in the session cleanup job

Agent: [produces plan focusing on reproduction, root cause analysis,
  fix implementation, and regression testing]
```

### Example 3: Underspecified Task
```
User: /sc:task authentication

Agent: The task description lacks enough detail to create a reliable plan.
Please clarify:
  - Are you implementing new authentication or fixing existing auth?
  - What auth method (OAuth2, JWT, session-based, API key)?
  - What is the scope (backend only, full stack, single endpoint)?
```

## Argument Handling

The `$ARGUMENTS` string should contain the task description.

| Argument Pattern | Description |
|------------------|-------------|
| `<task description>` | Free-form description of the task |
| `--compact` | Output the compact plan format |
| `--no-estimates` | Skip effort estimation |
| `--from-save=<file>` | Load task from a saved session |

If `$ARGUMENTS` is empty, ask the user to describe the task.

## Quality Checklist
Before finalizing the plan, verify:
- [ ] Every step starts with a verb and is actionable.
- [ ] Every step has a clear deliverable.
- [ ] Dependencies are respected in the ordering.
- [ ] Checkpoints exist at natural pause points.
- [ ] XL steps are flagged for further decomposition.
- [ ] Risks are identified with mitigations.
- [ ] The total effort estimate includes a buffer.
- [ ] Optional steps are clearly marked.

## User Task
$ARGUMENTS
