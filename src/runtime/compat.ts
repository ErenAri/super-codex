import type { RegistryData } from "../registry";

export interface CompatibilityResult {
  ok: boolean;
  errors: string[];
  details: string[];
}

export interface CompatibilityPolicyOptions {
  dryRun?: boolean;
  explain?: boolean;
}

export function checkCompatibility(
  registry: RegistryData,
  commandId: string,
  mode: string,
  persona: string,
  policyOptions: CompatibilityPolicyOptions = {}
): CompatibilityResult {
  const definition = registry.commands[commandId];
  if (!definition) {
    return {
      ok: false,
      errors: [`Unknown command "${commandId}".`],
      details: []
    };
  }

  const errors: string[] = [];
  const details: string[] = [];
  if (definition.enabled === false) {
    errors.push(`Command "${commandId}" is disabled.`);
  } else {
    details.push(`Command "${commandId}" is enabled.`);
  }

  if (
    definition.mode_compatible.length > 0 &&
    !definition.mode_compatible.includes(mode)
  ) {
    errors.push(`Mode "${mode}" is not compatible with command "${commandId}".`);
  } else {
    details.push(`Mode "${mode}" is allowed for "${commandId}".`);
  }

  if (
    definition.persona_compatible.length > 0 &&
    !definition.persona_compatible.includes(persona)
  ) {
    errors.push(`Persona "${persona}" is not compatible with command "${commandId}".`);
  } else {
    details.push(`Persona "${persona}" is allowed for "${commandId}".`);
  }

  if (mode === "safe" && isSafeModeWriteCommand(commandId)) {
    if (!policyOptions.dryRun) {
      errors.push(
        `Safe mode requires --dry-run for write-capable workflow "${commandId}".`
      );
    } else {
      details.push(`Safe mode dry-run gate passed for "${commandId}".`);
    }

    if (!policyOptions.explain) {
      errors.push(
        `Safe mode requires --explain for write-capable workflow "${commandId}".`
      );
    } else {
      details.push(`Safe mode explain gate passed for "${commandId}".`);
    }
  }

  return { ok: errors.length === 0, errors, details };
}

function isSafeModeWriteCommand(commandId: string): boolean {
  return commandId === "run.build" ||
    commandId === "run.implement" ||
    commandId === "run.refactor" ||
    commandId === "run.cleanup" ||
    commandId === "run.improve";
}
