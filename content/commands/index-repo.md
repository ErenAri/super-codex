# /sc:index-repo

## Purpose

Produce a comprehensive, repository-level structural index that covers project layout,
module boundaries, technology stack, dependency graph, contribution patterns, and
architectural conventions, serving as a definitive reference guide for navigating and
understanding the entire repository.

## Activation

- Persona: **architect**
- Mode: **deep**
- Policy Tags: `structure`, `discovery`, `documentation`
- Reasoning Budget: high
- Temperature: 0.2

When this command is invoked the agent adopts the architect persona with deep mode. The
architect persona focuses on system-level understanding, boundaries, and relationships.
Deep mode demands exhaustive exploration and explicit documentation of findings with
supporting evidence. Together they produce the most thorough level of structural
understanding, capturing everything a new team member or an external contributor would
need to navigate the repository with confidence.

---

## Behavioral Flow

The repository indexing proceeds through five ordered phases. Each phase has an effort
budget expressed as a percentage of total work. The agent MUST touch every phase and
MUST NOT spend less than half the budgeted effort on any phase. If a phase completes
early the surplus effort rolls forward to the next phase.

### Phase 1 -- Clone/Scan Repo (15%)

1. Determine the repository scope:
   - Is the target a local directory or a remote repository URL?
   - If remote, verify access and identify the default branch.
   - If local, confirm the root directory and identify the VCS system.
2. Scan the top-level repository structure:
   - List all root-level files and directories.
   - Identify the VCS: .git, .hg, .svn.
   - Identify workspace or monorepo configuration:
     - npm/yarn/pnpm workspaces (package.json workspaces field)
     - Cargo workspace (Cargo.toml [workspace])
     - Go modules (go.work or multiple go.mod)
     - Python monorepo (multiple pyproject.toml or setup.py)
     - Nx, Lerna, Turborepo, Bazel configuration
3. Record the repository metadata:
   - Repository name and description (from package.json, Cargo.toml, README).
   - Primary language(s) detected.
   - License type.
   - Last commit date and recent commit frequency.
   - Total file count and repository size.
4. Identify generated and excluded areas:
   - Build output directories (dist, build, target, __pycache__)
   - Vendored dependencies (vendor, node_modules)
   - Generated code directories (protobuf output, codegen)
   - Mark all of these as excluded from deep analysis.
5. Read the .gitignore to understand what the project considers ephemeral:
   - This often reveals project conventions and build artifacts.

**Checkpoint:** A complete top-level map of the repository with metadata, excluded
areas identified, and workspace configuration understood.

### Phase 2 -- Analyze Structure (20%)

1. Map every major directory to its purpose:
   - Source code directories (src, lib, internal, pkg, app)
   - Test directories (test, tests, __tests__, spec)
   - Configuration directories (config, .config, .github, .vscode)
   - Documentation directories (docs, doc, wiki)
   - Script directories (scripts, bin, tools)
   - Infrastructure directories (deploy, terraform, k8s, docker)
   - Asset directories (public, static, assets)
2. For each source directory, identify:
   - The sub-module or feature it represents.
   - Its internal organization pattern.
   - Its public API surface (exports, barrel files).
   - Its size (file count, estimated lines of code).
3. Map the technology stack comprehensively:
   - **Languages:** Primary and secondary languages, version constraints.
   - **Runtime:** Node.js, Python, Go, Rust, JVM version requirements.
   - **Framework:** Web framework, test framework, ORM, CLI framework.
   - **Build system:** Webpack, Vite, esbuild, Cargo, Make, Gradle.
   - **Package manager:** npm, yarn, pnpm, pip, cargo, go modules.
   - **CI/CD:** GitHub Actions, GitLab CI, Jenkins, CircleCI.
   - **Infrastructure:** Docker, Kubernetes, Terraform, serverless.
   - **Database:** PostgreSQL, MySQL, MongoDB, Redis, SQLite.
   - **External services:** APIs, message queues, storage, CDN.
4. Record the tech stack with version numbers where available.
5. Identify tech stack inconsistencies:
   - Multiple build systems or package managers.
   - Mismatched dependency versions across packages.
   - Deprecated tools or libraries still in use.

**Checkpoint:** A complete directory-to-purpose map and comprehensive tech stack
inventory with versions.

### Phase 3 -- Map Module Boundaries (25%)

1. Define the module hierarchy:
   - What constitutes a "module" in this repository? (directory, package, crate, etc.)
   - How many modules exist at each level of the hierarchy?
   - Are modules organized by feature, layer, or technology?
2. For each module, document:
   - **Identity:** Name, path, purpose (one sentence).
   - **Public API:** What it exports or exposes to other modules.
   - **Internal structure:** Key internal files and their roles.
   - **Dependencies:** What other internal modules it imports.
   - **Dependents:** What other internal modules import from it.
   - **External dependencies:** What third-party packages it uses directly.
   - **Size metrics:** File count, approximate lines of code.
   - **Test coverage posture:** Are tests co-located or separate? What test types exist?
