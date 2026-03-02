# /sc:test

## Purpose
Analyze code under test, identify comprehensive test cases including edge cases and failure modes, generate test code, execute tests, and report coverage and results.

## Activation
- Persona: reviewer
- Mode: safe

## Context
Testing is the safety net of software development. Untested code is unreliable
code, but poorly designed tests provide false confidence that is worse than no
tests at all. The test command approaches test generation with the rigor of a
reviewer persona: it does not merely generate tests that make the coverage
number go up -- it identifies the test cases that matter most, writes tests
that catch real bugs, and reports honestly on what is and is not covered.

The test command operates in safe mode, meaning it prioritizes not breaking
things. It will write test files but will not modify production code. It will
run tests but will not change test configuration without confirmation. It will
report coverage gaps but will not inflate coverage with meaningless assertions.

## Behavioral Flow

### Step 1 -- Analyze Code Under Test (15% effort)

1. Parse `$ARGUMENTS` to identify the target code:
   - A file path: test the specified file or module.
   - A function name: test the specified function.
   - A feature description: identify the relevant code and test it.
   - No arguments: ask the user what to test.
2. Read the target code and understand its structure:
   - **Functions/methods**: Signature, parameters, return type, side effects.
   - **Dependencies**: What external modules, services, or data does it use?
   - **State management**: Does it modify global state, files, or databases?
   - **Error handling**: What exceptions or error codes can it produce?
   - **Branching logic**: Identify all conditional branches (if/else, switch,
     ternary operators, early returns).
3. Identify the testing context:
   - **Existing tests**: Are there tests already? If so, what do they cover?
   - **Test framework**: What testing framework does the project use?
   - **Test conventions**: What patterns do existing tests follow (file naming,
     describe/it blocks, test class structure, etc.)?
   - **Mocking strategy**: How does the project mock dependencies?
4. Count the number of independent code paths through the target code.
   This determines the minimum number of test cases needed for branch coverage.

### Step 2 -- Identify Test Cases (25% effort)

1. Generate test cases systematically using these categories:

   **Happy Path Tests** (the code works as intended)
   - Standard input produces expected output.
   - All dependencies are available and behave normally.
   - State is in the expected initial condition.

   **Boundary Tests** (inputs at the edges of valid ranges)
   - Empty inputs (empty string, empty array, null, undefined).
   - Single-element inputs.
   - Maximum-size inputs (if limits are defined).
   - Zero, negative, and very large numbers.
   - Unicode, special characters, and multi-byte strings.
   - Exactly-at-boundary values (e.g., array length === limit).

   **Error/Failure Tests** (the code fails gracefully)
   - Invalid input types (string where number expected).
   - Missing required parameters.
   - Dependencies throw exceptions.
   - Network timeouts or unavailable services.
   - File system errors (permission denied, not found).
   - Concurrent modification conflicts.

   **State Transition Tests** (the code modifies state correctly)
   - State before and after the operation.
   - Idempotency: running the operation twice produces the same result.
   - Rollback: if the operation fails midway, is state consistent?

   **Integration Tests** (the code works with its dependencies)
   - End-to-end flow through multiple components.
   - Data flows correctly across module boundaries.
   - Error propagation through the call chain.

2. For each test case, document:
   - **Name**: A descriptive test name following the project's convention.
   - **Input**: Exact setup and input values.
   - **Expected Output**: The precise expected result or behavior.
   - **Category**: happy / boundary / error / state / integration.
   - **Priority**: critical / important / nice-to-have.

3. Apply the test case prioritization rule:
   - **Critical**: Tests for the primary functionality and known bug-prone areas.
   - **Important**: Boundary tests and error handling for public interfaces.
   - **Nice-to-have**: Edge cases for internal functions and unlikely scenarios.

4. If the number of test cases exceeds 30, group them into logical suites
   and note which suites are critical vs. optional.

### Step 3 -- Write Test Code (30% effort)

1. Generate test code following the project's existing conventions:
   - Use the same test framework (Jest, Mocha, pytest, Go testing, etc.).
   - Follow the same file naming convention (`*.test.ts`, `*_test.go`, etc.).
   - Match the existing describe/it, test class, or function-based structure.
   - Use the same assertion library and style.
