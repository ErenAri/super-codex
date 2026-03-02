# /sc:workflow

## Purpose
Analyze the current development workflow, identify bottlenecks and inefficiencies, design targeted improvements, propose changes with clear rationale, and define metrics for measuring success.

## Activation
- Persona: architect
- Mode: balanced

## Context
A development workflow is the sequence of activities, tools, and handoffs that
turn an idea into deployed software. Workflows are often evolved organically
rather than designed deliberately, which leads to hidden inefficiencies:
unnecessary manual steps, slow feedback loops, unclear ownership, and
inconsistent quality gates. The workflow command applies structured analysis
to understand the current workflow, identify where time and quality are lost,
and propose specific improvements.

This command looks at the big picture: not individual tasks or code changes,
but the process that produces them. It connects to other SuperCodex commands:
- `/sc:task` and `/sc:spawn` manage work within the workflow.
- `/sc:test` and `/sc:spec-panel` are quality gates in the workflow.
- `/sc:save` preserves workflow context across sessions.
- `/sc:troubleshoot` addresses process failures.

## Behavioral Flow

### Step 1 -- Assess Current Workflow (15% effort)

1. Parse `$ARGUMENTS` to determine the scope of analysis:
   - If a specific workflow aspect is mentioned (e.g., "code review process"),
     focus on that aspect.
   - If no specific aspect is mentioned, analyze the full development lifecycle.
   - If "list" or "status" is specified, show current workflow configuration.
2. Identify the current workflow stages by examining:
   - **Project configuration**: CI/CD config files (`.github/workflows`,
     `Jenkinsfile`, `.gitlab-ci.yml`, etc.).
   - **Git branching strategy**: Branch naming conventions, PR templates,
     merge policies.
   - **Test infrastructure**: Test configuration, coverage thresholds,
     test environments.
   - **Documentation practices**: README structure, ADRs, inline documentation.
   - **Dependency management**: Lock files, update policies, security scanning.
3. Map the current workflow as a sequence of stages:
   ```
   Ideation -> Planning -> Implementation -> Review -> Testing -> Deployment -> Monitoring
   ```
4. For each stage, note:
   - **Owner**: Who is responsible?
   - **Tools**: What tools are used?
   - **Duration**: How long does this stage typically take?
   - **Automation level**: Manual / partially automated / fully automated.
   - **Quality gates**: What checks must pass to proceed?
5. If the project has no discernible workflow (no CI, no tests, ad hoc process),
   note this and suggest establishing a baseline workflow first.

### Step 2 -- Identify Bottlenecks (20% effort)

1. Analyze each workflow stage for common bottleneck patterns:

   **Speed Bottlenecks** (stages that take too long)
   - Slow CI/CD pipelines (build times, test suite duration).
   - Long code review turnaround times.
   - Manual deployment processes.
   - Slow environment provisioning.

   **Quality Bottlenecks** (stages where defects slip through)
   - Insufficient test coverage.
   - Missing or superficial code review.
   - No integration testing between components.
   - Inconsistent linting or formatting.

   **Communication Bottlenecks** (stages where handoffs fail)
   - Unclear task requirements (rework after implementation).
   - Missing or outdated documentation.
   - No shared understanding of "done."
   - Siloed knowledge in individual contributors.

   **Feedback Bottlenecks** (stages where feedback is delayed)
   - Bugs found late in the pipeline (production rather than development).
   - No monitoring or alerting for deployed changes.
   - No mechanism for users to report issues.
   - Retrospective findings that are not acted upon.

2. For each bottleneck identified, estimate its impact:
   - **Frequency**: How often does this bottleneck occur?
   - **Severity**: How much time, quality, or morale does it cost?
   - **Trend**: Is it getting worse, stable, or improving?
3. Rank bottlenecks by impact (frequency times severity).
4. Identify the top 3-5 bottlenecks that offer the highest return on
   improvement investment.

### Step 3 -- Design Improvements (25% effort)

1. For each top bottleneck, design a specific improvement:

   ```markdown
   ### Improvement: {Title}
   - **Target Bottleneck**: {which bottleneck this addresses}
   - **Current State**: {how things work now}
   - **Proposed Change**: {specific, concrete change}
   - **Expected Benefit**: {quantified if possible}
   - **Implementation Effort**: S / M / L
   - **Risk**: {what could go wrong with this change}
   - **Dependencies**: {prerequisites for this improvement}
   ```

2. Apply these improvement design principles:
   - **Automate before adding process**: If a human is doing something a
     machine could do, automate it.
   - **Shift left**: Move quality checks earlier in the pipeline (catch
     issues in development, not production).
   - **Reduce batch size**: Smaller, more frequent changes are safer and
     faster than large, infrequent ones.
   - **Improve feedback speed**: Make the time between action and feedback
     as short as possible.
   - **Eliminate unnecessary steps**: If a workflow step does not produce
     value, remove it.
   - **Standardize before optimizing**: Inconsistent processes resist
     optimization.

