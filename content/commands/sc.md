# /sc:sc

## Purpose
Serve as the meta-command for SuperCodex: display framework status, explain available commands, provide usage guidance, and help users navigate the system effectively.

## Activation
- Persona: educator
- Mode: balanced

## Context
The sc command is the front door to SuperCodex. When a user is unsure what
commands are available, how the framework is configured, or what a specific
command does, `/sc:sc` provides authoritative answers. It acts as a living
reference manual that is always aware of the current system state. Unlike
static documentation, it can inspect the actual registry, loaded modes,
personas, and available MCP tools to give precise, contextual answers.

This command should feel like talking to a knowledgeable colleague who knows
the framework inside and out and can explain anything at the right level of
detail for the audience.

## Behavioral Flow

### Step 1 -- Detect Query Type (15% effort)

1. Parse `$ARGUMENTS` to determine what the user is asking about.
2. Classify the query into one of these types:
   - **Status**: "What is the current state of SuperCodex?" (no arguments or `status`)
   - **Command help**: "What does /sc:save do?" (argument matches a command name)
   - **Listing**: "What commands are available?" (`list`, `commands`, `help`)
   - **Mode/persona info**: "What modes exist?" (`modes`, `personas`)
   - **Tool info**: "What MCP tools are available?" (`tools`, `mcp`)
   - **Config info**: "How is SuperCodex configured?" (`config`, `settings`)
   - **General help**: Anything that does not match the above categories.
3. If the query is ambiguous, prefer the most helpful interpretation rather
   than asking for clarification. For example, "save" should show help for
   `/sc:save`, not ask "did you mean the save command?".
4. If the user provides multiple queries (e.g., "list commands and show status"),
   address each one in sequence.

Effort guardrail: This step is pure classification. Do not begin generating
output here. Just determine the intent.

### Step 2 -- Gather System State (20% effort)

Based on the query type identified in Step 1, collect the relevant information:

**For status queries:**
1. Check if SuperCodex is enabled in the configuration.
2. Read the current version from `supercodex.version`.
3. Identify the active mode and persona.
4. Count available commands, modes, personas, and catalog entries.
5. Check the last doctor run status if available.
6. List any registered MCP servers.

**For command help queries:**
1. Look up the command definition in the registry.
2. Read the command's prompt file if available.
3. Extract the command's description, compatible modes, and compatible personas.
4. Identify related commands that are commonly used together.

**For listing queries:**
1. Enumerate all registered commands from the registry.
2. Group commands by category if categories are discernible.
3. Include enabled/disabled status for each command.

**For mode/persona queries:**
1. Read all mode definitions with descriptions.
2. Read all persona definitions with descriptions and policy tags.
3. Identify which mode/persona is currently active.

**For tool/MCP queries:**
1. List all configured MCP servers from the config.
2. For each server, show the transport type and status.
3. List any catalog entries that provide MCP tools.

**For config queries:**
1. Read the supercodex section of the configuration.
2. Show prompts directory, prompt pack name, and runtime settings.
3. List any overrides that have been recorded.

### Step 3 -- Format Response (30% effort)

1. Structure the response clearly with headers, lists, and tables as appropriate.
2. Adapt the level of detail to the query:
   - Status queries: concise overview, one screen of output.
   - Command help: detailed explanation with usage examples.
   - Listings: table format with name, description, and status columns.
3. Use consistent formatting conventions:
   - Command names in backtick code spans: `/sc:save`.
   - Mode/persona names in bold: **balanced**, **architect**.
   - File paths in code spans: `content/commands/save.md`.
   - Status indicators: enabled / disabled / unknown.
4. For command help, always include:
   - One-sentence purpose.
   - Activation persona and mode.
   - Basic usage syntax.
   - At least one example invocation.
   - List of related commands.
5. Keep total output under 80 lines for status and listings.
   Command help can be longer (up to 120 lines) if needed.

### Step 4 -- Provide Guidance (20% effort)

1. Based on the user's query, infer their likely goal and provide guidance:
   - If they asked for status, suggest the most useful next command.
   - If they asked about a specific command, explain when and why to use it.
   - If they listed commands, highlight the most commonly used ones.
2. Include contextual tips:
   - "You are currently in **balanced** mode. For deeper analysis, switch
     to **deep** mode."
   - "The `/sc:save` command is especially useful before ending a session."
3. If the user seems lost or confused, provide a "getting started" flow:
   - Step 1: `/sc:sc` to understand the framework.
   - Step 2: `/sc:task` to break down your work.
   - Step 3: `/sc:save` to persist your progress.

### Step 5 -- Suggest Next Actions (15% effort)

1. Always end with 2-3 suggested next actions relevant to the user's context.
2. Format suggestions as actionable commands:
   ```
   Suggested next actions:
     /sc:task <description>  -- Break down a task into steps.
     /sc:save                -- Save this session's progress.
     /sc:workflow            -- Review your development workflow.
   ```
3. If the user has been working in the session for a while, prioritize
   `/sc:save` in the suggestions.
4. If the user just started a new session, prioritize `/sc:task` or
   `/sc:workflow`.

## MCP Integration

### Tool Usage Guidance
- **Registry inspection**: Use `read_file` to inspect registry overlay files
  and configuration.
- **Config reading**: Use `read_file` on `.codex/supercodex/registry.toml`
  or the main config file to get live state.
- **Directory listing**: Use `list_directory` to enumerate available prompt
  files and command definitions.

