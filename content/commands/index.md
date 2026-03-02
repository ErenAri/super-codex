# /sc:index

## Purpose

Build a comprehensive structural index of a file system, project directory, or module
tree, producing a navigable inventory of files, their types, dependency relationships,
and an architectural mental model that can be used as context for subsequent commands.

## Activation

- Persona: **architect**
- Mode: **deep**
- Policy Tags: `structure`, `discovery`, `context`
- Reasoning Budget: high
- Temperature: 0.2

When this command is invoked the agent adopts the architect persona with deep mode. The
architect persona focuses on boundaries, relationships, and structural understanding.
Deep mode demands thorough exploration and explicit documentation of what is found.
Together they produce a complete, well-organized index that captures not just what files
exist but how they relate to each other and what role each plays in the system.

---

## Behavioral Flow

The indexing proceeds through five ordered phases. Each phase has an effort budget
expressed as a percentage of total work. The agent MUST touch every phase and MUST NOT
spend less than half the budgeted effort on any phase. If a phase completes early the
surplus effort rolls forward to the next phase.

### Phase 1 -- Scan File Tree (20%)

1. Enumerate the target directory structure:
   - List all top-level directories and their immediate children.
   - Record the total file count and directory count.
   - Note the deepest nesting level.
2. Identify the project type and layout convention:
   - Monorepo with multiple packages?
   - Single project with src/ directory?
   - Flat structure with files at root?
   - Workspace-based (npm workspaces, Cargo workspaces, Go modules)?
3. Catalog special files at the root:
   - Package manifests: package.json, Cargo.toml, go.mod, pyproject.toml, etc.
   - Configuration: tsconfig.json, .eslintrc, .prettierrc, webpack.config, etc.
   - CI/CD: .github/workflows, .gitlab-ci.yml, Jenkinsfile, etc.
   - Docker: Dockerfile, docker-compose.yml, .dockerignore
   - Documentation: README, CHANGELOG, CONTRIBUTING, LICENSE
   - Environment: .env.example, .env.template
4. Note any generated or vendored directories:
   - node_modules, vendor, dist, build, .next, __pycache__
   - Mark these as excluded from deeper analysis.
5. Record the directory tree structure in outline format.

**Checkpoint:** A complete directory tree outline with project type identified and
generated/vendored directories marked.

### Phase 2 -- Classify File Types (20%)

1. Categorize every non-generated file into a classification:
   - **Source code:** Application logic files (.ts, .js, .py, .go, .rs, etc.)
   - **Test files:** Test suites (.test.ts, .spec.ts, _test.go, test_*.py, etc.)
   - **Configuration:** Build, lint, format, CI configuration files
   - **Types/Interfaces:** Type definition files (.d.ts, protocol files, schemas)
   - **Assets:** Images, fonts, static files
   - **Documentation:** Markdown, reStructuredText, inline doc files
   - **Data:** Migrations, seed files, fixtures, test data
   - **Scripts:** Build scripts, deployment scripts, utility scripts
   - **Templates:** HTML templates, email templates, code generation templates
2. Count files per category:
   - Total source files, test files, config files, etc.
   - Ratio of test files to source files.
   - Dominant language by file count.
3. Identify entry points:
   - Main application entry (main.ts, index.ts, app.py, main.go, etc.)
   - CLI entry points and command definitions
   - API route definitions and handler registrations
   - Event listeners and subscribers
   - Scheduled job definitions
4. Identify key architectural files:
   - Dependency injection setup or composition roots
   - Middleware pipelines and plugin registrations
   - Database connection and ORM configuration
   - Authentication and authorization setup
5. Flag unusual or noteworthy files:
   - Very large files (>500 lines) that may be god objects
   - Empty files that may be stubs or placeholders
   - Files with unusual extensions or naming patterns

**Checkpoint:** A complete file classification with counts, entry points, and
architectural files identified.

### Phase 3 -- Map Dependencies (25%)

1. Analyze import/require/use statements to map internal dependencies:
   - For each source file, list what other internal modules it imports.
   - Build a dependency graph of module relationships.
   - Identify the dependency direction (which modules depend on which).
2. Identify dependency patterns:
   - **Layered dependencies:** Controllers -> Services -> Repositories
   - **Circular dependencies:** A imports B, B imports A
   - **Hub modules:** Modules imported by many others (high fan-in)
   - **Leaf modules:** Modules that import nothing else (utilities, types)
   - **God modules:** Modules that import many others (high fan-out)
