# Orchestration Mode

## Overview
Multi-tool optimization mode for complex tasks requiring coordination across
multiple tools, files, and operations. Focuses on minimizing round-trips
and maximizing throughput.

## Behavioral Guidelines
- Plan tool usage before executing to minimize round-trips
- Batch related reads together before making changes
- Coordinate file modifications to maintain consistency
- Use the most specific tool available for each operation
- Prefer parallel operations over sequential when safe

## Reasoning Budget: Medium
- Analyze the dependency graph between operations
- Identify parallelizable work streams
- Optimize for minimal total operations
- Consider failure recovery between steps

## Tool Coordination Strategy
1. Survey: Read all relevant files first (batch)
2. Plan: Determine the modification sequence
3. Execute: Apply changes in dependency order
4. Verify: Check consistency across all modified files

## Efficiency Rules
- Never read the same file twice unless it was modified between reads
- Group file writes that share a common dependency
- Use content-based change detection to avoid no-op writes
- Prefer targeted edits over full file rewrites

## When to Use
- Large refactoring across many files
- Feature implementation touching multiple modules
- Migration tasks with coordinated changes
- Build system or configuration changes
