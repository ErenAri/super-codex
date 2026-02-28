# SuperCodex v1.0 Implementation Backlog

This backlog is scoped to ship a measurable v1.0 "best alternative for Codex project workflows" release.

## Success Metrics (Release Gate)

- Task completion: `+15%` vs Codex baseline on benchmark suite.
- Speed: `-25%` median time to first passing test.
- Quality: `<=5%` behavioral regression rate.
- Safety: `0` destructive config incidents.
- Reliability: `>=99.5%` command success across Windows/macOS/Linux.
- Adoption: `>=3` pilot teams with week-4 retention.

## Milestone Plan

- `M0 (Weeks 1-2)`: Evaluation harness and baseline.
- `M1 (Weeks 3-6)`: Prompt/workflow system hardening.
- `M2 (Weeks 5-8)`: MCP catalog + doctor maturity.
- `M3 (Weeks 7-10)`: Team-scale policy and deterministic project behavior.
- `M4 (Weeks 9-12)`: Reliability, release channels, and v1.0 gate.

## Issues

### SC-001: Build benchmark harness runner (baseline vs supercodex)
- Priority: `P0`
- Milestone: `M0`
- Owner: `Core`
- Scope: Add CLI-invokable harness to run a task corpus in two modes: plain Codex and SuperCodex.
- Deliverables:
  - `benchmarks/harness.ts`
  - `benchmarks/tasks/*.json`
  - `npm run bench`
- Acceptance criteria:
  - Running `npm run bench` produces structured results for both modes.
  - Each run records task id, mode, duration, pass/fail, and output location.
  - Results are deterministic for identical inputs and seeds.

### SC-002: Add benchmark scoring and report generation
- Priority: `P0`
- Milestone: `M0`
- Owner: `Core`
- Dependencies: `SC-001`
- Scope: Compute success/speed/quality deltas and emit machine-readable + human-readable reports.
- Deliverables:
  - `benchmarks/scorecard.ts`
  - `benchmarks/results/*.json`
  - `benchmarks/results/latest.md`
- Acceptance criteria:
  - Scorecard includes all release-gate metrics.
  - Report compares baseline vs supercodex in one table.
  - CI can fail when thresholds are not met.

### SC-003: Curate task corpus (50-80 real-world tasks)
- Priority: `P0`
- Milestone: `M0`
- Owner: `Core`
- Scope: Define representative coding tasks across backend/frontend/data/debug.
- Deliverables:
  - `benchmarks/tasks/README.md`
  - `benchmarks/tasks/*.json`
- Acceptance criteria:
  - At least 50 tasks, each with objective pass criteria.
  - Coverage includes bugfix, refactor, feature, migration, and review.
  - No task requires private external services.

### SC-004: Expand prompt-pack into tiered packs
- Priority: `P0`
- Milestone: `M1`
- Owner: `Prompt`
- Scope: Add built-in packs: `general`, `backend`, `frontend`, `data`, `incident`.
- Deliverables:
  - `src/prompts.ts` updates
  - prompt files under prompt-pack directory
  - docs in `README.md`
- Acceptance criteria:
  - `install` lays down all tiered packs.
  - `status` reports installed pack inventory.
  - Backward compatibility: existing prompt names continue to work.

### SC-005: Add workflow-intent commands for common project loops
- Priority: `P0`
- Milestone: `M1`
- Owner: `Core`
- Scope: Add stable command surface for `research`, `brainstorm`, `implement`, `verify`, `ship`.
- Deliverables:
  - command registry additions
  - CLI command handlers
  - alias mapping updates
- Acceptance criteria:
  - Commands resolve to deterministic run contexts.
  - Commands support `--json` and respect project/user defaults.
  - Existing `/sc:*` aliases remain non-breaking.

### SC-006: Strengthen mode/persona compatibility enforcement
- Priority: `P0`
- Milestone: `M1`
- Owner: `Core`
- Scope: Hard-fail truly invalid combinations; keep warning-only for advisory mismatches.
- Deliverables:
  - validation policy in registry/doctor/validate
  - strict and non-strict behavior docs
- Acceptance criteria:
  - `validate --strict` fails on all policy-violating warnings.
  - Runtime blocks invalid command/mode/persona combinations.
  - Error messages provide actionable remediation.

### SC-007: Add dry-run explain mode for mutating commands
- Priority: `P1`
- Milestone: `M1`
- Owner: `Core`
- Scope: Add `--dry-run --explain` behavior to install/uninstall/mcp add/remove/init.
- Deliverables:
  - option handling in mutating commands
  - deterministic preview output
- Acceptance criteria:
  - No file modifications occur in dry-run mode.
  - Output lists exact paths/keys that would change.
  - Preview output is stable for identical inputs.

### SC-008: MCP manifest schema versioning
- Priority: `P0`
- Milestone: `M2`
- Owner: `MCP`
- Scope: Introduce schema version fields for catalog/server definitions.
- Deliverables:
  - schema types + validators
  - migration utility hooks
- Acceptance criteria:
  - Old manifests are accepted or cleanly migrated.
  - Validation errors include schema version context.
  - Schema version is surfaced in status output.

### SC-009: MCP migration tooling (`mcp migrate`)
- Priority: `P1`
- Milestone: `M2`
- Owner: `MCP`
- Dependencies: `SC-008`
- Scope: Add deterministic conversion from older schema versions.
- Deliverables:
  - `supercodex mcp migrate`
  - backup-first migration behavior
