# SuperClaude Parity and Deltas

This page explains where SuperCodex is behaviorally aligned with SuperClaude-style workflows, where it extends them, and where behavior intentionally differs.

Reference decision: [`docs/adr/0001-superclaude-compatibility-target.md`](adr/0001-superclaude-compatibility-target.md)

## Parity Scope

- SuperCodex targets **behavioral compatibility** for workflow intent and operator experience.
- SuperCodex does **not** target package/runtime identity.
- Comparison focus: commands, modes, agents, safety, onboarding, and release/operations ergonomics.

## Feature Parity Matrix

| Capability | SuperClaude-style expectation | SuperCodex implementation | Status | Migration note |
| --- | --- | --- | --- | --- |
| Workflow command surface | Rich command set for analyze/plan/build/review/debug/research flows | `run.*` workflows + alias dispatch + `guide` intent routing | parity | Keep intent, map execution syntax to SuperCodex forms |
| Command aliases | Slash-style alias invocation | `/supercodex:*`, `/sc:*`, `supercodex:*`, `sc:*`, and plain alias forms | parity+ | Terminal aliases are broader; interactive chat still uses `/prompts:*` |
| Codex interactive wrappers | Prompt wrappers for chat execution | Installs `/prompts:supercodex-*.md` wrappers | parity | Use `/prompts:supercodex-<workflow>` in chat |
| Modes and personas | First-class behavior modifiers | Registry-backed `mode` + `persona` with explicit policy metadata | parity+ | Existing mental model transfers; policy details become machine-checkable |
| Specialist agents | Agent-oriented workflow partitioning | Agent registry + profile filtering + core 6 defaults | parity+ | Core profile gives deterministic onboarding defaults |
| Safety/doctor verification | Trust checks and diagnostics | `doctor`, `verify --safety-gates`, lock/policy validation, strict gates | parity+ | Use strict verify in CI as release gate |
| Reproducible state | Predictable project/runtime behavior | Kernel export, lock file, metadata sync, deterministic quick-action contract | extended | Adds stronger automation hooks for tooling and CI |
| Team project presets | Team bootstrap conventions | `init --preset <id> --refresh-lock` with additive/non-destructive merge | extended | New capability; use for repo-level standardization |
| MCP integration | MCP server workflows | Catalog install, guided recommendations, health diagnostics | parity+ | Use `mcp guided` and `mcp doctor` for adoption |
| Release train automation | Repeatable release cadence | Dispatch lanes (`canary`/`stable`), preflight gates, fragment-based notes | extended | Use `release-train.yml` + changelog fragments |
| Growth instrumentation | Adoption funnel tracking | `growth funnel/events/experiments/dashboard` + weekly dashboard workflow | extended | New capability for v2 conversion/retention operations |

## Command Syntax Guidance

The most common migration confusion is command context.

| Context | Correct Syntax | Example |
| --- | --- | --- |
| Codex interactive chat | `/prompts:supercodex-<workflow>` | `/prompts:supercodex-research map migration risks` |
| Terminal (explicit alias) | `supercodex /supercodex:<alias>` | `supercodex /supercodex:research "map migration risks"` |
| Terminal (short explicit alias) | `supercodex /sc:<alias>` | `supercodex /sc:research "map migration risks"` |
| Terminal (plain alias) | `supercodex <alias>` | `supercodex research "map migration risks"` |
| Optional shell bridge | `sc <alias>` | `sc research "map migration risks"` |

Important:

- `/supercodex:*` and `/sc:*` are SuperCodex CLI alias parsers.
- Native Codex interactive custom commands are under `/prompts:*`.

## Practical Deltas to Plan For

1. Runtime policy is explicit and validated.
2. Safe mode can enforce stricter run requirements for write-capable workflows.
3. Lock, metadata, and policy checks are expected in CI for release safety.
4. Growth and release-train workflows are built-in, not ad-hoc.

## Related Docs

- [`MIGRATION_FROM_SUPERCLAUDE.md`](MIGRATION_FROM_SUPERCLAUDE.md)
- [`COMMAND_CHOOSER.md`](COMMAND_CHOOSER.md)
- [`COMMANDS.md`](COMMANDS.md)
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
