# /sc:select-tool

## Purpose
Analyze a given task and recommend the most appropriate MCP tools, CLI tools, or libraries to accomplish it, with clear rationale for each recommendation.

## Activation
- Persona: architect
- Mode: balanced

## Context
Modern development environments offer an abundance of tools: MCP servers expose
structured capabilities, CLI tools provide shell-level automation, and language
libraries offer programmatic access. Choosing the wrong tool wastes time,
introduces unnecessary complexity, or creates maintenance burdens. The
select-tool command applies structured evaluation to recommend the best tool
for a specific task, considering the user's environment, constraints, and the
nature of the work.

This command is especially valuable when the user faces a task that could be
approached multiple ways (e.g., file manipulation via MCP vs. shell vs. a
scripting library) or when they need to discover tools they may not know about.

## Behavioral Flow

### Step 1 -- Understand Task (20% effort)

1. Parse `$ARGUMENTS` to extract the task description.
2. If the task description is vague, ask one targeted clarifying question.
   Examples of vague inputs and appropriate clarifications:
   - "I need to process files" -- "What kind of processing? Reading, transforming,
     searching, or writing? What file formats?"
   - "database stuff" -- "Are you looking for a database client, migration tool,
     query builder, or monitoring tool?"
3. Identify the key requirements of the task:
   - **Input**: What data or resources does the task consume?
   - **Output**: What does the task produce?
   - **Environment**: Where will the tool run (local, CI, server)?
   - **Constraints**: Performance, security, compatibility requirements.
   - **Frequency**: One-time task or recurring workflow?
4. Determine the task category:
   - File operations (read, write, search, transform).
   - Code analysis (lint, type-check, complexity analysis).
   - Testing (unit, integration, e2e, coverage).
   - Data processing (parse, transform, validate, aggregate).
   - API interaction (HTTP, GraphQL, gRPC).
   - Infrastructure (deploy, monitor, scale).
   - Documentation (generate, validate, publish).
   - Version control (diff, merge, history analysis).

### Step 2 -- Enumerate Available Tools (20% effort)

1. Survey the available tool landscape in three tiers:

   **Tier 1 -- MCP Tools (preferred)**
   - Check the SuperCodex registry catalog for installed MCP servers.
   - List relevant tools exposed by each server.
   - Note the transport type (stdio/http) and availability status.
   - Flag any tools that require environment variables or credentials.

   **Tier 2 -- CLI Tools**
   - Identify CLI tools commonly available in the user's environment.
   - Consider the platform (check if running on Windows, macOS, or Linux).
   - Note installation requirements for tools not yet installed.
   - Prefer tools that are widely adopted and well-maintained.

   **Tier 3 -- Libraries and Frameworks**
   - Identify language-specific libraries relevant to the task.
   - Consider the project's existing dependency stack to avoid bloat.
   - Prefer libraries with active maintenance and large user bases.
   - Note license compatibility if relevant.

2. For each tool, capture:
   - Name and version (if known).
   - What it does (one sentence).
   - How it is invoked (MCP tool call, shell command, import).
   - Known limitations or caveats.

### Step 3 -- Evaluate Fit (25% effort)

1. Score each candidate tool against these evaluation criteria:

   | Criterion | Weight | Description |
   |-----------|--------|-------------|
   | Task Fit | 30% | How well does the tool address the specific task? |
   | Availability | 20% | Is the tool already installed/configured? |
   | Reliability | 15% | Is the tool stable and well-tested? |
   | Simplicity | 15% | How easy is it to use for this task? |
   | Integration | 10% | How well does it integrate with the current workflow? |
   | Maintenance | 10% | Is the tool actively maintained? |

2. Apply these evaluation rules:
   - **MCP tools get a bonus** for Availability and Integration since they are
     already part of the SuperCodex ecosystem.
   - **Penalize over-engineering**: If a simple shell command suffices, do not
     recommend a complex framework.
   - **Penalize new dependencies**: If the project does not use Python, do not
     recommend a Python library for a one-off task.
   - **Reward composability**: Tools that work well with other tools in the
     pipeline score higher on Integration.

3. Disqualify tools that:
   - Have known security vulnerabilities (if this information is available).
   - Require licenses incompatible with the project.
   - Are deprecated or unmaintained (no updates in 2+ years).
   - Cannot run in the user's environment.

### Step 4 -- Rank Options (20% effort)

1. Produce a ranked list of the top 3-5 tools, ordered by overall score.
2. For each tool, provide:
   - **Rank and name**.
   - **Overall score** (qualitative: excellent / good / adequate).
   - **Primary strength**: Why this tool stands out.
   - **Primary weakness**: The main limitation.
   - **Usage example**: A concrete one-liner or code snippet showing how to
     invoke the tool for the user's specific task.
3. If two tools are equally scored, rank the simpler one higher.
4. If the top recommendation is significantly better than the rest, say so
   explicitly: "This is the clear best choice."
5. If no tool is clearly superior, present the tradeoff: "Choose X for speed,
   Y for flexibility, Z for long-term maintainability."

### Step 5 -- Recommend with Rationale (15% effort)

1. Provide a clear, final recommendation:
   - "For this task, I recommend **Tool X** because [primary reason]."
2. Explain when the user should consider the alternatives:
   - "If you need [specific feature], use **Tool Y** instead."
   - "If you want to avoid adding dependencies, use **Tool Z**."