- Acceptance criteria:
  - Creates backup before writing.
  - Idempotent repeated runs.
  - Emits no-op message when already current.

### SC-010: Doctor remediation previews and rollback hints
- Priority: `P0`
- Milestone: `M2`
- Owner: `Doctor`
- Scope: Improve `doctor --fix` to show per-fix preview and rollback guidance.
- Deliverables:
  - fix plan output model
  - rollback hint strings per fix class
- Acceptance criteria:
  - `doctor --fix --json` reports applied/skipped with reason.
  - All fix types include rollback guidance.
  - Existing safe-fix guarantees remain intact.

### SC-011: MCP auth/connectivity diagnostics classification
- Priority: `P1`
- Milestone: `M2`
- Owner: `Doctor`
- Scope: Distinguish DNS/auth/network/protocol/config failures in MCP checks.
- Deliverables:
  - richer issue ids and messages
  - docs for remediation playbook
- Acceptance criteria:
  - `mcp doctor --connectivity` emits classified errors.
  - At least 5 common failure classes are covered by tests.

### SC-012: Catalog trust metadata (source/hash/updated/risk)
- Priority: `P1`
- Milestone: `M2`
- Owner: `MCP`
- Scope: Add trust metadata fields and validate them.
- Deliverables:
  - catalog type updates
  - list/show output updates
- Acceptance criteria:
  - `catalog show` includes trust metadata.
  - Invalid trust metadata fails validation.

### SC-013: Project policy layer (`.codex/policy.toml`)
- Priority: `P0`
- Milestone: `M3`
- Owner: `Core`
- Scope: Add policy allow/deny controls for modes/personas/mcp servers/commands.
- Deliverables:
  - policy parser + runtime enforcement
  - policy docs and examples
- Acceptance criteria:
  - Disallowed operations fail with clear policy reason.
  - Policy is read from project root and merged predictably.
  - Non-policy projects continue current behavior.

### SC-014: Project lockfile for deterministic team behavior
- Priority: `P0`
- Milestone: `M3`
- Owner: `Core`
- Scope: Add `.codex/supercodex.lock` for pinned registry/packs/catalog metadata.
- Deliverables:
  - lockfile writer/reader
  - update command (`supercodex lock refresh`)
- Acceptance criteria:
  - Same repo + lockfile yields same resolved context across machines.
  - Lock refresh is explicit and diffable.

### SC-015: Template presets for common project types
- Priority: `P1`
- Milestone: `M3`
- Owner: `Core`
- Scope: Add preset-aware init templates (`api-service`, `web-app`, `library`, `monorepo`).
- Deliverables:
  - `supercodex init --preset <name>`
  - preset docs
- Acceptance criteria:
  - Presets generate additive project config.
  - Existing project files are preserved unless explicitly forced.

### SC-016: CI mode for non-interactive automation
- Priority: `P1`
- Milestone: `M3`
- Owner: `Core`
- Scope: Add `--ci` behavior with strict exit codes and machine output.
- Deliverables:
  - CI mode docs
  - command output normalization
- Acceptance criteria:
  - No interactive prompts in CI mode.
  - Exit codes are stable and documented.
  - JSON output includes command id, status, and reasons.

### SC-017: Cross-platform CI matrix hardening
- Priority: `P0`
- Milestone: `M4`
- Owner: `Infra`
- Scope: Run build/test/e2e on Windows/macOS/Linux and Node LTS versions.
- Deliverables:
  - CI workflow config
  - flaky-test tracking
- Acceptance criteria:
  - Matrix passes for 14 consecutive days.
  - Platform-specific failures are classified and triaged within 24h.

### SC-018: Property/fuzz tests for merge/uninstall safety
- Priority: `P0`
- Milestone: `M4`
- Owner: `Core`
- Scope: Add generative tests for config merge/uninstall invariants.
- Deliverables:
  - fuzz/property test suite
  - invariant docs
- Acceptance criteria:
  - No test case produces destructive overwrite behavior.
  - Idempotency and scoped-removal invariants are enforced.

### SC-019: Release channels and migration checks
- Priority: `P1`
- Milestone: `M4`
- Owner: `Release`
- Scope: Add `stable`/`canary` release process with pre-publish migration checks.
- Deliverables:
  - release scripts
  - channel docs
- Acceptance criteria:
  - Canary publishes on demand.
  - Stable release requires green migration checks.

### SC-020: Pilot program + adoption telemetry
- Priority: `P0`
- Milestone: `M4`
- Owner: `PM`
- Scope: Run 3 pilot teams with opt-in usage telemetry and weekly scorecards.
- Deliverables:
  - pilot playbook
  - telemetry schema and anonymization rules
- Acceptance criteria:
  - 3 active pilot teams complete 4 weeks.
  - Weekly reports include retention and satisfaction trend.
  - Telemetry is opt-in and documented.

## Priority Order for Immediate Execution

1. `SC-001`, `SC-002`, `SC-003` (prove impact early).
2. `SC-004`, `SC-005`, `SC-006` (product core advantage).
3. `SC-010`, `SC-013`, `SC-014`, `SC-017`, `SC-018` (safety and team readiness).
4. Remaining `P1` issues for polish and scale.

## Definition of Done (Global)

- Feature merged with tests and docs.
- No regression in install/uninstall/merge safety guarantees.
- Added to benchmark scorecard if feature can affect task outcomes.
- Meets cross-platform behavior expectations on CI.
