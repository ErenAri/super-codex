# SuperCodex v2.0 Implementation Backlog

Baseline date: 2026-03-06

This backlog is scoped for a v2 cycle focused on command quality, first-run UX, and adoption growth.

## Success Metrics (Release Gate)

- Command quality: `>=95` average quality score with `0` command-quality errors in strict verification.
- First-run UX: `>=98%` successful `supercodex start --yes` completion across Windows/macOS/Linux.
- Reliability: `>=99.7%` CI pass rate on test matrix (including temp-file heavy suites).
- Time-to-value: median user reaches first successful `/prompts:supercodex-*` run in `<60s`.
- Adoption: `+250%` npm weekly downloads vs v1 baseline.
- Retention: `>=35%` 4-week retention for new users.

## Milestone Plan

- `M5 (Weeks 1-3)`: Command quality engine and deterministic regression gates.
- `M6 (Weeks 4-6)`: First-run onboarding and diagnostics UX.
- `M7 (Weeks 7-9)`: Team workflows, templates, and release automation upgrades.
- `M8 (Weeks 10-12)`: Growth loop, telemetry insights, and v2 release gate.

## Strategic Pillars (Requested V2 Scope)

1. **Framework kernel primitives**
2. **Doctor/verify safety gates**
3. **Minimal parity workflow loop (core 10)**
4. **Core agents first (6)**
5. **Policy-first modes (4)**
6. **Framework-grade distribution/docs**
7. **Scalable test harness**
8. **Universal MCP strategy**

## Issues

### SC2-001: Command golden output fixtures and regression tests
- Priority: `P0`
- Milestone: `M5`
- Owner: `Core`
- Scope: Add stable fixtures for high-traffic commands (`analyze`, `implement`, `research`, `guide`) and snapshot assertions.
- Acceptance criteria:
  - Golden fixtures cover JSON and plain output variants.
  - CI fails on unexpected output contract drift.
  - Fixtures are easy to refresh intentionally.

### SC2-002: Prompt quality lint command
- Priority: `P0`
- Milestone: `M5`
- Owner: `Core`
- Scope: Add `supercodex quality prompts` command to expose per-command prompt quality checks directly.
- Acceptance criteria:
  - CLI output includes score, errors/warnings, and command-level breakdown.
  - JSON output is script-friendly for CI ingestion.
  - `verify --strict` and `quality prompts` share the same rule engine.

### SC2-003: Benchmark gate integration for PRs
- Priority: `P1`
- Milestone: `M5`
- Owner: `Infra`
- Scope: Add optional benchmark smoke in CI with threshold checks and artifact upload.
- Acceptance criteria:
  - PR workflow can run benchmark smoke mode on demand.
  - Scorecard diff is attached to CI artifacts.
  - Threshold breach produces actionable failure message.

### SC2-004: Start wizard for onboarding
- Priority: `P0`
- Milestone: `M6`
- Owner: `UX`
- Scope: Add guided interactive wizard for `supercodex start` with quick path to first prompt command.
- Acceptance criteria:
  - Wizard supports non-interactive fallback (`--yes`, `--json`, CI-safe behavior).
  - Wizard recommends one best next command with copy-ready syntax.
  - Wizard detects missing prompt wrappers and repairs deterministically.

### SC2-005: Doctor explain plan and fix previews
- Priority: `P0`
- Milestone: `M6`
- Owner: `Doctor`
- Scope: Add `doctor --explain` and richer `doctor --fix` previews with rollback hints.
- Acceptance criteria:
  - Every fixable issue includes before/after and rollback hint.
  - `--json` response includes actionable plan array.
  - No change to safe-fix boundaries.

### SC2-006: Unified quick actions in command output
- Priority: `P1`
- Milestone: `M6`
- Owner: `UX`
- Scope: Standardize "next commands" format across `start`, `doctor`, `verify`, and `guide`.
- Acceptance criteria:
  - Outputs use consistent command ordering and phrasing.
  - Plain and decorated output parity is preserved.
  - CLI contract tests cover the shared shape.

### SC2-007: Opt-in anonymous telemetry events
- Priority: `P1`
- Milestone: `M7`
- Owner: `PM`
- Scope: Expand telemetry to conversion and retention events with explicit opt-in controls.
- Acceptance criteria:
  - Telemetry remains disabled by default unless explicitly enabled.
  - Event schema is documented and privacy-safe.
  - Local export command is available for user inspection.

### SC2-008: Project templates and team presets
- Priority: `P1`
- Milestone: `M7`
- Owner: `Core`
- Scope: Add reusable presets for `api-service`, `web-app`, `library`, and `monorepo`.
- Acceptance criteria:
  - Presets are additive and non-destructive.
  - Preset docs include expected command packs and policy defaults.
  - Teams can version-control preset output with lock refresh.

### SC2-009: Release train automation (weekly canary, stable gate)
- Priority: `P1`
- Milestone: `M7`
- Owner: `Release`
- Scope: Define weekly canary and gated stable promotion with checklist automation.
- Acceptance criteria:
  - Canary tag/release can run from workflow dispatch.
  - Stable promotion requires strict verification and test pass.
  - Release notes are generated from structured changelog fragments.