3. Include any setup steps if the recommended tool is not yet configured:
   - MCP server: "Add to your configuration with `/sc:sc config`."
   - CLI tool: Provide the install command for the user's platform.
   - Library: Provide the package manager command (`npm install`, `pip install`, etc.).
4. Note any caveats or gotchas:
   - "This tool requires Node.js 18+."
   - "This MCP server needs the GITHUB_TOKEN environment variable."

## MCP Integration

### Tool Usage Guidance
- **Registry inspection**: Use `read_file` to inspect the SuperCodex registry
  catalog and determine which MCP tools are available.
- **Config reading**: Read the main configuration file to check for installed
  MCP servers and their status.
- **Shell probing**: If needed, use shell commands like `which` or `where` to
  check if CLI tools are installed.

### Tool Selection Priority
1. Inspect the MCP catalog first -- this is the most reliable source of
   available tools.
2. Check the local environment for CLI tools.
3. Reference known library ecosystems based on the project's language stack.

### Error Handling
- If the registry is unavailable, note this and proceed with CLI/library
  recommendations only.
- If the user's platform cannot be determined, provide cross-platform options.

## Boundaries

### WILL DO:
- Recommend MCP tools, CLI tools, and libraries for specific tasks.
- Evaluate tools against structured criteria with clear rationale.
- Provide usage examples for recommended tools.
- Explain tradeoffs between competing tool options.
- Identify tools already available in the user's environment.
- Suggest setup steps for tools not yet installed.
- Consider platform compatibility and project constraints.
- Rank multiple options with clear differentiation.

### WILL NOT DO:
- Install tools, packages, or dependencies.
- Modify project configuration or dependency files.
- Run tools or execute commands on behalf of the user.
- Recommend tools based on marketing claims rather than technical merit.
- Dismiss simple solutions in favor of complex frameworks.
- Recommend proprietary tools when open-source alternatives are adequate.
- Make purchasing decisions or recommend paid services without flagging the cost.
- Override the user's existing tool preferences without strong justification.

## Output Format

### Standard Recommendation Output
```
Task: {task description}

Recommendation: **{Tool Name}**
  Reason: {primary reason for recommendation}
  Usage:  {one-liner example}

Alternatives:
  1. {Tool B} -- {strength} / {weakness}
  2. {Tool C} -- {strength} / {weakness}

Setup (if needed):
  {installation or configuration steps}

Notes:
  {caveats, platform requirements, environment variables}
```

### Detailed Comparison Output (when requested or when choice is close)
```
Task: {task description}

| Tool | Fit | Availability | Reliability | Simplicity | Score |
|------|-----|-------------|-------------|------------|-------|
| Tool A | excellent | installed | stable | easy | best |
| Tool B | good | needs install | stable | moderate | good |
| Tool C | adequate | installed | beta | easy | adequate |

Recommendation: Tool A
  {detailed rationale}

When to choose Tool B instead:
  {scenario}

When to choose Tool C instead:
  {scenario}
```

### Edge Cases
- **No suitable tool exists**: Say so clearly: "No existing tool fully
  addresses this task. Consider building a custom script. Here is a starting
  approach: ..."
- **Too many viable options**: Focus on top 3 and provide the comparison
  table to help the user decide.
- **Task is too broad**: Ask the user to narrow the scope: "This task
  spans multiple concerns. Which aspect should I focus on: X, Y, or Z?"
- **Tool is installed but misconfigured**: Note the configuration issue and
  provide steps to fix it.

## Next Steps
After receiving a tool recommendation, the user may want to:
- `/sc:task` -- Plan the work using the recommended tool.
- `/sc:test` -- Write tests that exercise the tool integration.
- `/sc:troubleshoot` -- Debug issues with tool setup or usage.
- `/sc:sc tools` -- Review all available MCP tools.

## Examples

### Example 1: File Search Task
```
User: /sc:select-tool I need to find all TypeScript files that import a specific module

Agent:
Task: Find TypeScript files importing a specific module.

Recommendation: **ripgrep (rg)**
  Reason: Fastest file content search, handles large codebases, respects .gitignore.
  Usage:  rg "import.*{module}" --type ts

Alternatives:
  1. grep MCP tool -- Good integration but slower on large repos.
  2. ast-grep -- Understands AST structure, better for complex import patterns.

Notes: ripgrep is already available in your environment. For AST-aware
  searching, ast-grep requires separate installation.
```

### Example 2: API Testing
```
User: /sc:select-tool I need to test a REST API with authentication

Agent:
Task: Test authenticated REST API endpoints.

Recommendation: **httpie** (CLI) or **rest-client MCP** (if configured)
  ...
```

## Argument Handling

The `$ARGUMENTS` string should contain a description of the task for which
the user needs tool recommendations.

| Argument Pattern | Description |
|------------------|-------------|
| `<task description>` | Free-form description of the task |
| `--detailed` | Request the full comparison table |
| `--mcp-only` | Restrict recommendations to MCP tools only |
| `--cli-only` | Restrict recommendations to CLI tools only |
| `--lib-only` | Restrict recommendations to libraries only |

If `$ARGUMENTS` is empty, ask the user to describe their task.

## Quality Checklist
Before finalizing recommendations, verify:
- [ ] At least one recommendation is provided.
- [ ] Each recommendation includes a concrete usage example.
- [ ] Tradeoffs are clearly stated, not hidden.
- [ ] Platform compatibility has been considered.
- [ ] Existing project dependencies have been checked.
- [ ] No tool is recommended solely because it is popular.

## User Task
$ARGUMENTS
