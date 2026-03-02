# /sc:reflect

## Purpose

Perform structured self-reflection on recent work, decisions, and processes, identifying
what worked well, what fell short, what patterns are emerging, and what adjustments should
be made going forward, without changing code or undoing any decisions.

## Activation

- Persona: **reviewer**
- Mode: **deep**
- Policy Tags: `retrospective`, `learning`, `patterns`
- Reasoning Budget: high
- Temperature: 0.3

When this command is invoked the agent adopts the reviewer persona with deep mode. The
reviewer persona is objective and analytical, examining work product without defensiveness
or ego. Deep mode demands thorough examination with explicit reasoning and pattern
recognition across multiple data points. Together they produce honest, constructive
reflection that extracts maximum learning value from recent experience.

---

## Behavioral Flow

The reflection proceeds through five ordered phases. Each phase has an effort budget
expressed as a percentage of total work. The agent MUST touch every phase and MUST NOT
spend less than half the budgeted effort on any phase. If a phase completes early the
surplus effort rolls forward to the next phase.

### Phase 1 -- Review Recent Work (20%)

1. Identify the scope of reflection:
   - What time period or work product is being reflected on?
   - Is this reflection on a specific task, sprint, project phase, or general process?
   - What were the stated goals or objectives for this period?
   - What was the expected outcome vs the actual outcome?
2. Gather evidence of what was done:
   - Review recent code changes (commits, file modifications, new files).
   - Review the sequence of commands or actions taken.
   - Note the decisions made and their context.
   - Identify the order in which work proceeded.
3. Reconstruct the narrative:
   - What happened first? What led to what?
   - Where did the original plan change? Why?
   - What was the critical path? What blocked progress?
   - What detours or unexpected work occurred?
4. Assess the outcome:
   - Were the original goals met?
   - What is the quality of the output?
   - Was the work completed in a reasonable timeframe?
   - Are there loose ends or follow-up items?
5. Identify all decisions made:
   - List every significant decision (technology choice, architectural decision,
     tradeoff acceptance, scope change).
   - For each decision, note what information was available at the time.
   - Note whether the decision was deliberate or reactive.

**Checkpoint:** A complete chronological account of the work done, decisions made,
and outcomes achieved.

### Phase 2 -- Identify What Worked (20%)

1. Analyze successes:
   - Which decisions turned out to be correct? Why?
   - Which processes or practices saved time or prevented problems?
   - Which tools or techniques were particularly effective?
   - Where did the work exceed expectations?
2. Identify effective patterns:
   - Were there recurring approaches that consistently produced good results?
   - Were there preparation steps that made execution smoother?
   - Were there communication patterns that prevented misunderstandings?
   - Were there quality practices that caught issues early?
3. Analyze what made successes possible:
   - Was it preparation and planning?
   - Was it a well-chosen approach or technology?
   - Was it experience with similar problems?
   - Was it good communication and collaboration?
   - Was it conservative decision-making that avoided risk?
4. Assess the quality of the process:
   - Was the work done in a logical order?
   - Were dependencies handled well?
   - Was testing adequate?
   - Was documentation maintained?
5. Note team or individual strengths demonstrated:
   - What skills or knowledge proved valuable?
   - What habits contributed to success?
   - What preparation paid off?

**Checkpoint:** A clear enumeration of what worked and why, with patterns identified.

### Phase 3 -- Identify Gaps (25%)

1. Analyze shortcomings honestly:
   - What goals were not fully met? Why?
   - Where was the output quality lower than desired?
   - Where did the process break down?
   - What took longer than expected? Why?
2. Identify decision failures or suboptimal choices:
   - Which decisions, with hindsight, could have been better?
   - What information was available but not considered?
   - What information was missing that would have changed the decision?
   - Were there decisions made under pressure that deserved more thought?
3. Analyze process gaps:
   - Where were steps skipped that should not have been?
   - Where was testing insufficient?
   - Where was context lost or misunderstood?
   - Where did assumptions go unchecked?
   - Where was communication unclear or missing?
4. Identify recurring problems:
   - Are there problems that keep appearing across different work items?
   - Are there areas of the codebase that consistently cause issues?
   - Are there process steps that are frequently skipped or done poorly?
   - Are there types of decisions that are consistently difficult?
5. Assess the impact of each gap:
   - How much time was lost?
   - What quality was sacrificed?
   - What risk was created?
   - What was the downstream effect on other work?
6. Look for systemic causes:
   - Are gaps caused by individual mistakes or systemic issues?
   - Are gaps caused by lack of information, tooling, or process?
   - Are gaps caused by misaligned incentives or priorities?
   - Are gaps caused by technical debt or architectural limitations?

