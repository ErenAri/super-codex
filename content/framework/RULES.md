# SuperCodex Framework Rules

## Behavioral Rules

These rules govern agent behavior across all commands, modes, and personas.
Rules are non-negotiable constraints that override persona preferences.

### Rule 1: Read Before Write

Before modifying any file, the agent MUST read and understand:
- The file's current contents
- Its role in the broader codebase
- Any conventions established by surrounding code
- Import/export relationships

Violation: Writing to a file without having read it first.

### Rule 2: Checkpoint Discipline

Every behavioral flow has defined checkpoints. The agent MUST:
- Produce the checkpoint artifact before proceeding to the next phase
- Not skip phases even when the answer seems obvious
- Explicitly note when a phase produces no actionable output

Violation: Jumping from Phase 1 to Phase 3 without completing Phase 2.

### Rule 3: Scope Containment

The agent MUST NOT expand scope beyond the declared boundaries:
- Only modify files listed in the implementation plan
- Only address issues within the current command's domain
- Flag out-of-scope issues as notes rather than acting on them

Violation: Refactoring a utility function while fixing an unrelated bug.

### Rule 4: Backup Before Mutation

Before any operation that modifies persistent state:
- Configuration files must be backed up with timestamps
- The backup must be verified before proceeding
- The backup path must be reported to the user

Violation: Overwriting config.toml without creating a backup.

### Rule 5: Conflict Preservation

When merging configurations, existing user values take precedence:
- Never silently overwrite user customizations
- Record desired values in override sections for later application
- Report all conflicts with clear resolution guidance

Violation: Replacing a user's custom mode definition during install.

### Rule 6: Deterministic Output

Given the same inputs, the agent SHOULD produce the same output:
- Avoid randomized selections without explicit user request
- Sort lists alphabetically for consistent ordering
- Use stable formatting for generated content

Violation: Producing different alias ordering on consecutive runs.

### Rule 7: Error Transparency

All errors must be:
- Reported with clear, actionable messages
- Accompanied by the context that caused them
- Linked to potential fixes or diagnostic commands
- Never silently swallowed

Violation: Catching an error and continuing without reporting it.

### Rule 8: Registry Validation

All registry data must be validated before use:
- Mode and persona references must resolve to defined entries
- Alias targets must reference valid command IDs
- Catalog entries must have required transport fields
- Overlay files must parse without errors

Violation: Using an alias that references a non-existent mode.

### Rule 9: Idempotent Operations

Running the same operation twice MUST produce the same result:
- Install is idempotent (second run reports no changes)
- Configuration merges are stable
- Prompt file writes use content comparison

Violation: Duplicate entries appearing after repeated installs.

### Rule 10: Version Tracking

All managed artifacts must track their version:
- Configuration includes the SuperCodex version that created it
- Catalog entries track their catalog version
- Doctor state records the timestamp of the last check

Violation: Losing track of which version installed a configuration.

## Interaction Rules

### Rule 11: Ask, Don't Assume

When requirements are ambiguous:
- Ask at most 2 clarifying questions
- If the answer is reasonably inferable, proceed with stated assumptions
- Never block indefinitely on missing information

### Rule 12: Explain, Don't Dictate

When presenting recommendations:
- Provide rationale for every suggestion
- Present alternatives when they exist
- Let the user make the final decision

### Rule 13: Warn, Don't Block

When encountering non-critical issues:
- Warn the user about potential problems
- Allow operations to proceed unless safety is at risk
- Aggregate warnings in doctor reports for later review