3. Map external dependency usage:
   - Which external packages are used and by how many files?
   - Are external dependencies wrapped behind internal abstractions?
   - Are there multiple libraries serving the same purpose?
4. Identify module boundaries:
   - Which directories represent cohesive modules?
   - Are there barrel files (index.ts) that define public APIs?
   - Do modules have clear single responsibilities?
   - Are there modules that seem to belong together but are separated?
5. Build the dependency summary:
   - Top 10 most-imported internal modules.
   - Top 10 most-used external dependencies.
   - Any circular dependency chains found.
   - Modules with highest coupling risk (high fan-in + high fan-out).

**Checkpoint:** A dependency map showing internal relationships, external usage,
and structural patterns.

### Phase 4 -- Build Mental Model (20%)

1. Synthesize the file tree, classifications, and dependencies into an architectural
   mental model:
   - What is the system's primary purpose?
   - How does data flow through the system (request -> response, event -> handler)?
   - What are the major subsystems and their responsibilities?
   - How do the subsystems interact?
2. Identify the architectural style:
   - Layered / N-tier
   - Hexagonal / ports-and-adapters
   - Event-driven / message-based
   - Microservices / serverless functions
   - Monolithic with internal modules
   - Plugin / extension architecture
3. Map the key abstractions:
   - What are the core domain types (User, Order, Product, etc.)?
   - What are the primary operations (CRUD, transformations, workflows)?
   - What infrastructure concerns exist (database, cache, queue, storage)?
4. Identify conventions and patterns:
   - File naming conventions.
   - Directory organization conventions.
   - Import organization patterns.
   - Error handling patterns.
   - Test organization patterns.
5. Note architectural strengths and concerns:
   - Well-separated concerns and clean boundaries.
   - Areas of tight coupling or unclear responsibility.
   - Consistency or inconsistency in conventions.
   - Opportunities for better organization.

**Checkpoint:** A coherent mental model of the system architecture with key
abstractions, conventions, and concerns identified.

### Phase 5 -- Produce Index (15%)

1. Compile the index document:
   - Start with a project overview (type, purpose, tech stack).
   - Include the directory tree outline.
   - Include the file classification summary.
   - Include the dependency map highlights.
   - Include the architectural mental model.
2. Make the index navigable:
   - Group files by module or functional area.
   - Use headers and sub-headers for clear organization.
   - Include file paths that can be used for direct navigation.
   - Cross-reference related files and modules.
3. Make the index actionable:
   - For each module, note its purpose and key files.
   - Note the entry points for common tasks (adding a feature, fixing a bug, etc.).
   - Highlight files that are most important to understand first.
4. Keep the index maintainable:
   - Use relative descriptions that survive file additions.
   - Focus on patterns and conventions rather than exhaustive file listings.
   - Note which parts of the codebase are stable vs actively changing.

**Checkpoint:** A complete, navigable project index ready for use as context.

---

## MCP Integration

### Tool Usage Guidance

- **Filesystem tools:** List directories, read file headers and imports, scan for
  patterns. These are the primary tools for indexing.
- **Search tools:** Find import patterns, locate entry points, discover configuration
  files. Essential for dependency mapping.
- **GitHub tools:** If available, read recent PRs and issues to understand active
  areas of development.

### Tool Usage Constraints

- The agent MUST NOT modify, create, or delete any files.
- The agent MUST NOT execute build commands, test runners, or scripts.
- The agent MUST NOT install dependencies or modify lock files.
- The agent SHOULD sample representative files rather than reading every file in
  very large directories (>100 files per directory).
- The agent SHOULD prioritize reading entry points, configuration files, and
  barrel/index files for maximum understanding with minimum reads.

### Efficiency Guidelines

- Use glob patterns to discover file organization before reading individual files.
- Use grep to find import patterns across many files simultaneously.
- Read package.json / Cargo.toml / go.mod early to understand the dependency landscape.
- Read barrel files (index.ts) to understand module public APIs without reading
  every internal file.
- For large codebases (>500 files), focus on the top 3 levels of directory structure
  and sample deeper levels.

---

## Boundaries

### WILL DO:

- Scan and catalog every file and directory in the target scope
- Classify files by type and purpose
- Map internal import/dependency relationships
- Identify entry points, architectural files, and configuration
- Build a mental model of the system architecture
- Identify architectural style, conventions, and patterns
- Note coupling hotspots and circular dependencies
- Produce a structured, navigable index document
- Flag large files, empty files, and unusual patterns
- Identify module boundaries and public APIs
- Adapt scanning depth to codebase size