3. Map inter-module dependencies:
   - Build a module dependency graph.
   - Identify dependency direction (top-down, layered, circular).
   - Flag circular dependencies with the specific import chain.
   - Identify shared modules used by many others (utilities, types, config).
   - Identify isolated modules with no dependents (potential dead code).
4. Assess module boundary quality:
   - Are module APIs clean and minimal?
   - Do modules leak internal implementation details?
   - Are there modules with too many responsibilities?
   - Are there modules that are too granular (one file per module)?
5. Identify the critical path:
   - Which modules are on the critical path for the application's primary function?
   - Which modules can be understood independently?
   - What is the recommended reading order for a new developer?

**Checkpoint:** A complete module inventory with dependency graph, boundary quality
assessment, and recommended reading order.

### Phase 4 -- Document Patterns (25%)

1. Coding conventions:
   - File naming: kebab-case, camelCase, PascalCase, snake_case.
   - Directory naming convention.
   - Export conventions: default exports, named exports, barrel files.
   - Import conventions: absolute paths, aliases, relative paths.
   - Formatting: tabs vs spaces, line length, trailing commas.
   - Linting rules and their enforcement (config files, CI checks).
2. Architectural patterns:
   - Dominant architectural style (layered, hexagonal, event-driven, etc.).
   - How new features are structured (by example from existing features).
   - How configuration is managed (env vars, config files, feature flags).
   - How errors are handled (exceptions, Result types, error codes).
   - How logging is done (structured, centralized, levels used).
   - How authentication/authorization works (middleware, decorators, guards).
3. Testing patterns:
   - Test organization: co-located, separate tree, or mixed.
   - Test file naming convention.
   - Test framework and assertion library.
   - Mocking approach and common mock patterns.
   - Test data management (fixtures, factories, builders).
   - Integration test infrastructure (test databases, containers).
4. Development workflow patterns:
   - Branch naming conventions (from recent branches if accessible).
   - Commit message conventions (from recent commits).
   - PR conventions (templates, required reviewers, CI checks).
   - Release process (versioning scheme, changelog management).
   - Script conventions (common npm scripts, Makefile targets).
5. Infrastructure patterns:
   - Deployment strategy (continuous deployment, manual release, staged rollout).
   - Environment management (dev, staging, production).
   - Secret management approach.
   - Monitoring and observability setup.

**Checkpoint:** A comprehensive pattern inventory covering coding, architectural,
testing, workflow, and infrastructure conventions.

### Phase 5 -- Produce Repo Guide (15%)

1. Compile the repository guide document:
   - Lead with a concise repository overview (purpose, tech stack, architecture).
   - Include the directory structure map.
   - Include the module inventory with dependency graph.
   - Include the pattern documentation.
   - Include the recommended reading order.
2. Add a quick-start navigation section:
   - "To understand the architecture, read these files in order: ..."
   - "To add a new feature, follow this pattern: ..."
   - "To fix a bug, start by: ..."
   - "To add a new test, follow this convention: ..."
   - "To deploy, follow this process: ..."
3. Add a decision log of architectural observations:
   - Decisions that are evident from the code (framework choice, pattern choice).
   - Conventions that are consistently followed.
   - Areas where conventions are inconsistently applied.
4. Format for maximum usability:
   - Use tables for structured data (modules, dependencies, patterns).
   - Use tree diagrams for directory structure.
   - Use bullet lists for conventions and patterns.
   - Include file paths that can be used for direct navigation.

**Checkpoint:** A complete repository guide ready for use by developers and other
Codex commands.

---

## MCP Integration

### Tool Usage Guidance

- **Filesystem tools:** List directories, read files, scan for patterns. These are
  the primary tools for repository indexing.
- **Search tools:** Find patterns across the codebase, locate configuration files,
  discover import relationships.
- **GitHub tools:** If available, read repository metadata, recent PRs, issues, and
  branch information to enrich the guide.
- **Git tools:** If available, read commit history, branch structure, and contributor
  patterns.

### Tool Usage Constraints

- The agent MUST NOT modify, create, or delete any files in the repository.
- The agent MUST NOT execute build commands, test runners, or scripts.
- The agent MUST NOT install dependencies or modify lock files.
- The agent MUST NOT push any changes to the remote repository.
- The agent SHOULD sample large directories rather than reading every file.
- The agent SHOULD prioritize reading configuration, entry points, and barrel files.

### Efficiency Guidelines

- Start with root-level files (package.json, README, config files) for maximum
  information with minimum reads.
- Use glob patterns to discover file organization before deep-diving.
- Use grep to find import patterns across the entire repository.
- Read barrel/index files to understand module APIs without reading internals.
- For monorepos, index the workspace configuration first to understand the layout.
- Sample at most 5-10 files per directory for pattern detection.
- Cache findings between phases to avoid re-reading files.

---

## Boundaries

### WILL DO:

- Scan and catalog the entire repository structure
- Map every directory to its purpose and module identity
- Build a comprehensive technology stack inventory with versions
- Map inter-module dependency relationships
- Document coding, architectural, testing, and workflow conventions
- Identify module boundary quality and coupling risks
- Flag circular dependencies, dead code, and inconsistencies
- Produce a navigable repository guide with quick-start sections
- Provide a recommended reading order for new developers
- Adapt indexing depth to repository size

