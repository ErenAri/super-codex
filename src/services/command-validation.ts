import { BUILTIN_COMMANDS } from "../registry";

export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSupercodexCommandSet(commandIds: string[]): CommandValidationResult {
  const requiredCommands = Object.keys(BUILTIN_COMMANDS);
  const commandSet = new Set(commandIds);
  const missingCommands = requiredCommands
    .filter((id) => !commandSet.has(id))
    .sort();

  if (missingCommands.length > 0) {
    return {
      valid: false,
      errors: [
        `Missing required commands: ${missingCommands.join(", ")}.`
      ]
    };
  }

  return {
    valid: true,
    errors: []
  };
}

export function validateSupercodexCommandCount(commandIds: string[]): CommandValidationResult {
  return validateSupercodexCommandSet(commandIds);
}