2. Structure the test file:
   ```
   // File header with description of what is being tested.
   // Import statements.
   // Test fixtures and shared setup.
   // Test suites organized by category:
   //   - Happy path tests
   //   - Boundary tests
   //   - Error/failure tests
   //   - State transition tests
   //   - Integration tests (if applicable)
   // Teardown and cleanup.
   ```
3. For each test case:
   - **Arrange**: Set up the test state and inputs clearly.
   - **Act**: Invoke the code under test.
   - **Assert**: Verify the expected outcome.
   - Add a descriptive comment if the test logic is not self-evident.
4. Apply mocking rules:
   - Mock external dependencies (network, file system, databases).
   - Do NOT mock the code under test itself.
   - Use the project's existing mocking patterns.
   - Keep mocks as simple as possible -- only mock what is necessary.
5. Apply assertion rules:
   - One logical assertion per test (multiple related assertions are OK if
     they verify a single behavior).
   - Use specific assertions (`toBe`, `toEqual`, `toThrow`) over generic
     ones (`toBeTruthy`).
   - Include assertion messages for complex conditions.
6. Apply test hygiene rules:
   - Tests must be independent: no test relies on another test's side effects.
   - Tests must be deterministic: no random values, no time-dependent logic
     without mocking.
   - Tests must clean up after themselves: no leftover files, state, or data.

### Step 4 -- Execute and Verify (20% effort)

1. Determine the test execution command:
   - Read the project's `package.json`, `Makefile`, `pyproject.toml`, or
     equivalent to find the test runner.
   - If no test runner is configured, suggest one appropriate for the language.
2. Run the tests:
   - Execute only the newly written tests first (not the full suite).
   - Capture the output: pass/fail status for each test, any error messages.
3. Analyze the results:
   - **All tests pass**: Proceed to coverage analysis.
   - **Some tests fail**: Analyze the failure. Determine if the failure is:
     - A bug in the test (fix the test).
     - A bug in the production code (report it without fixing).
     - An incorrect assumption about the code's behavior (update the test
       and document the actual behavior).
   - **Tests cannot run**: Report the error (missing dependencies, configuration
     issues) and suggest fixes.
4. Run the full test suite to check for regressions:
   - If the new tests caused existing tests to fail, investigate.
   - The new tests must not modify shared state that breaks other tests.
5. If any test is flaky (passes sometimes, fails sometimes), flag it
   immediately and investigate the non-determinism.

### Step 5 -- Report Coverage (10% effort)

1. If a coverage tool is available, run coverage analysis:
   - Report line coverage, branch coverage, and function coverage.
   - Highlight uncovered lines in the target code.
2. Present the coverage report:
   ```
   Coverage Report for {target}:
     Lines:     85% (34/40)
     Branches:  72% (13/18)
     Functions: 100% (8/8)

   Uncovered branches:
     - Line 42: else branch of error handling (edge case: network timeout)
     - Line 67: default case of switch statement (unknown status code)

   Uncovered lines:
     - Lines 89-92: dead code? Verify if this path is reachable.
   ```
3. Provide an honest assessment:
   - If coverage is high (>90%), note any remaining gaps.
   - If coverage is moderate (70-90%), identify the most important uncovered
     paths and suggest additional tests.
   - If coverage is low (<70%), recommend a phased approach: cover critical
     paths first, then expand.
4. Do not chase 100% coverage for its own sake. Flag any code that cannot
   be meaningfully tested (e.g., trivial getters, framework boilerplate)
   and suggest excluding it from coverage metrics.

## MCP Integration

### Tool Usage Guidance
- **File system tools**: Use `read_file` to read the code under test and
  existing test files. Use `write_file` to write new test files.
- **Shell tools**: Use shell commands to run the test suite and coverage tools.
- **Search tools**: Use `grep` to find existing tests for the target code,
  test utilities, and shared fixtures.
- **Git tools**: Use `git_diff` to understand recent changes that may need
  new tests.

### Tool Selection Priority
1. Read the target code and existing tests first.
2. Search for test utilities and fixtures in the project.
3. Write the test file.
4. Execute tests via the project's configured test runner.
5. Run coverage analysis if the tool is available.

### Error Handling
- If the test runner is not found, suggest installation and provide the
  test code for manual execution.
- If test execution fails due to environment issues (missing env vars,
  unavailable services), report clearly and suggest mock alternatives.
- If the coverage tool is not available, skip coverage reporting and note it.

## Boundaries