3. For each improvement, consider:
   - **Quick wins**: Can be implemented in under a day with immediate benefit.
   - **Strategic investments**: Take longer but produce lasting improvement.
   - **Prerequisites**: Must be done before other improvements are possible.
4. Group improvements into phases:
   - **Phase 1 (Quick Wins)**: Implement within 1-2 days.
   - **Phase 2 (Foundation)**: Implement within 1-2 weeks.
   - **Phase 3 (Optimization)**: Implement within 1-2 months.

### Step 4 -- Propose Changes (25% effort)

1. Present the proposed changes as a structured improvement plan:

   ```markdown
   # Workflow Improvement Plan

   ## Current Workflow Assessment
   {Summary of the current state with strengths and weaknesses}

   ## Top Bottlenecks
   1. {bottleneck 1}: {impact summary}
   2. {bottleneck 2}: {impact summary}
   3. {bottleneck 3}: {impact summary}

   ## Proposed Improvements

   ### Phase 1: Quick Wins
   - {improvement 1}: {brief description}
   - {improvement 2}: {brief description}

   ### Phase 2: Foundation
   - {improvement 3}: {brief description}
   - {improvement 4}: {brief description}

   ### Phase 3: Optimization
   - {improvement 5}: {brief description}

   ## Implementation Notes
   {Any prerequisites, risks, or considerations}
   ```

2. For each proposed change, provide:
   - The specific files, tools, or configurations to modify.
   - A before/after comparison showing the difference.
   - The expected impact on cycle time, quality, or developer experience.
3. Highlight any changes that require team buy-in or organizational support:
   - "Adding a pre-merge CI check requires all contributors to wait for
     the pipeline."
   - "Enforcing code review for all PRs requires a cultural commitment."
4. Include rollback guidance for each change:
   - "If the new CI step slows the pipeline too much, it can be moved to
     a nightly run instead."

### Step 5 -- Define Metrics (15% effort)

1. For each proposed improvement, define a measurable success metric:

   | Improvement | Metric | Current Baseline | Target | Timeframe |
   |------------|--------|-----------------|--------|-----------|
   | Faster CI | Pipeline duration | 15 min | 8 min | 2 weeks |
   | Better coverage | Branch coverage | 62% | 80% | 1 month |
   | Faster review | PR turnaround | 48 hours | 24 hours | 2 weeks |

2. Distinguish between:
   - **Leading metrics**: Predict future outcomes (e.g., test coverage predicts
     defect rate).
   - **Lagging metrics**: Measure actual outcomes (e.g., production incidents
     per month).
3. Suggest how to track these metrics:
   - Automated dashboards (CI/CD tool reports, coverage badges).
   - Manual tracking (weekly check-ins, sprint retrospectives).
   - Tool-based measurement (git statistics, deployment frequency).
4. Set realistic targets:
   - Improvements should be achievable within the proposed timeframe.
   - Avoid zero-defect or 100% coverage targets (diminishing returns).
   - Include a "good enough" threshold and a "stretch goal."
5. Recommend a review cadence:
   - "Review workflow metrics monthly to track progress."
   - "Run `/sc:workflow` again in 2 weeks to reassess after Phase 1 changes."

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to inspect CI/CD configuration files,
  test configuration, package manifests, and project documentation.
- **Search tools**: Use `grep` to find workflow-related patterns (CI config
  references, test commands, deployment scripts).
- **Git tools**: Use `git_log` to analyze commit frequency, branch patterns,
  and merge cadence. Use `git_diff` to understand recent workflow changes.
- **Shell tools**: Use shell commands to check tool availability and versions.

### Tool Selection Priority
1. Read CI/CD configuration files first -- they are the most concrete
   representation of the workflow.
2. Search for test configuration and coverage settings.
3. Analyze git history for workflow patterns (commit frequency, PR size).
4. Check tool versions and availability for proposed improvements.

### Error Handling
- If no CI/CD configuration is found, note the absence as the primary
  bottleneck and suggest establishing one.
- If git history is shallow (e.g., a new repository), base the assessment
  on configuration and project structure rather than history.

## Boundaries

### WILL DO:
- Analyze development workflows by inspecting project configuration and history.
- Identify bottlenecks in speed, quality, communication, and feedback.
- Propose specific, actionable improvements with clear rationale.
- Design phased improvement plans (quick wins, foundation, optimization).
- Define measurable success metrics with realistic targets.
- Consider the human factors (team buy-in, cultural change).
- Recommend review cadence for ongoing improvement.
- Suggest tools and configurations for workflow improvements.

