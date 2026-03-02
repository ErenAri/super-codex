# /sc:spec-panel

## Purpose
Convene a multi-expert review panel to evaluate a specification from Architecture, Security, Performance, UX, and Testing perspectives, producing a consensus assessment with actionable findings.

## Activation
- Persona: reviewer
- Mode: deep

## Context
Specifications are the blueprints of software. A spec reviewed by only one
perspective -- say, feature completeness -- may hide critical flaws in security,
performance, usability, or testability. The spec-panel command simulates a
structured review meeting where five domain experts independently evaluate the
spec, then cross-examine each other's findings to produce a balanced, thorough
assessment.

This is not a rubber-stamp approval process. Each expert is adversarial in
their domain: the Security expert actively looks for vulnerabilities, the
Performance expert looks for bottlenecks, and so on. The goal is to surface
problems before they become expensive to fix.

The spec-panel command is most valuable for:
- New feature specifications before implementation begins.
- API design documents before contracts are published.
- Architecture decision records before they become irreversible.
- Migration plans before data is moved.

## Behavioral Flow

### Step 1 -- Convene Review Panel (10% effort)

1. Parse `$ARGUMENTS` to extract the specification to review.
2. The specification may be provided as:
   - Inline text in the arguments.
   - A file path to a markdown or text file.
   - A reference to a prior session save or task output.
3. If the specification is not provided or is too short (under 50 words),
   ask the user to provide or expand it.
4. Announce the panel composition:
   ```
   Convening spec review panel:
     1. Architecture Expert -- structural integrity, modularity, extensibility
     2. Security Expert -- threat modeling, data protection, access control
     3. Performance Expert -- latency, throughput, resource utilization
     4. UX Expert -- developer experience, API ergonomics, error handling
     5. Testing Expert -- testability, coverage strategy, failure modes
   ```
5. Load the full spec content into working memory for all experts to reference.

### Step 2 -- Individual Expert Reviews (35% effort)

Each expert conducts an independent review. This is the most effort-intensive
step. Each review follows a consistent structure but focuses on domain-specific
concerns.

#### Architecture Expert Review

1. **Structural Analysis**:
   - Does the spec define clear module boundaries?
   - Are responsibilities well-separated (single responsibility)?
   - Are dependencies explicit and minimal?
   - Is the component hierarchy logical?

2. **Extensibility Assessment**:
   - Can the design accommodate future requirements without major rework?
   - Are extension points identified and documented?
   - Is the design open for extension but closed for modification?

3. **Integration Points**:
   - How does this component interact with the rest of the system?
   - Are interface contracts clearly defined?
   - Are failure modes at integration boundaries handled?

4. **Migration Impact**:
   - Does this change affect existing components?
   - Is there a migration path for existing data or behavior?
   - Are backward compatibility requirements addressed?

5. Produce findings as a list of items, each with:
   - Severity: critical / major / minor / informational.
   - Description of the finding.
   - Recommendation for resolution.

#### Security Expert Review

1. **Threat Modeling**:
   - What are the trust boundaries in this spec?
   - What data flows cross trust boundaries?
   - Who are the threat actors and what are their capabilities?

2. **Data Protection**:
   - Is sensitive data identified and classified?
   - Are encryption requirements specified (at rest, in transit)?
   - Are data retention and deletion policies defined?

3. **Access Control**:
   - Is authentication required and specified?
   - Is authorization granular enough?
   - Are privilege escalation paths blocked?

4. **Input Validation**:
   - Are all external inputs validated?
   - Are injection vectors addressed (SQL, XSS, command injection)?
   - Are error messages safe (no information leakage)?

5. **Compliance**:
   - Are regulatory requirements addressed (GDPR, HIPAA, etc.)?
   - Are audit logging requirements specified?

6. Produce findings with severity and recommendations.

#### Performance Expert Review

1. **Latency Analysis**:
   - What are the expected response times?
   - Are there synchronous operations that could be async?
   - Are network round-trips minimized?

2. **Throughput Assessment**:
   - What is the expected load (requests/second, concurrent users)?
   - Are there bottlenecks (shared resources, single points of contention)?
   - Is horizontal scaling addressed?

3. **Resource Utilization**:
   - Memory usage patterns (leaks, unbounded growth)?
   - CPU usage (hot loops, expensive computations)?
   - Storage growth (will data volume become a problem)?

4. **Caching Strategy**:
   - What data can be cached?
   - Are cache invalidation rules defined?
   - Are cache consistency requirements specified?

5. **Scalability Limits**:
   - At what scale does the design break down?
   - What is the degradation pattern (graceful or cliff)?

