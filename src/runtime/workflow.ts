import path from "node:path";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import type { RegistryData } from "../registry";
import { resolveRuntimeContext, type RuntimeContextOptions } from "./context";

export interface WorkflowResolutionOptions extends RuntimeContextOptions {
  workflow: string;
}

export interface WorkflowResolution {
  workflow: string;
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

const BASE_WORKFLOWS = new Set(["plan", "review", "refactor", "debug"]);

export function isBaseWorkflow(name: string): boolean {
  return BASE_WORKFLOWS.has(name);
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

  // First check for command-specific prompt in commands/ subdirectory
  if (!isBaseWorkflow(workflow)) {
    const commandPromptPath = path.join(promptPackDir, "commands", `${workflow}.md`);
    // If there's a config entry for this command, use it; otherwise default to commands/ path
    if (supercodex && isPlainObject(supercodex.prompts)) {
      const prompts = supercodex.prompts as TomlTable;
      const relative = prompts[workflow];
      if (typeof relative === "string" && relative.trim()) {
        const normalized = relative.replaceAll("\\", "/").replace(/^supercodex\//, "");
        return path.join(promptPackDir, normalized);
      }
    }
    return commandPromptPath;
  }

  // Base workflow: check config, then fall back to default path
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
