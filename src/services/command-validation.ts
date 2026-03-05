import { listContentFiles } from "../content-loader";
import { BUILTIN_COMMANDS } from "../registry";

export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSupercodexCommandSet(commandIds: string[]): CommandValidationResult {
  const errors: string[] = [];
  const requiredCommands = Object.keys(BUILTIN_COMMANDS);
  const commandSet = new Set(commandIds);
  const missingCommands = requiredCommands
    .filter((id) => !commandSet.has(id))
    .sort();
  if (missingCommands.length > 0) {
    errors.push(`Missing required commands: ${missingCommands.join(", ")}.`);
  }

  const builtinRunCommands = requiredCommands
    .filter((id) => id.startsWith("run."))
    .sort();
  const expectedRunCommands = resolveExpectedRunCommands();
  const expectedRunSet = new Set(expectedRunCommands);
  const builtinRunSet = new Set(builtinRunCommands);

  const runCommandsMissingContent = builtinRunCommands
    .filter((id) => !expectedRunSet.has(id))
    .sort();
  if (runCommandsMissingContent.length > 0) {
    errors.push(
      `Built-in run commands missing workflow content: ${runCommandsMissingContent.join(", ")}.`
    );
  }

  const workflowContentMissingCommands = expectedRunCommands
    .filter((id) => !builtinRunSet.has(id))
    .sort();
  if (workflowContentMissingCommands.length > 0) {
    errors.push(
      `Workflow content files missing built-in run commands: ${workflowContentMissingCommands.join(", ")}.`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSupercodexCommandCount(commandIds: string[]): CommandValidationResult {
  return validateSupercodexCommandSet(commandIds);
}

function resolveExpectedRunCommands(): string[] {
  const baseWorkflows = ["plan", "review", "refactor", "debug"];
  const workflowCommands = listContentFiles("commands")
    .map((fileName) => fileName.replace(/\.md$/i, ""))
    .map((commandName) => `run.${commandName}`);

  return Array.from(
    new Set([
      ...baseWorkflows.map((name) => `run.${name}`),
      ...workflowCommands
    ])
  ).sort();
}
