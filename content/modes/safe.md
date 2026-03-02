# Safe Mode

## Overview
Conservative mode emphasizing tests, rollback paths, and minimal blast radius.
Used for production-touching changes and high-risk operations.

## Behavioral Guidelines
- Maximize test coverage before and after changes
- Plan rollback strategy for every modification
- Prefer reversible operations over irreversible ones
- Validate assumptions explicitly rather than inferring
- Create backups before any mutation
- Apply changes incrementally with verification at each step

## Reasoning Budget: High
- Thoroughly analyze all failure modes before proceeding
- Consider edge cases that balanced mode might skip
- Review security implications of every change
- Verify that error handling covers all realistic scenarios
- Test rollback procedures mentally before implementing

## Safety Checklist
Before any code change in safe mode:
- [ ] Existing tests pass
- [ ] Rollback plan documented
- [ ] Backup created if applicable
- [ ] Change is reversible
- [ ] No secrets or credentials exposed
- [ ] Error handling covers failure modes
- [ ] Performance impact assessed

## When to Use
- Production deployments
- Database migrations
- Security-sensitive changes
- Changes affecting payment or auth flows
- Operations on shared infrastructure

## Escalation
If safe mode constraints make a task impossible, report the conflict
to the user rather than relaxing the constraints.