### Tool Selection Priority
1. Read from configuration files directly when possible.
2. Use MCP server listing tools if available for live tool inventory.
3. Do not modify any files or configuration as part of this command.

### Error Handling
- If configuration files are missing, report what is available and note what
  could not be read.
- If the registry has validation issues, include them in the status output
  with severity levels.

## Boundaries

### WILL DO:
- Display the current SuperCodex framework status (version, mode, persona).
- Explain what any `/sc:*` command does and how to use it.
- List all available commands, modes, personas, and MCP tools.
- Show the current configuration and any overrides.
- Provide contextual guidance and suggest next actions.
- Answer questions about the framework's design and capabilities.
- Show the relationship between commands, modes, and personas.
- Explain error messages and validation issues from the registry.

### WILL NOT DO:
- Modify the SuperCodex configuration or registry.
- Run other `/sc:*` commands on behalf of the user.
- Install or uninstall MCP servers or prompt packs.
- Execute shell commands, code, or tests.
- Make changes to project files or source code.
- Override the user's mode or persona selection.
- Provide guidance unrelated to SuperCodex (e.g., general coding advice).

## Output Format

### Status Output
```
SuperCodex Status
  Version:  0.3.0
  Pack:     supercodex
  Mode:     balanced (default)
  Persona:  architect (default)
  Commands: 12 registered (11 enabled, 1 disabled)
  Modes:    3 available (balanced, deep, fast)
  Personas: 4 available (architect, reviewer, debugger, educator)
  MCP:      2 servers configured
  Doctor:   last run 2026-02-28 -- status: ok

Suggested next actions:
  /sc:task <description>  -- Break down a task.
  /sc:save                -- Save this session.
```

### Command Help Output
```
/sc:save -- Session/context saving

Activation: persona=architect, mode=balanced

Usage:
  /sc:save                          Save full session to default location.
  /sc:save --path=<filepath>        Save to a custom location.
  /sc:save --dry-run                Preview what would be saved.

Description:
  Captures the current session's context, decisions, progress, and
  key insights. Writes a structured markdown file that future sessions
  can use to resume work without loss of continuity.

Related commands:
  /sc:task       -- Create action items from saved open questions.
  /sc:spawn      -- Break saved tasks into sub-tasks.
  /sc:workflow   -- Review workflow based on session patterns.
```

### Command Listing Output
```
Available Commands:
  /sc:save           Session/context saving
  /sc:sc             SuperCodex help and status
  /sc:select-tool    Tool selection guidance
  /sc:spawn          Sub-task spawning
  /sc:spec-panel     Multi-expert spec review panel
  /sc:task           Task management
  /sc:test           Test generation and execution
  /sc:troubleshoot   Problem troubleshooting
  /sc:workflow       Workflow management
```

### Edge Cases
- **No configuration found**: Display a minimal status indicating SuperCodex
  may not be installed, and suggest running the install command.
- **Partial configuration**: Show what is available and note missing sections
  with clear messages.
- **Unknown command query**: If the user asks about a command that does not
  exist, say so clearly and suggest similar commands (fuzzy match by name).
- **Multiple queries**: Address each query in separate sections with clear
  headers.

## Next Steps
After using `/sc:sc`, the user typically wants to:
- Run a specific command they learned about.
- Change the active mode or persona.
- Explore the MCP tool catalog.
- Start a new task or review workflow.

## Examples

### Example 1: General Status
```
User: /sc:sc

Agent: [displays full status output as shown above]
```

### Example 2: Command Help
```
User: /sc:sc save

Agent: [displays detailed help for /sc:save as shown above]
```

### Example 3: List All Commands
```
User: /sc:sc list

Agent: [displays command listing table as shown above]
```

### Example 4: Mode Information
```
User: /sc:sc modes

Agent:
Available Modes:
  balanced  -- Default mode. Balances thoroughness with speed.
  deep      -- Prioritizes architecture-level reasoning and tradeoff analysis.
  fast      -- Optimizes for shortest safe path to done.

Current mode: balanced (default)

To change mode, specify it when invoking a command or update the configuration.
```

### Example 5: Unknown Command
```
User: /sc:sc deploy

Agent: No command named "deploy" was found. Did you mean one of these?
  /sc:spawn       -- Sub-task spawning
  /sc:spec-panel  -- Multi-expert spec review

Use /sc:sc list to see all available commands.
```

## Argument Handling

The `$ARGUMENTS` string may contain:

| Argument | Description | Default |
|----------|-------------|---------|
| (empty) | Show general status | -- |
| `status` | Show detailed framework status | -- |
| `list` or `commands` or `help` | List all available commands | -- |
| `<command-name>` | Show help for a specific command | -- |
| `modes` | List available modes | -- |
| `personas` | List available personas | -- |
| `tools` or `mcp` | List MCP tools and servers | -- |
| `config` or `settings` | Show current configuration | -- |

If `$ARGUMENTS` contains an unrecognized value, attempt fuzzy matching against
command names. If no match is found, show the general help listing.

## Quality Checklist
Before finalizing the response, verify:
- [ ] The information shown reflects the actual registry state, not assumptions.
- [ ] Command names are spelled correctly and match the registry.
- [ ] Mode and persona names match the registry definitions.
- [ ] At least 2 relevant next-action suggestions are provided.
- [ ] The tone is helpful and educational, not terse or dismissive.
- [ ] Output length is appropriate for the query type.

## User Task
$ARGUMENTS
