import os from "node:os";
import path from "node:path";

import { SUPERCODEX_PROMPT_PACK } from "./constants";

export interface CodexPaths {
  home: string;
  configPath: string;
  backupsDir: string;
  promptsDir: string;
  promptPackDir: string;
  supercodexDir: string;
  registryPath: string;
  commandsDir: string;
  agentsDir: string;
  modesDir: string;
  frameworkDir: string;
  skillsDir: string;
}

export function expandHomePath(inputPath: string): string {
  if (!inputPath.startsWith("~")) {
    return inputPath;
  }

  const home = os.homedir();
  if (inputPath === "~") {
    return home;
  }

  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(home, inputPath.slice(2));
  }

  return inputPath;
}

export function resolveCodexHome(codexHome?: string): string {
  const basePath = codexHome ?? process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  return path.resolve(expandHomePath(basePath));
}

export function getCodexPaths(codexHome?: string): CodexPaths {
  const home = resolveCodexHome(codexHome);
  const promptPackDir = path.join(home, "prompts", SUPERCODEX_PROMPT_PACK);

  return {
    home,
    configPath: path.join(home, "config.toml"),
    backupsDir: path.join(home, "backups"),
    promptsDir: path.join(home, "prompts"),
    promptPackDir,
    supercodexDir: path.join(home, "supercodex"),
    registryPath: path.join(home, "supercodex", "registry.toml"),
    commandsDir: path.join(promptPackDir, "commands"),
    agentsDir: path.join(promptPackDir, "agents"),
    modesDir: path.join(promptPackDir, "modes"),
    frameworkDir: path.join(promptPackDir, "framework"),
    skillsDir: path.join(promptPackDir, "skills")
  };
}
