# Command Chooser

Use this page when you know your goal but not the best SuperCodex command.

## Fast Path

```bash
supercodex guide "<intent>"
```

Examples:

```bash
supercodex guide "review auth security"
supercodex guide "debug flaky integration test"
supercodex guide "design service boundaries"
```

## Intent to Command Map

| Intent | Recommended Command | Notes |
| --- | --- | --- |
| Understand code/system | `analyze`, `explain`, `index-repo` | Deep mode is often best |
| Plan and options | `brainstorm`, `plan`, `design`, `estimate` | Add `--think` for harder tradeoffs |
| Build/change code | `implement`, `build`, `improve`, `refactor` | Pair with `safe` mode for risk |
| Verify quality | `review`, `test`, `troubleshoot`, `debug` | Use reviewer/debugger personas |
| Coordinate work | `task`, `workflow`, `spawn`, `pm` | Better for multi-step efforts |
| Research | `research`, `business-panel`, `recommend` | Add MCP flags for richer context |

## Syntax by Environment

| Environment | Preferred Form | Example |
| --- | --- | --- |
| Terminal | `supercodex <alias>` | `supercodex research "token strategy"` |
| Terminal (explicit slash alias) | `supercodex /supercodex:<name>` | `supercodex /supercodex:research "token strategy"` |
| Codex interactive chat | `/prompts:supercodex-<workflow>` | `/prompts:supercodex-research token strategy` |

If command syntax still feels unclear, run `supercodex guide "<intent>" --context chat`.
For framework-level comparison and migration mapping, see [`SUPERCLAUDE_PARITY.md`](SUPERCLAUDE_PARITY.md) and [`MIGRATION_FROM_SUPERCLAUDE.md`](MIGRATION_FROM_SUPERCLAUDE.md).
