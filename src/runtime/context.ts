import path from "node:path";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import { BUILTIN_DEFAULT_MODE, BUILTIN_DEFAULT_PERSONA, type RegistryData } from "../registry";

export interface RuntimeContextOptions {
  codexHome?: string;
  projectRoot?: string;
  mode?: string;
  persona?: string;
}

export interface RuntimeContext {
  mode: string;
  persona: string;
  source: {
    mode: "flag" | "project" | "user" | "builtin";
    persona: "flag" | "project" | "user" | "builtin";
  };
  userConfigPath: string;
  projectConfigPath: string;
}

export async function resolveRuntimeContext(
  registry: RegistryData,
  options: RuntimeContextOptions = {}
): Promise<RuntimeContext> {
  const codexPaths = getCodexPaths(options.codexHome);
  const projectRoot = options.projectRoot ?? process.cwd();
  const projectConfigPath = path.join(projectRoot, ".codex", "config.toml");

  const userConfig = await loadConfig(codexPaths.configPath);
  const projectConfig = (await pathExists(projectConfigPath)) ? await loadConfig(projectConfigPath) : {};

  const userDefaults = getRuntimeDefaults(userConfig);
  const projectDefaults = getRuntimeDefaults(projectConfig);

  const modeCandidate =
    options.mode ?? projectDefaults.defaultMode ?? userDefaults.defaultMode ?? BUILTIN_DEFAULT_MODE;
  const personaCandidate =
    options.persona ?? projectDefaults.defaultPersona ?? userDefaults.defaultPersona ?? BUILTIN_DEFAULT_PERSONA;

  const mode = registry.modes[modeCandidate] ? modeCandidate : BUILTIN_DEFAULT_MODE;
  const persona = registry.personas[personaCandidate] ? personaCandidate : BUILTIN_DEFAULT_PERSONA;

  return {
    mode,
    persona,
    source: {
      mode: options.mode
        ? "flag"
        : projectDefaults.defaultMode
          ? "project"
          : userDefaults.defaultMode
            ? "user"
            : "builtin",
      persona: options.persona
        ? "flag"
        : projectDefaults.defaultPersona
          ? "project"
          : userDefaults.defaultPersona
            ? "user"
            : "builtin"
    },
    userConfigPath: codexPaths.configPath,
    projectConfigPath
  };
}

export function getRuntimeDefaults(config: TomlTable): {
  defaultMode?: string;
  defaultPersona?: string;
} {
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  if (!supercodex || !isPlainObject(supercodex.runtime)) {
    return {};
  }

  const runtime = supercodex.runtime as TomlTable;
  return {
    defaultMode: typeof runtime.default_mode === "string" ? runtime.default_mode : undefined,
    defaultPersona: typeof runtime.default_persona === "string" ? runtime.default_persona : undefined
  };
}
