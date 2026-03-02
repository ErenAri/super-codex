# SuperCodex Flag System

## Overview

Flags are shorthand modifiers that can be appended to any command invocation.
They translate into mode overrides, MCP server activations, or reasoning depth
adjustments without requiring the user to specify full `--mode` or `--persona`
options.

## Flag Categories

### Mode Flags

Mode flags activate a specific operating mode for the duration of the command.

| Flag          | Activates Mode   | Description                          |
|---------------|------------------|--------------------------------------|
| --brainstorm  | brainstorming    | Non-presumptive idea exploration     |
| --research    | deep-research    | Systematic investigation mode        |
| --manage      | task-management  | Plan/Phase/Task/Todo hierarchy       |
| --orchestrate | orchestration    | Multi-tool optimization mode         |
| --efficient   | token-efficiency | 30-50% token reduction strategies    |
| --business    | business-panel   | Multi-expert business analysis       |
| --introspect  | introspection    | Self-analysis with thinking visible  |

### Depth Flags

Depth flags control the reasoning budget allocated to the command.

| Flag          | Budget    | Description                              |
|---------------|-----------|------------------------------------------|
| --think       | high      | Extended reasoning for complex problems   |
| --ultrathink  | maximum   | Maximum depth for critical decisions      |

**Mutual Exclusion:** `--think` and `--ultrathink` cannot be used together.

### MCP Flags

MCP flags activate specific MCP servers for the duration of the command.

| Flag  | Activates        | Description                            |
|-------|------------------|----------------------------------------|
| --c7  | context7         | Enable Context7 documentation server   |
| --seq | sequential       | Enable Sequential thinking server      |

## Usage

Flags can be appended to any `/sc:*` command or `run` subcommand:

```bash
supercodex /sc:research --think "How does React Server Components work?"
supercodex run analyze --ultrathink --codex-home ~/.codex
supercodex /sc:brainstorming --brainstorm "New feature ideas"
```

## Conflict Resolution

1. If a flag conflicts with an explicit `--mode` option, the explicit option wins.
2. If two conflicting flags are used together, the command fails with an error.
3. If a flag activates a mode that is incompatible with the command, a warning
   is issued but the command proceeds.

## Flag Composition

Multiple non-conflicting flags can be combined:

```bash
supercodex /sc:research --think --c7 "Database optimization strategies"
```

This activates extended reasoning AND the Context7 MCP server.

## Defining Custom Flags

Custom flags can be defined in registry overlay files:

```toml
[flags.my-custom-flag]
flag = "--my-flag"
category = "mode"
description = "Activate my custom mode"
activates_mode = "my-custom-mode"
```

## Implementation Notes

Flags are preprocessed before command dispatch. The `preprocessFlags()` function
in `alias-dispatch.ts` translates flag arguments into standard `--mode` and
`--persona` options that the command handlers already understand. This means
commands do not need to be aware of the flag system directly.