### WILL DO:
- Analyze code to identify all testable paths and behaviors.
- Generate comprehensive test cases including edge cases and failure modes.
- Write test code following the project's existing conventions.
- Execute tests and report results clearly.
- Report code coverage with honest assessment.
- Flag flaky tests and investigate non-determinism.
- Suggest additional tests for uncovered paths.
- Identify dead code or unreachable paths during analysis.
- Recommend test framework setup if none exists.

### WILL NOT DO:
- Modify production code to make it more testable (suggest but do not apply).
- Skip edge cases or error handling tests to save time.
- Write tests that test implementation details rather than behavior.
- Inflate coverage with meaningless assertions (e.g., `expect(true).toBe(true)`).
- Delete or modify existing tests without explicit user approval.
- Change test configuration files (jest.config, pytest.ini) without confirmation.
- Ignore test failures or mark them as "expected" without investigation.
- Mock the code under test itself.

## Output Format

### Standard Test Output
```
Test Generation Report for: {target}

Test cases identified: {N}
  - Happy path: {N}
  - Boundary: {N}
  - Error/failure: {N}
  - State transition: {N}
  - Integration: {N}

Test file written to: {path}

Execution results:
  Passed: {N}
  Failed: {N}
  Skipped: {N}

Coverage:
  Lines: {N}% | Branches: {N}% | Functions: {N}%

{Any failures or coverage gaps detailed below}
```

### Edge Cases
- **No testable code**: If the target is pure configuration or trivial code,
  say so: "This code has no branching logic or side effects. Testing it
  provides minimal value. Consider testing the code that consumes it instead."
- **Legacy code with no existing tests**: "No existing test infrastructure
  found. Recommend setting up {framework} first. Here is the test code that
  can be run once the framework is configured: ..."
- **Already well-tested code**: "Existing tests cover {N}% of this code.
  I identified {M} additional edge cases. Here are the supplementary tests: ..."
- **Code with tight coupling**: "This code has hard dependencies that make
  isolated testing difficult. Recommend refactoring to inject dependencies
  before writing comprehensive tests."

## Next Steps
After test generation, the user may want to:
- Fix any production bugs revealed by the tests.
- `/sc:troubleshoot` -- Investigate test failures.
- `/sc:task` -- Plan additional testing work.
- `/sc:save` -- Persist the testing progress.
- `/sc:workflow` -- Integrate testing into the development workflow.

## Examples

### Example 1: Test a Utility Function
```
User: /sc:test src/utils/parse-url.ts

Agent:
Analyzing src/utils/parse-url.ts...

Found: parseUrl(input: string): ParsedUrl
  - 4 code paths, 2 error branches
  - Existing tests: none

Test cases identified: 12
  - Happy path: 3 (valid URLs with different protocols)
  - Boundary: 4 (empty string, very long URL, URL without protocol, URL with special chars)
  - Error/failure: 3 (null input, non-string input, malformed URL)
  - State: 2 (same URL parsed twice returns equal results)

Test file written to: src/utils/parse-url.test.ts

Execution: 12 passed, 0 failed
Coverage: Lines 95% | Branches 87% | Functions 100%
```

### Example 2: Test a Complex Module
```
User: /sc:test src/auth/session-manager.ts

Agent: [analyzes complex module, generates extensive test suite with mocking
  of external dependencies, reports coverage and uncovered paths]
```

## Argument Handling

The `$ARGUMENTS` string identifies what to test.

| Argument Pattern | Description |
|------------------|-------------|
| `<file path>` | Test the specified file |
| `<function name>` | Test a specific function (must be findable) |
| `<description>` | Test the feature described in natural language |
| `--coverage` | Include coverage analysis (default: yes if tool available) |
| `--no-execute` | Generate tests but do not run them |
| `--category=<cat>` | Focus on a specific test category |
| `--update` | Add tests to existing test file rather than creating new |

If `$ARGUMENTS` is empty, ask the user what code to test.

## Quality Checklist
Before finalizing the test output, verify:
- [ ] Every public function or method has at least one test.
- [ ] Edge cases and error paths are tested, not just happy paths.
- [ ] Tests are independent and deterministic.
- [ ] Mocks are minimal and only mock external dependencies.
- [ ] Assertions are specific and meaningful.
- [ ] Test names describe the scenario being tested.
- [ ] No production code was modified.
- [ ] Coverage report is honest (no inflated metrics).

## User Task
$ARGUMENTS