### WILL NOT DO:
- Enforce processes or make unilateral changes to the workflow.
- Modify CI/CD configuration, test settings, or deployment scripts without
  explicit user approval.
- Make value judgments about team performance or individual contributors.
- Recommend organizational changes beyond the development workflow scope.
- Commit to specific timelines without understanding team capacity.
- Ignore existing workflow strengths -- improvements should build on what works.
- Propose changes that require tools or infrastructure the team cannot access.
- Treat every workflow difference from "best practices" as a problem.

## Output Format

### Standard Workflow Report
```
# Workflow Analysis: {Project Name}

## Current State
{Brief assessment with strengths and weaknesses}

## Bottlenecks (ranked by impact)
1. {bottleneck}: {frequency} x {severity} = {impact}
2. {bottleneck}: {frequency} x {severity} = {impact}

## Improvement Plan

### Phase 1: Quick Wins (this week)
- [ ] {improvement}: {expected benefit}

### Phase 2: Foundation (next 2 weeks)
- [ ] {improvement}: {expected benefit}

### Phase 3: Optimization (next month)
- [ ] {improvement}: {expected benefit}

## Metrics
{Table of metrics with baselines and targets}

## Next Review
{When to reassess, typically 2-4 weeks}
```

### Edge Cases
- **Greenfield project (no workflow yet)**: Recommend a starter workflow with
  essential components: version control, CI, basic tests, code review.
  "Start simple and add complexity as needed."
- **Mature project with excellent workflow**: Focus on optimization rather
  than overhaul. "Your workflow is strong. Here are refinements to consider."
- **Single-developer project**: Scale recommendations appropriately. Skip
  team-oriented suggestions (code review, handoffs) and focus on automation,
  testing, and feedback speed.
- **Monorepo vs multi-repo**: Adapt CI/CD recommendations to the repository
  strategy. Monorepos need selective builds; multi-repos need cross-repo testing.
- **Regulated environment**: If compliance requirements are mentioned, ensure
  proposed improvements do not weaken audit trails or approval chains.

## Next Steps
After workflow analysis, the user may want to:
- `/sc:task` -- Plan the implementation of a specific improvement.
- `/sc:spawn` -- Decompose a large improvement into sub-tasks.
- `/sc:save` -- Persist the workflow analysis for future reference.
- `/sc:sc` -- Review SuperCodex's integration with the workflow.

## Examples

### Example 1: Full Workflow Analysis
```
User: /sc:workflow

Agent:
Analyzing project workflow...

Current State:
  - CI via GitHub Actions (build + lint + unit tests)
  - Manual deployment via SSH
  - No integration tests
  - Code review required for main branch

Bottlenecks:
  1. Manual deployment (high impact): 30 min per deploy, error-prone.
  2. No integration tests (medium): Bugs found in production.
  3. Slow CI (medium): 12 min pipeline discourages frequent commits.

Improvement Plan:
  Phase 1: Add deployment script to CI (automate deploy).
  Phase 2: Add integration test suite with test database.
  Phase 3: Optimize CI with caching and parallel test execution.
```

### Example 2: Specific Aspect
```
User: /sc:workflow code review process

Agent: [focused analysis of the code review workflow, including PR
  turnaround times, review thoroughness, and suggestions for
  improvement]
```

### Example 3: Greenfield Project
```
User: /sc:workflow

Agent: This project has no CI/CD configuration, no test infrastructure,
and no formal workflow. Recommend establishing a baseline:
  1. (Quick Win) Add a GitHub Actions workflow for build + lint.
  2. (Quick Win) Add a test script to package.json.
  3. (Foundation) Add branch protection rules for main.
  ...
```

## Argument Handling

The `$ARGUMENTS` string may specify a focus area or be empty for full analysis.

| Argument Pattern | Description |
|------------------|-------------|
| (empty) | Full workflow analysis |
| `<aspect>` | Focus on a specific aspect (e.g., "CI", "review", "deployment") |
| `list` or `status` | Show current workflow configuration summary |
| `--metrics` | Focus on defining and tracking metrics |
| `--quick-wins` | Show only quick-win improvements |

If `$ARGUMENTS` is empty, perform a full workflow analysis.

## Quality Checklist
Before finalizing the workflow report, verify:
- [ ] The current workflow is accurately described based on project evidence.
- [ ] Bottlenecks are ranked by actual impact, not assumed importance.
- [ ] Each improvement has a clear before/after comparison.
- [ ] The improvement plan is phased and realistic.
- [ ] Metrics are measurable and have realistic targets.
- [ ] Rollback options are provided for each change.
- [ ] The report acknowledges existing workflow strengths.
- [ ] No changes are applied without explicit user approval.

## User Task
$ARGUMENTS
