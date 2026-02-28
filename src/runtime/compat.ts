import type { RegistryData } from "../registry";

export interface CompatibilityResult {
  ok: boolean;
  errors: string[];
}

export function checkCompatibility(
  registry: RegistryData,
  commandId: string,
  mode: string,
  persona: string
): CompatibilityResult {
  const definition = registry.commands[commandId];
  if (!definition) {
    return { ok: false, errors: [`Unknown command "${commandId}".`] };
  }

  const errors: string[] = [];
  if (definition.enabled === false) {
    errors.push(`Command "${commandId}" is disabled.`);
  }

  if (
    definition.mode_compatible.length > 0 &&
    !definition.mode_compatible.includes(mode)
  ) {
    errors.push(`Mode "${mode}" is not compatible with command "${commandId}".`);
  }

  if (
    definition.persona_compatible.length > 0 &&
    !definition.persona_compatible.includes(persona)
  ) {
    errors.push(`Persona "${persona}" is not compatible with command "${commandId}".`);
  }

  return { ok: errors.length === 0, errors };
}