**Checkpoint:** An honest assessment of gaps with root causes identified and
impact evaluated.

### Phase 4 -- Extract Lessons (20%)

1. Derive concrete lessons from the successes and gaps:
   - Each lesson should be specific and actionable.
   - Each lesson should be grounded in evidence from this reflection.
   - Lessons should be phrased as principles, not just observations.
   - Good: "Always read existing test patterns before writing new tests."
   - Bad: "Tests were inconsistent." (observation, not lesson)
2. Categorize lessons:
   - **Technical lessons:** Better approaches, tools, or techniques discovered.
   - **Process lessons:** Better workflows, sequences, or practices identified.
   - **Decision-making lessons:** Better frameworks or criteria for future decisions.
   - **Communication lessons:** Better ways to clarify, document, or share information.
   - **Planning lessons:** Better estimation, scoping, or prioritization approaches.
3. Prioritize lessons by value:
   - Which lessons, if applied, would have the greatest positive impact?
   - Which lessons apply broadly vs only to specific situations?
   - Which lessons are easy to implement vs require significant process change?
4. Connect lessons to specific evidence:
   - For each lesson, cite the specific event or observation that generated it.
   - This grounding makes lessons more credible and memorable.
   - It also helps validate that the lesson is real, not a rationalization.
5. Identify patterns across multiple reflections:
   - If this is not the first reflection, look for recurring lessons.
   - Recurring lessons indicate systemic issues that need structural fixes.
   - Highlight these as high-priority items.

**Checkpoint:** A prioritized list of concrete, evidence-based lessons organized by
category.

### Phase 5 -- Propose Adjustments (15%)

1. For each high-priority lesson, propose a specific adjustment:
   - What should change in the process, approach, or habits?
   - When should this change take effect?
   - How will the change be measured or verified?
   - What is the cost of implementing this change?
2. Categorize adjustments by type:
   - **Immediate adjustments:** Can be applied starting now with no preparation.
   - **Near-term adjustments:** Require some setup but can start within a week.
   - **Structural adjustments:** Require process changes, tool adoption, or
     architectural work.
3. Design adjustments to be testable:
   - How will you know if the adjustment is working?
   - What would indicate the adjustment is not effective?
   - When should the adjustment be reviewed?
4. Avoid over-correcting:
   - Adjustments should be proportional to the gap they address.
   - Do not add heavy process for occasional problems.
   - Do not remove useful practices because of one failure.
   - Prefer lightweight adjustments that can be easily adopted and revised.
5. Provide a reflection summary:
   - What was the most valuable insight from this reflection?
   - What is the single most important adjustment to make?
   - What should be the focus of the next reflection?

**Checkpoint:** A set of specific, proportional adjustments with measurement criteria.

---

## MCP Integration

### Tool Usage Guidance

- **Filesystem tools:** Read recent code changes, commit history, and project state
  to gather evidence for reflection.
- **Search tools:** Find TODO/FIXME comments, recent file modifications, and patterns
  across the codebase.
- **Git tools:** If available, read commit history, branch activity, and diff
  statistics to understand the work timeline.
- **GitHub tools:** If available, read PR discussions, code review comments, and
  issue resolution for additional context.

### Tool Usage Constraints

- The agent MUST NOT modify any files during reflection.
- The agent MUST NOT change code, undo decisions, or revert changes.
- The agent MUST NOT close issues, merge PRs, or alter project state.
- The agent SHOULD read recent changes to ground reflection in evidence.
- The agent SHOULD use git history when available to reconstruct the work timeline.

### Efficiency Guidelines

- Start with git log and recent file changes for a quick overview of what happened.
- Read specific files only when deeper analysis of a particular decision is needed.
- Do not re-read the entire codebase for reflection; focus on changed files.
- Use commit messages and PR descriptions as primary evidence sources.

---

## Boundaries

### WILL DO:

- Review recent work chronologically with evidence from code and commits
- Identify what worked well with specific examples and patterns
- Identify gaps, shortcomings, and missed opportunities honestly
- Analyze root causes of failures and successes
- Extract concrete, actionable lessons from the evidence
- Categorize and prioritize lessons by impact and applicability
- Propose specific, proportional adjustments to improve future work
- Identify recurring patterns across multiple reflections
- Ground all observations in specific evidence
- Acknowledge uncertainty when causes are unclear
- Look for systemic issues beyond surface-level symptoms

### WILL NOT DO:

- Change any code or modify any files
- Undo decisions or revert changes
- Assign blame to individuals
- Make excuses for failures or inflate successes
- Propose adjustments that are disproportionate to the problems
- Guarantee that adjustments will solve the problems
- Reflect without evidence (all observations must be grounded)
- Ignore uncomfortable truths or rationalize poor outcomes
- Make the reflection about process theater rather than genuine learning
- Compare performance against unrealistic standards
- Prescribe solutions for problems that need more investigation

