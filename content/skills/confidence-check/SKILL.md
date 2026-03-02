# Skill: Confidence Check

## Overview

The Confidence Check skill is a pre-implementation assessment protocol that ensures
the agent has sufficient understanding and confidence before proceeding with code
modifications. It acts as a quality gate between analysis and implementation phases.

## Activation

This skill is triggered:
- Before any implementation phase (build, implement, refactor)
- Before any code modification that affects more than 3 files
- When explicitly requested by the user
- When the agent detects high uncertainty in requirements

## Protocol

### Step 1: Self-Assessment

The agent evaluates its confidence across five dimensions:

| Dimension              | Weight | Question                                           |
|------------------------|--------|----------------------------------------------------|
| Requirements Clarity   | 25%    | Do I fully understand what needs to be built?       |
| Codebase Understanding | 25%    | Do I understand the relevant code well enough?      |
| Approach Confidence    | 20%    | Am I confident in my chosen implementation approach?|
| Risk Awareness         | 15%    | Have I identified the key risks and edge cases?     |
| Test Strategy          | 15%    | Do I know how to verify this works correctly?       |

### Step 2: Score Calculation

Each dimension is scored 0-100:
- **90-100**: High confidence. Clear understanding, no significant unknowns.
- **70-89**: Moderate confidence. Some unknowns but manageable.
- **50-69**: Low confidence. Significant gaps that need addressing.
- **0-49**: Very low confidence. Major unknowns, should not proceed.

The overall score is the weighted average of all five dimensions.

### Step 3: Decision

| Overall Score | Decision                                          |
|---------------|---------------------------------------------------|
| >= 90%        | PROCEED. Begin implementation.                    |
| 70-89%        | PROCEED WITH CAUTION. Note uncertainties.         |
| 50-69%        | PAUSE. Address gaps before proceeding.            |
| < 50%         | STOP. Gather more information or ask the user.    |

### Step 4: Gap Resolution

When the score is below 90%, the agent must:

1. Identify the lowest-scoring dimensions
2. For each gap, determine the specific unknowns
3. Take targeted actions to resolve gaps:
   - **Requirements gaps**: Ask the user clarifying questions (max 2)
   - **Codebase gaps**: Read additional files to build understanding
   - **Approach gaps**: Consider alternative approaches and evaluate tradeoffs
   - **Risk gaps**: Enumerate potential failure modes and mitigations
   - **Test gaps**: Define the test strategy before implementing
4. Re-score after gap resolution
5. If still below threshold, report the assessment and ask for user guidance

## Output Format

```markdown
### Confidence Check

| Dimension              | Score | Notes                              |
|------------------------|-------|------------------------------------|
| Requirements Clarity   | {n}%  | {brief explanation}                |
| Codebase Understanding | {n}%  | {brief explanation}                |
| Approach Confidence    | {n}%  | {brief explanation}                |
| Risk Awareness         | {n}%  | {brief explanation}                |
| Test Strategy          | {n}%  | {brief explanation}                |
| **Overall**            | {n}%  | **{PROCEED / PAUSE / STOP}**      |

{If gaps exist:}
### Gaps to Address
1. {Gap description and resolution plan}
2. {Gap description and resolution plan}
```

## Configuration

- `required_confidence`: The minimum overall score to proceed (default: 90%)
- `enabled`: Whether the skill is active (default: true)

## Integration with Commands

Commands that trigger this skill:
- `/sc:build` - Before Phase 3 (Implement Core)
- `/sc:implement` - Before Phase 3 (Code Incrementally)
- `/sc:refactor` - Before Phase 3 (Refactor one seam at a time)

The confidence check runs automatically between the design/planning phase
and the implementation phase of these commands.

## Edge Cases

### Time-Sensitive Tasks
If the user explicitly requests speed (fast mode), the confidence threshold
is lowered to 70% but the check still runs. The assessment is included in
output but does not block execution.

### Trivial Changes
For changes affecting only 1-2 files with clear requirements, the confidence
check is simplified to a single-line assertion rather than the full protocol.

### Repeated Checks
If the confidence check has been run within the same session for the same
task and the score was >= 90%, it is not repeated unless the task scope
has changed.