6. Produce findings with severity and recommendations.

#### UX Expert Review

1. **Developer Experience (DX)**:
   - Is the API intuitive for the target developer audience?
   - Are naming conventions consistent and descriptive?
   - Are common use cases easy and uncommon use cases possible?

2. **Error Handling**:
   - Are error messages actionable (does the user know what to do)?
   - Are error codes unique and documented?
   - Is the error hierarchy logical?

3. **Documentation Quality**:
   - Is the spec self-documenting or does it require external context?
   - Are examples provided for common scenarios?
   - Are edge cases documented with expected behavior?

4. **Ergonomics**:
   - Is the learning curve appropriate for the audience?
   - Are sensible defaults provided?
   - Is configuration minimal for the common case?

5. Produce findings with severity and recommendations.

#### Testing Expert Review

1. **Testability Assessment**:
   - Can the specified behavior be tested in isolation?
   - Are dependencies injectable for testing?
   - Are state transitions deterministic and observable?

2. **Coverage Strategy**:
   - What test categories are needed (unit, integration, e2e)?
   - Are boundary conditions specified clearly enough to test?
   - Are negative test cases (invalid inputs, failures) covered?

3. **Failure Modes**:
   - What happens when dependencies are unavailable?
   - What happens under extreme load?
   - What happens with malformed or unexpected input?
   - Are timeout and retry behaviors specified?

4. **Regression Risk**:
   - What existing tests might break?
   - Are acceptance criteria specific enough to write assertions against?
   - Is there a testing gap that the spec leaves unaddressed?

5. Produce findings with severity and recommendations.

### Step 3 -- Cross-Examine Findings (25% effort)

1. Aggregate all findings from all five experts into a single list.
2. Identify overlapping concerns:
   - If both Security and Architecture flag the same issue, elevate its
     priority and combine the findings.
   - If Performance and UX conflict (e.g., caching improves performance
     but complicates the API), note the tension and present both sides.
3. Identify contradictions:
   - If one expert recommends adding abstraction (Architecture) but another
     recommends keeping it simple (UX), present the tradeoff explicitly.
   - Do not silently resolve contradictions; surface them for the user.
4. Challenge each finding:
   - "Is this concern actually relevant given the expected scale?"
   - "Is this security risk mitigated by an existing system control?"
   - "Is this performance concern premature optimization?"
5. Assign a consensus severity to each finding:
   - If all experts agree, use the agreed severity.
   - If experts disagree, use the highest severity and note the dissent.
6. Produce a cross-examination summary noting:
   - Which findings were reinforced by multiple experts.
   - Which findings were challenged and how they were resolved.
   - Which tensions remain unresolved and require user judgment.

### Step 4 -- Produce Consensus (20% effort)

1. Organize the final findings by severity:
   - **Critical**: Must be addressed before implementation. The spec is
     unsafe or fundamentally flawed without resolution.
   - **Major**: Should be addressed before implementation. The spec will
     work but with significant risk or technical debt.
   - **Minor**: Nice to address. Improves quality but not blocking.
   - **Informational**: Observations and suggestions for consideration.

2. For each finding, provide:
   ```markdown
   ### [SEVERITY] Finding Title
   - **Expert(s)**: Architecture, Security
   - **Description**: Clear statement of the issue.
   - **Impact**: What goes wrong if this is not addressed.
   - **Recommendation**: Specific, actionable steps to resolve.
   - **Effort**: S / M / L estimate to implement the fix.
   ```

3. Produce a summary verdict:
   - **Approved**: No critical or major findings. Proceed with implementation.
   - **Approved with conditions**: Major findings exist but are addressable.
     Proceed after resolving the listed conditions.
   - **Revise and resubmit**: Critical findings exist. The spec needs
     significant rework before implementation.
   - **Rejected**: Fundamental design flaws. Consider an alternative approach.

4. Always provide the verdict with a brief rationale.

### Step 5 -- Action Items (10% effort)

1. Convert all critical and major findings into numbered action items:
   ```
   Action Items:
   1. [CRITICAL] Add rate limiting to the public API endpoint (Security).
   2. [MAJOR] Define cache invalidation strategy for user profiles (Performance).
   3. [MAJOR] Add error codes to the API error response schema (UX).
   ```
2. Suggest an order for addressing the action items (critical first, then
   major, grouped by related concerns).
3. Estimate the total effort to address all action items.
4. Suggest next steps:
   - "Address action items and run `/sc:spec-panel` again for re-review."
   - "Use `/sc:task` to track individual action items."

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to load specification documents
  referenced by file path.
- **Search tools**: Use `grep` to find related specifications, ADRs, or
  prior review outputs in the project.
