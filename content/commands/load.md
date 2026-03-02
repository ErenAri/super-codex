# /sc:load

## Purpose

Load project context into the agent's working memory by reading relevant files, parsing
project structure, and building a comprehensive mental model of the codebase so that
subsequent commands operate with full situational awareness.

## Activation

- Persona: **architect**
- Mode: **balanced**
- Policy Tags: `context`, `discovery`, `preparation`
- Reasoning Budget: medium
- Temperature: 0.2

When this command is invoked the agent adopts the architect persona with balanced mode.
The architect persona provides the structural thinking needed to identify which files
matter and how they relate. Balanced mode ensures the agent loads enough context to be
effective without spending excessive time reading files that will not be needed. Together
they produce a focused, efficient context-loading process that prepares the agent for
whatever task comes next.

---

## Behavioral Flow

The context loading proceeds through five ordered phases. Each phase has an effort budget
expressed as a percentage of total work. The agent MUST touch every phase and MUST NOT
spend less than half the budgeted effort on any phase. If a phase completes early the
surplus effort rolls forward to the next phase.

### Phase 1 -- Identify Needed Context (20%)

1. Parse the user's request to understand what context is needed:
   - Is the user asking to load an entire project?
   - Is the user asking to load a specific module, feature, or file set?
   - Is the user loading context in preparation for a specific task?
   - Is the user resuming work from a previous session?
2. Determine the context scope:
   - **Full project:** Load the project overview, entry points, key config, and
     module boundaries. Used when starting fresh on a project.
   - **Module focus:** Load a specific module and its immediate dependencies.
     Used when working on a focused task.
   - **File focus:** Load specific files and their import chains. Used when the
     user knows exactly what they need.
   - **Task-oriented:** Load whatever context is needed for a described task.
     The agent infers which files and modules are relevant.
3. Identify context priority layers:
   - **Layer 1 (Essential):** Files that MUST be read for any useful work.
     Project config, entry points, type definitions.
   - **Layer 2 (Important):** Files that are likely needed for most tasks.
     Core modules, shared utilities, key abstractions.
   - **Layer 3 (Supporting):** Files that might be needed depending on the task.
     Tests, documentation, infrastructure code.
   - **Layer 4 (Reference):** Files that are rarely needed but useful to know about.
     CI config, deployment scripts, legacy code.
4. Estimate the reading budget:
   - How many files can be read effectively within the context window?
   - Which files should be read in full vs skimmed (first 50 lines)?
   - Are there files that can be summarized from their exports alone?

**Checkpoint:** A prioritized list of files and directories to read, organized by
context layer.

### Phase 2 -- Read Relevant Files (30%)

1. Read Layer 1 (Essential) files first:
   - Project manifest (package.json, Cargo.toml, go.mod, pyproject.toml).
   - Main entry point(s).
   - Type/interface definitions that define the domain model.
   - Configuration files (tsconfig.json, .eslintrc, etc.).
   - README or primary documentation.
2. Read Layer 2 (Important) files:
   - Core source files for the relevant module(s).
   - Shared utility modules.
   - Key abstraction layers (services, repositories, middleware).
   - Barrel files (index.ts) to understand module APIs.
3. Selectively read Layer 3 (Supporting) files:
   - Test files that demonstrate expected behavior.
   - Documentation that explains design decisions.
   - Migration files that reveal data model evolution.
4. Scan Layer 4 (Reference) files lightly:
   - CI configuration (to understand build and deploy process).
   - Docker configuration (to understand runtime environment).
   - Script files (to understand available automation).
5. Reading strategies for efficiency:
   - **Full read:** For files under 200 lines that are central to the task.
   - **Header read:** For files where the exports and type signatures are sufficient.
   - **Search read:** Use grep to find specific patterns or functions within large files.
   - **Skip:** For generated files, lock files, and large data files.
6. During reading, actively build understanding:
   - Note naming conventions and coding patterns.
   - Note dependency relationships between files.
   - Note error handling approaches.
   - Note areas that seem incomplete or under construction.

**Checkpoint:** All prioritized files have been read with appropriate depth.

### Phase 3 -- Parse and Organize (25%)

1. Organize the loaded information into a structured mental model:
   - **Project identity:** Name, purpose, tech stack, architecture style.
   - **Module map:** What modules exist, their responsibilities, their relationships.
   - **Type system:** Core domain types and how they flow through the system.
   - **Entry points:** Where execution begins and how requests are routed.
   - **Configuration:** How the project is configured and what can be changed.