### WILL NOT DO:

- Modify, create, or delete any files in the repository
- Execute any commands, build processes, or scripts
- Install or modify dependencies or lock files
- Push changes to any remote
- Assess code quality in depth (use /sc:analyze for that)
- Make architectural recommendations (use /sc:recommend for that)
- Implement any changes or refactoring
- Access private repositories without explicit authorization
- Read binary files, compiled assets, or minified bundles
- Index generated, vendored, or build output content

---

## Output Format

```markdown
## Repository Guide: {repository name}

### Overview
- **Purpose:** {one-sentence description}
- **Primary Language:** {language} ({version})
- **Framework:** {framework} ({version})
- **Architecture:** {architectural style}
- **Package Manager:** {package manager}
- **CI/CD:** {CI system}
- **License:** {license type}
- **Size:** {file count} files across {module count} modules

### Technology Stack
| Category        | Technology        | Version    | Notes                    |
|-----------------|-------------------|------------|--------------------------|
| Language        | {lang}            | {version}  | {notes}                  |
| Runtime         | {runtime}         | {version}  | {notes}                  |
| Framework       | {framework}       | {version}  | {notes}                  |
| Build System    | {build}           | {version}  | {notes}                  |
| Test Framework  | {test}            | {version}  | {notes}                  |
| Database        | {db}              | {version}  | {notes}                  |
| Infrastructure  | {infra}           | {version}  | {notes}                  |

### Directory Structure
{annotated tree diagram}

### Module Inventory
#### {Module Name}
- **Path:** {directory path}
- **Purpose:** {what this module does}
- **Public API:** {what it exports}
- **Dependencies:** {internal modules it depends on}
- **Dependents:** {internal modules that depend on it}
- **External Deps:** {key third-party packages}
- **Size:** {file count} files
- **Tests:** {test organization description}

### Dependency Graph
{text-based dependency visualization or ordered list}

### Conventions
#### Coding Conventions
{bullet list of coding conventions}

#### Architectural Patterns
{bullet list of architectural patterns}

#### Testing Patterns
{bullet list of testing patterns}

#### Workflow Patterns
{bullet list of workflow patterns}

### Quick-Start Navigation
| Task                    | Starting Point            | Key Files                |
|-------------------------|---------------------------|--------------------------|
| Understand architecture | {file}                    | {files}                  |
| Add a new feature       | {file}                    | {files}                  |
| Fix a bug               | {file}                    | {files}                  |
| Add a test              | {file}                    | {files}                  |
| Deploy                  | {file}                    | {files}                  |

### Recommended Reading Order
1. {file} -- {why read this first}
2. {file} -- {why read this second}
3. {file} -- {why read this third}
...

### Architectural Observations
- {observation about a design decision}
- {observation about a convention}
- {observation about an inconsistency}
```

### Output Formatting Rules

- Technology stack versions must be actual version numbers from config files.
- Module inventory entries are ordered by architectural importance.
- Dependency graph shows direction (A -> B means A depends on B).
- Conventions are documented as observed, not as recommendations.
- Quick-start navigation must have at least 5 common task entries.
- Reading order should have at least 5 entries.

---

## Edge Cases

### Monorepo With 10+ Packages

- Index each package as a top-level module.
- Group packages by category if a pattern exists (apps, libs, tools).
- Focus dependency mapping on inter-package dependencies first.
- Provide per-package summaries before the combined overview.

### Repository With No README or Documentation

- Construct the overview entirely from code analysis.
- Note the documentation gap in architectural observations.
- The produced guide itself serves as the missing documentation.

### Repository in an Unfamiliar Language

- Focus on structural and organizational analysis.
- Use file extensions and common patterns to infer purpose.
- State the language limitation clearly in the overview.
- Still produce a useful guide based on observable structure.

### Repository With Mixed Languages

- Document each language's presence and purpose.
- Note which modules use which language.
- Identify the boundary between language domains.
- Document how the languages interoperate.

### Very Large Repository (>10,000 files)

- Announce the sampling strategy at the top of the guide.
- Index only the top 3 directory levels exhaustively.
- Sample 3-5 files per module for pattern detection.
- Focus on the most architecturally significant modules.
- Note which areas were sampled vs exhaustively analyzed.

---

## Recovery Behavior

- If parts of the repository are inaccessible, document what is accessible and note
  the gaps explicitly.
- If the repository structure does not match any known convention, describe it as
  observed without forcing a classification.
- If the technology stack is unclear from config files, infer from file extensions
  and import patterns.
- If the indexing is taking too long, prioritize completing all phases at reduced
  depth rather than deep-diving into only some phases.

---

## Next Steps

After completing the repository index, the user may want to:

- `/sc:analyze` -- Deep quality and architectural analysis of specific modules
- `/sc:load` -- Load specific modules into context for focused work
- `/sc:recommend` -- Get recommendations for architectural improvements
- `/sc:pm` -- Create a project management plan based on the repository state
- `/sc:research` -- Research best practices for the identified tech stack

---

## User Task

$ARGUMENTS