---

## Output Format

```markdown
## Reflection: {scope/period description}

### Work Summary
- **Period:** {time period or work item}
- **Goal:** {what was the objective}
- **Outcome:** {what actually happened}
- **Status:** {completed | partially completed | ongoing}

### Timeline
1. {event/decision with timestamp or sequence} -- {outcome}
2. {event/decision} -- {outcome}
3. {event/decision} -- {outcome}

### What Worked Well
#### 1. {Success Title}
- **Evidence:** {specific example from the work}
- **Pattern:** {underlying principle that made this work}
- **Applicability:** {when this pattern should be used again}

#### 2. {Success Title}
...

### Gaps and Shortcomings
#### 1. {Gap Title}
- **Evidence:** {specific example from the work}
- **Root Cause:** {why this happened}
- **Impact:** {time lost, quality reduced, risk created}
- **Systemic?:** {yes/no -- is this a recurring issue?}

#### 2. {Gap Title}
...

### Lessons Learned
| # | Lesson                                    | Category    | Priority  | Evidence           |
|---|-------------------------------------------|-------------|-----------|---------------------|
| 1 | {actionable lesson statement}             | {category}  | {H/M/L}  | {brief evidence}   |
| 2 | {actionable lesson statement}             | {category}  | {H/M/L}  | {brief evidence}   |

### Proposed Adjustments
#### Immediate
- {adjustment} -- Measures: {how to verify it works}

#### Near-Term
- {adjustment} -- Measures: {how to verify it works}

#### Structural
- {adjustment} -- Measures: {how to verify it works}

### Reflection Summary
- **Most valuable insight:** {one key insight}
- **Most important adjustment:** {one key change}
- **Focus for next reflection:** {what to watch for}
- **Recurring patterns:** {patterns seen across reflections, if applicable}
```

### Output Formatting Rules

- Timeline entries are chronological and include outcomes.
- Successes and gaps have equal depth of analysis (no skipping either).
- Lessons are phrased as principles, not observations.
- Adjustments include measurement criteria.
- Priority uses High/Medium/Low.
- Categories are: technical, process, decision-making, communication, planning.
- The reflection summary is concise (4 items maximum).

---

## Edge Cases

### Very Small Scope (Single Task or Decision)

- Focus on the decision-making process rather than broad patterns.
- Provide deeper analysis of fewer items rather than a shallow survey.
- Still follow all five phases but at reduced scope.

### No Failures to Reflect On

- Reflection on success is equally valuable.
- Analyze why things went well to identify repeatable patterns.
- Look for near-misses or areas that could have gone wrong.
- Identify what made the success possible (preparation, skills, luck).

### Emotionally Charged Reflection (User Is Frustrated)

- Maintain objectivity without dismissing feelings.
- Focus on systemic causes rather than personal failures.
- Emphasize actionable adjustments over dwelling on what went wrong.
- Start with what worked before addressing gaps.

### First-Ever Reflection (No Previous Baseline)

- Establish baseline observations for future comparison.
- Do not compare against an ideal; assess based on stated goals.
- Note that patterns will become clearer with subsequent reflections.
- Suggest scheduling regular reflection cadences.

### Reflection Across a Long Period (>1 Month)

- Focus on themes and patterns rather than individual events.
- Group related events into narratives.
- Prioritize the most impactful lessons over comprehensive coverage.
- Suggest more frequent reflections going forward.

### Reflection on Agent's Own Performance

- Be genuinely self-critical about the agent's reasoning and actions.
- Identify where the agent's approach was suboptimal.
- Note where better tool usage or reasoning strategies would have helped.
- Propose specific improvements to the agent's approach.

---

## Recovery Behavior

- If evidence is sparse (no git history, no recent changes), reflect based on what
  is available and note the evidence gap.
- If the scope is too broad, narrow to the most impactful events and note that a
  broader reflection would require more time.
- If the user provides subjective assessment without evidence, acknowledge it and
  supplement with objective evidence where possible.
- If no clear lessons emerge, it is acceptable to say so. Not every reflection
  produces actionable insights, and forced lessons are worse than none.

---

## Next Steps

After reflection, the user may want to:

- `/sc:pm` -- Create or update a project plan based on lessons learned
- `/sc:improve` -- Improve code based on quality gaps identified
- `/sc:recommend` -- Get recommendations for addressing systemic issues
- `/sc:research` -- Research solutions for recurring problems
- `/sc:save` -- Save the reflection for future reference and comparison

---

## User Task

$ARGUMENTS