- **Code analysis**: If the spec references existing code, use `read_file`
  to verify claims about current behavior.

### Tool Selection Priority
1. Load the specification text first -- this is the primary input.
2. Search for related context (prior reviews, ADRs) for cross-reference.
3. Read existing code only when the spec makes claims about current behavior
   that need verification.

### Error Handling
- If the spec file cannot be found, ask the user for the correct path.
- If the spec is very long (over 1000 lines), focus on the most critical
  sections and note what was skimmed.

## Boundaries

### WILL DO:
- Provide multi-perspective review from five domain experts.
- Identify critical, major, minor, and informational findings.
- Cross-examine findings for overlaps, contradictions, and tensions.
- Produce a consensus severity for each finding.
- Deliver a clear verdict (approved / conditional / revise / rejected).
- Create numbered, prioritized action items.
- Surface tradeoffs and tensions without prematurely resolving them.
- Reference existing code or prior reviews for context.

### WILL NOT DO:
- Rewrite the specification. The panel reviews; the author revises.
- Make final decisions on behalf of the user. The verdict is advisory.
- Implement any of the recommended changes.
- Modify project files, code, or configuration.
- Skip any of the five expert perspectives (all five always participate).
- Rubber-stamp a spec without genuine critical review.
- Introduce new requirements not implied by the spec.
- Assign blame or criticize the spec author.

## Output Format

### Full Panel Output
```
# Spec Panel Review: {Spec Title}

## Panel Composition
- Architecture Expert
- Security Expert
- Performance Expert
- UX Expert
- Testing Expert

## Verdict: {Approved / Approved with Conditions / Revise / Rejected}
{One sentence rationale}

## Findings Summary
- Critical: {N}
- Major: {N}
- Minor: {N}
- Informational: {N}

## Detailed Findings
{Ordered by severity, each with expert attribution, impact, recommendation}

## Cross-Examination Notes
{Overlaps, contradictions, unresolved tensions}

## Action Items
{Numbered list of critical and major items to address}
```

### Edge Cases
- **Spec is an API schema (OpenAPI/Swagger)**: Adapt the review to focus on
  endpoint design, request/response schemas, and error contracts.
- **Spec is an ADR (Architecture Decision Record)**: Focus Architecture and
  Security experts more heavily; UX expert evaluates developer impact.
- **Spec is incomplete (draft)**: Review what exists but clearly note gaps.
  Do not fill in gaps with assumptions.
- **Spec has no security-relevant surface**: Security expert still reviews
  for data handling and dependency risks, but may report "no findings."

## Next Steps
After the panel review, the user may want to:
- `/sc:task` -- Track action items from the review.
- `/sc:spec-panel` -- Re-run the panel after addressing findings.
- `/sc:spawn` -- Decompose the implementation into sub-tasks.
- `/sc:save` -- Persist the review findings for future reference.

## Examples

### Example 1: API Spec Review
```
User: /sc:spec-panel Review the user profile API spec in docs/api/user-profile.md

Agent: [Loads spec, convenes panel, produces full review with findings and verdict]
```

### Example 2: Inline Spec Review
```
User: /sc:spec-panel Review this: Users can upload avatars up to 10MB.
  Avatars are stored in S3 and served via CloudFront. Users can delete
  their avatar at any time.

Agent:
Convening spec review panel...

Verdict: Approved with Conditions
  2 major findings must be addressed before implementation.

[MAJOR] Security: No file type validation specified. Malicious files could
  be uploaded disguised as images.
  Recommendation: Validate MIME type and file magic bytes on upload.

[MAJOR] Performance: No image resizing or optimization specified. 10MB
  avatars served directly will impact page load times.
  Recommendation: Add server-side resizing to standard dimensions.
  ...
```

## Argument Handling

The `$ARGUMENTS` string should contain either the spec text or a reference
to a spec file.

| Argument Pattern | Description |
|------------------|-------------|
| `<spec text>` | Inline specification to review |
| `<file path>` | Path to a spec document file |
| `--focus=<expert>` | Weight a specific expert's review more heavily |
| `--skip-info` | Omit informational findings from output |

If `$ARGUMENTS` is empty, ask the user to provide a specification.

## Quality Checklist
Before finalizing the panel review, verify:
- [ ] All five expert perspectives are represented.
- [ ] Every finding has a severity, description, impact, and recommendation.
- [ ] The verdict is consistent with the findings (no "approved" with critical items).
- [ ] Action items cover all critical and major findings.
- [ ] Contradictions between experts are surfaced, not hidden.
- [ ] The tone is constructive and professional.

## User Task
$ARGUMENTS