### SC2-010: Growth funnel instrumentation and experiments
- Priority: `P0`
- Milestone: `M8`
- Owner: `Growth`
- Scope: Track install -> start -> first command -> week-1 retention funnel and run conversion experiments.
- Acceptance criteria:
  - Funnel dashboard is updated weekly.
  - At least 3 conversion experiments are run during v2 cycle.
  - Winning experiment is merged before v2 release.

### SC2-011: Comparative landing docs (SuperClaude parity and deltas)
- Priority: `P1`
- Milestone: `M8`
- Owner: `Docs`
- Scope: Publish clear comparison docs and migration guide from adjacent frameworks.
- Acceptance criteria:
  - Includes feature parity matrix and migration examples.
  - Includes command syntax guidance (`/prompts:*` vs CLI alias forms).
  - Linked from README.

### SC2-012: Windows filesystem reliability hardening
- Priority: `P0`
- Milestone: `M8`
- Owner: `Core`
- Scope: Reduce flaky `ENOTEMPTY`/`EBUSY` cleanup failures with retry/backoff helpers in tests and temp cleanup paths.
- Acceptance criteria:
  - Flaky cleanup failures reduced to near zero in CI.
  - Helper utilities are shared across test suites.
  - No regression in test runtime >20%.

### SC2-013: Framework kernel registry contracts
- Priority: `P0`
- Milestone: `M5`
- Owner: `Core`
- Scope: Formalize kernel primitives: command registry, agent registry, mode policy engine, session state contract, and tool/MCP capability layer.
- Acceptance criteria:
  - Machine-readable schemas are defined and versioned.
  - Registries include output contracts and permission metadata.
  - Kernel snapshot command/API is available for diagnostics and tooling.

### SC2-014: Doctor/verify trust-gate expansion
- Priority: `P0`
- Milestone: `M6`
- Owner: `Doctor`
- Scope: Add trust checks for API keys, MCP connectivity, sandbox/approval policy, and deterministic replay readiness.
- Acceptance criteria:
  - `doctor` surfaces all gate statuses in one report.
  - `verify --safety-gates` can enforce gates in CI.
  - Failures include explicit remediation guidance.

### SC2-015: Core 10 workflow profile
- Priority: `P0`
- Milestone: `M5`
- Owner: `UX`
- Scope: Define and expose a minimal parity workflow profile of 10 loop commands before advanced expansion.
- Acceptance criteria:
  - `profile show core` exposes all 10 loop steps.
  - Start/guide flows can recommend the core loop first.
  - Advanced command surface remains available for power users.

### SC2-016: Core 6 agent profile
- Priority: `P0`
- Milestone: `M6`
- Owner: `Core`
- Scope: Center onboarding around 6 job-to-be-done agents (planner, implementer, reviewer, test fixer, security auditor, docs writer).
- Acceptance criteria:
  - Core agent profile is documented and queryable.
  - Agent list supports filtering by profile.
  - Guidance defaults to core profile for new users.

### SC2-017: Core 4 mode policy bundles
- Priority: `P0`
- Milestone: `M6`
- Owner: `Core`
- Scope: Publish and enforce 4 primary policy bundles: fast, safe, deep, research.
- Acceptance criteria:
  - Each mode has explicit policy intents and guardrails.
  - Safe mode enforces stricter write/test review behavior.
  - Guide/start defaults map intents to these 4 first.

### SC2-018: Framework-grade onboarding docs and file map
- Priority: `P1`
- Milestone: `M7`
- Owner: `Docs`
- Scope: Add `PROJECT_INDEX.md`, upgrade guide, and starter template docs for quick session onboarding.
- Acceptance criteria:
  - New sessions can navigate project structure from one index file.
  - Versioned upgrade notes are published each release.
  - Templates repo/docs are linked from README.

### SC2-019: Snapshot/golden harness hardening
- Priority: `P0`
- Milestone: `M7`
- Owner: `Infra`
- Scope: Expand golden outputs, prompt snapshots, and sandbox integration tests for release confidence.
- Acceptance criteria:
  - Golden and snapshot suites run in CI on every PR.
  - Temporary git/sandbox integration tests cover write safety paths.
  - Verify gate is mandatory for release workflows.

### SC2-020: Universal MCP connector strategy
- Priority: `P1`
- Milestone: `M8`
- Owner: `MCP`
- Scope: Keep MCP client-agnostic and ship official connectors for git, code search, issues, and docs retrieval.
- Acceptance criteria:
  - Connector interface is stable and documented.
  - At least 4 official connectors are available with health diagnostics.
  - Capability discovery works consistently across transports.

## Immediate Execution Order (Sprint 1)

1. `SC2-013` framework kernel contracts.
2. `SC2-014` doctor/verify trust gates.
3. `SC2-015` core 10 workflow profile.
4. `SC2-001` command golden fixtures.
5. `SC2-012` Windows filesystem reliability hardening.

## Definition of Done (Global)

- Feature includes tests, docs, and strict verification compatibility.
- No regression in install/uninstall safety guarantees.
- JSON output contracts are version-safe and documented.
- Cross-platform behavior validated in CI.
