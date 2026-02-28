import path from "node:path";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import type { RegistryData } from "../registry";
import { resolveRuntimeContext, type RuntimeContextOptions } from "./context";

export interface WorkflowResolutionOptions extends RuntimeContextOptions {
  workflow: "plan" | "review" | "refactor" | "debug";
}

export interface WorkflowResolution {
  workflow: "plan" | "review" | "refactor" | "debug";
  promptPath: string;
  mode: string;
  persona: string;
  modeSource: "flag" | "project" | "user" | "builtin";
  personaSource: "flag" | "project" | "user" | "builtin";
  overlays: {
    modePrompt?: string;
    personaPrompt?: string;
  };
}

export async function resolveWorkflow(
  registry: RegistryData,
  options: WorkflowResolutionOptions
): Promise<WorkflowResolution> {
  const context = await resolveRuntimeContext(registry, options);
  const codexPaths = getCodexPaths(options.codexHome);
  const config = (await pathExists(codexPaths.configPath)) ? await loadConfig(codexPaths.configPath) : {};

  const promptPath = resolvePromptPath(config, codexPaths.promptPackDir, options.workflow);
  const modePrompt = registry.modes[context.mode]?.prompt_overlay;
  const personaPrompt = registry.personas[context.persona]?.system_prompt;

  return {
    workflow: options.workflow,
    promptPath,
    mode: context.mode,
    persona: context.persona,
    modeSource: context.source.mode,
    personaSource: context.source.persona,
    overlays: {
      modePrompt,
      personaPrompt
    }
  };
}

function resolvePromptPath(config: TomlTable, promptPackDir: string, workflow: string): string {
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  if (!supercodex || !isPlainObject(supercodex.prompts)) {
    return path.join(promptPackDir, `${workflow}.md`);
  }

  const prompts = supercodex.prompts as TomlTable;
  const relative = prompts[workflow];
  if (typeof relative !== "string" || !relative.trim()) {
    return path.join(promptPackDir, `${workflow}.md`);
  }

  const normalized = relative.replaceAll("\\", "/").replace(/^supercodex\//, "");
  return path.join(promptPackDir, normalized);
}