### WILL NOT DO:

- Modify, create, or delete any files
- Execute any commands, scripts, or build processes
- Install or modify dependencies
- Make architectural recommendations (use /sc:analyze for that)
- Assess code quality (use /sc:analyze for that)
- Implement changes or refactoring
- Read every line of every file (sampling is acceptable and expected)
- Index generated, vendored, or build output directories
- Make assumptions about file purpose without evidence from content

---

## Output Format

```markdown
## Project Index: {project name}

### Overview
- **Type:** {monorepo | single project | library | CLI tool | ...}
- **Primary Language:** {language}
- **Framework:** {framework if applicable}
- **Package Manager:** {package manager}
- **Total Files:** {count} ({count} source, {count} test, {count} config)

### Directory Structure
{indented tree outline with annotations}

### File Classification
| Category       | Count | Key Files                              |
|----------------|-------|----------------------------------------|
| Source Code    | {n}   | {most important source files}          |
| Tests          | {n}   | {test directories or patterns}         |
| Configuration  | {n}   | {key config files}                     |
| Types/Schemas  | {n}   | {type definition files}                |
| Documentation  | {n}   | {doc files}                            |
| Scripts        | {n}   | {build/deploy scripts}                 |

### Entry Points
| Entry Point              | File                  | Purpose               |
|--------------------------|-----------------------|-----------------------|
| {entry name}             | {file path}           | {what it starts}      |

### Module Map
#### {Module Name}
- **Path:** {directory path}
- **Purpose:** {what this module does}
- **Key Files:** {important files in this module}
- **Dependencies:** {what it depends on}
- **Dependents:** {what depends on it}

### Dependency Highlights
- **Most-imported modules:** {list}
- **Most-used external packages:** {list}
- **Circular dependencies:** {list or "None found"}
- **Coupling hotspots:** {list}

### Architecture Summary
{2-4 paragraph description of the system architecture}

### Navigation Guide
- To add a new feature: start at {file}
- To understand data flow: read {files in order}
- To find configuration: look at {files}
- To understand testing: see {test directory/pattern}
```

### Output Formatting Rules

- Directory trees use indentation with annotations for key directories.
- File counts must be accurate (use actual counts, not estimates).
- Module map entries are ordered by architectural importance.
- Entry points are listed in order of how commonly they are used.
- The navigation guide should have at least 4 entries for common tasks.

---

## Edge Cases

### Very Small Project (<10 files)

- Index every file individually rather than by module.
- Skip the module map section.
- Provide more detail per file since there are fewer to cover.

### Very Large Project (>1000 files)

- Announce the sampling strategy in the overview.
- Focus on the top 2-3 levels of directory structure.
- Sample 5-10 representative files per major directory.
- Still produce a complete module map based on directory structure.
- Note which areas were sampled vs exhaustively cataloged.

### Monorepo With Multiple Packages

- Index each package as a separate module in the module map.
- Note cross-package dependencies explicitly.
- Identify shared packages that multiple other packages depend on.
- Provide a top-level overview before diving into individual packages.

### Project With No Clear Structure

- Describe what is found without imposing a structure that does not exist.
- Note the lack of clear organization as an observation.
- Group files by apparent function even if the directory structure does not.
- Suggest that /sc:analyze might provide useful organizational recommendations.

### Binary or Non-Text Files

- Note their existence and likely purpose.
- Do not attempt to read or analyze binary content.
- Include them in file counts but not in dependency mapping.

---

## Recovery Behavior

- If a directory cannot be read (permissions), log it and continue with accessible
  areas. Note the gap in the index.
- If the project is too large to index in one pass, prioritize the root level and
  primary source directories.
- If the dependency mapping is incomplete due to an unfamiliar language, note the
  limitation and provide what structural information is available.
- If the file tree is extremely deep (>10 levels), truncate at level 5 and note
  the truncation.

---

## Next Steps

After completing the index, the user may want to:

- `/sc:analyze` -- Deep analysis of quality, patterns, and risks in the indexed project
- `/sc:load` -- Load specific modules into context for focused work
- `/sc:index-repo` -- Extended indexing for the full repository including git history
- `/sc:recommend` -- Get recommendations based on the project structure
- `/sc:brainstorm` -- Generate ideas for improvements to the project architecture

---

## User Task

$ARGUMENTS