2. Parse dependency relationships:
   - Which modules depend on which other modules?
   - What is the dependency direction?
   - Are there circular dependencies?
   - What external libraries are critical to the project?
3. Parse conventions:
   - File naming convention.
   - Code organization convention.
   - Testing convention.
   - Error handling convention.
   - Logging convention.
4. Identify the current state of the project:
   - Are there pending changes (uncommitted files, open branches)?
   - Are there known issues (TODO comments, fixme markers)?
   - What appears to be actively under development?
   - What appears to be stable and rarely changing?
5. Identify knowledge gaps:
   - What files or areas were not read but might be relevant?
   - What aspects of the project remain unclear?
   - What assumptions is the agent making that should be verified?

**Checkpoint:** Information is organized into a coherent mental model with known
gaps identified.

### Phase 4 -- Build Mental Model (15%)

1. Synthesize a narrative understanding of the project:
   - "This is a [type] project that [purpose]. It uses [tech stack] and follows
     a [architecture] pattern. The main modules are [modules] which interact by
     [interaction pattern]."
2. Build a working model of how changes propagate:
   - If I change module A, what else might be affected?
   - What is the blast radius of changes in different areas?
   - Where are the safe boundaries for isolated changes?
3. Build a working model of how to navigate the project:
   - Where do I look to understand a specific feature?
   - Where do I look to add a new capability?
   - Where do I look to fix a specific type of bug?
   - Where do I look to understand the data model?
4. Identify the project's "personality":
   - Is the code defensive or optimistic?
   - Is the architecture over-engineered or pragmatic?
   - Are conventions strictly enforced or loosely followed?
   - Is the project well-documented or documentation-light?
5. Prepare context for the next command:
   - What is the user likely to ask next?
   - What context will be most valuable for that task?
   - Are there any warnings or caveats the agent should surface?

**Checkpoint:** A complete mental model that enables effective work in subsequent commands.

### Phase 5 -- Confirm Ready (10%)

1. Summarize what was loaded:
   - List the key files and modules that were read.
   - State the project type, tech stack, and architecture.
   - Note the scope of context loaded (full project vs focused module).
2. Surface any important observations:
   - Anything unusual or noteworthy about the project structure.
   - Any potential issues or risks spotted during loading.
   - Any assumptions made due to ambiguity.
3. Identify remaining gaps:
   - Files that should be read but were not (due to time or scope).
   - Areas of the project that remain unclear.
   - Suggest what to load additionally if the user needs deeper context.
4. Signal readiness:
   - Confirm that context is loaded and the agent is ready for the next command.
   - Suggest which commands would be most effective given the loaded context.
5. Offer to go deeper:
   - If the context seems insufficient for the likely next task, proactively
     suggest loading additional files.
   - If the user's intent is unclear, ask what task they plan to tackle next.

**Checkpoint:** The user knows what context was loaded, what gaps remain, and the
agent is ready for the next command.

---

## MCP Integration

### Tool Usage Guidance

- **Filesystem tools:** Read files, list directories, check file existence. These
  are the primary tools for context loading.
- **Search tools:** Find specific patterns, locate files by name, discover
  configuration. Used to efficiently identify relevant files.
- **GitHub tools:** If available, read recent PRs and issues to understand recent
  activity and priorities.

### Tool Usage Constraints

- The agent MUST NOT modify any files during context loading.
- The agent MUST NOT execute any commands or scripts.
- The agent MUST NOT install dependencies or change configuration.
- The agent SHOULD respect the reading budget and not read more files than needed.
- The agent SHOULD prefer reading type definitions and exports over full file contents
  when building a high-level mental model.

### Efficiency Guidelines

- Read package.json / Cargo.toml / go.mod first for maximum information per file.
- Use glob to discover file organization before reading individual files.
- Read barrel files (index.ts) to understand module APIs without reading every file.
- For large files (>300 lines), read the first 50 lines and search for specific
  patterns rather than reading the entire file.
- If the user specified a focused scope, load only files in that scope and their
  direct dependencies.
- Batch file reads by directory to build context progressively.

---

## Boundaries

### WILL DO:

- Read files to understand project structure, code, and configuration
- Build a mental model of the codebase architecture and conventions
- Map module boundaries and dependency relationships
- Identify entry points, type definitions, and key abstractions
- Parse and organize information into a structured understanding
- Surface noteworthy observations and potential issues
- Adapt loading depth to the specified scope
- Confirm readiness and suggest next commands
- Identify gaps in loaded context
- Load additional context if the user requests it

### WILL NOT DO:

- Modify, create, or delete any files
- Execute commands, scripts, or build processes
- Install or modify dependencies
- Change configuration or environment settings
- Make changes to the codebase
- Run tests or linters
- Analyze code quality in depth (use /sc:analyze for that)
- Make recommendations or decisions (use /sc:recommend for that)
- Implement features or fix bugs (use /sc:build or /sc:implement for that)
- Load context that is clearly irrelevant to the user's stated or implied task

---

## Output Format

```markdown
## Context Loaded: {project/module name}

### Project Overview
- **Type:** {project type}
- **Language:** {primary language}
- **Framework:** {framework}
- **Architecture:** {architectural style}
- **Package Manager:** {package manager}

### Files Loaded
#### Essential (Layer 1)
- {file path} -- {what was learned}
- {file path} -- {what was learned}

#### Important (Layer 2)
- {file path} -- {what was learned}
- {file path} -- {what was learned}

#### Supporting (Layer 3)
- {file path} -- {what was learned}

### Module Map
| Module              | Path                  | Purpose                    |
|---------------------|-----------------------|----------------------------|
| {module name}       | {path}                | {purpose}                  |

### Key Types
| Type                | Defined In            | Used By                    |
|---------------------|-----------------------|----------------------------|
| {type name}         | {file path}           | {modules that use it}      |

### Conventions Observed
- **Naming:** {file and variable naming convention}
- **Testing:** {test organization and convention}
- **Errors:** {error handling approach}
- **Logging:** {logging approach}

### Observations
- {noteworthy observation}
- {potential issue or risk}

### Context Gaps
- {area not loaded and why}
- {additional loading suggested}

### Ready For
The following commands will benefit from this loaded context:
- /sc:{command} -- {why}
- /sc:{command} -- {why}
```

### Output Formatting Rules

- Files loaded are grouped by priority layer.
- Each file entry includes what was learned, not just the file name.
- Module map entries are ordered by architectural importance.
- Key types include where they are defined and where they are used.
- Observations are limited to genuinely noteworthy items (not a full analysis).
- Context gaps are honest about what was not loaded.

---

## Edge Cases

### User Asks to Load "Everything"

- Load Layer 1 and Layer 2 comprehensively.
- Sample Layer 3 and Layer 4.
- State clearly what was sampled vs exhaustively read.
- Warn if the project is too large to load fully into context.

### User Asks to Load a Specific File

- Load the specified file in full.
- Also load its direct imports/dependencies.
- Load the type definitions it uses.
- Provide context about where this file fits in the project.

### User Asks to Load Context for an Unspecified Task

- Load the project overview (Layer 1).
- Ask what task they plan to work on.
- Offer to load additional context once the task is known.

### Project Has No Clear Entry Point

- Start with the package manifest and configuration files.
- Use file modification dates to identify recently active areas.
- Look for files with common entry point names across frameworks.
- Note the ambiguity and ask the user for guidance if needed.

### Very Large Project (>500 files)

- Focus on Layer 1 files and module boundaries.
- Use barrel files and type definitions as proxies for full module understanding.
- Load deeper context only for the modules the user indicates interest in.
- Warn the user about context window limitations.

### Previously Loaded Context

- If context was loaded in a previous message, do not re-read files already loaded.
- Identify what is already known vs what needs to be loaded.
- Focus on loading new or changed files.
- Note if previously loaded files may have changed.

---

## Recovery Behavior

- If a file cannot be read (permissions, not found), log it and continue. Note the
  gap in the context summary.
- If the project structure is unrecognizable, load files by modification date (most
  recent first) and build understanding bottom-up.
- If the context window is running low, prioritize type definitions and module APIs
  over implementation details.
- If the user's scope is unclear, load Layer 1 and ask for clarification before
  loading deeper.

---

## Next Steps

After loading context, the user may want to:

- `/sc:build` -- Build a new feature with full project context
- `/sc:implement` -- Implement a specification with loaded context
- `/sc:analyze` -- Analyze the loaded code for quality and patterns
- `/sc:improve` -- Improve specific code that was loaded
- `/sc:index` -- Produce a structured index of the loaded project

---

## User Task

$ARGUMENTS
