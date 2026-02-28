import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { loadConfig, writeConfig, type TomlTable } from "./config";
import { deepClone, deepEqual, isPlainObject, pathExists } from "./fs-utils";

const PROJECT_LAYER: TomlTable = {
  supercodex: {
    project: {
      enabled: true,
      prompts: ["plan", "review", "refactor", "debug"],
      checkpoints: true
    }
  }
};

const PROJECT_README = `# Project SuperCodex Layer

This project uses a local \`.codex/config.toml\` layer for team defaults.

## What this file does
- Enables a small project-scoped \`[supercodex.project]\` block.
- Declares the prompt workflow: plan, review, refactor, debug.

## Typical workflow
1. Run global install once:
   \`supercodex install\`
2. In this repo, plan first:
   Use prompt: \`~/.codex/prompts/supercodex/plan.md\`
3. Before merging, run:
   Use prompt: \`~/.codex/prompts/supercodex/review.md\`

## Notes
- Local project config is additive and non-destructive.
- Existing keys are preserved by default.
`;

export interface InitProjectResult {
  configPath: string;
  readmePath: string;
  configChanged: boolean;
  readmeChanged: boolean;
  skippedPaths: string[];
}

export async function initProjectTemplate(projectRoot = process.cwd()): Promise<InitProjectResult> {
  const codexDir = path.join(projectRoot, ".codex");
  const configPath = path.join(codexDir, "config.toml");
  const readmePath = path.join(codexDir, "README.md");

  await mkdir(codexDir, { recursive: true });

  const currentConfig = await loadConfig(configPath);
  const mergedConfig = deepClone(currentConfig);
  const skippedPaths: string[] = [];
  const configChanged = mergeMissingKeys(mergedConfig, PROJECT_LAYER, "", skippedPaths);

  if (configChanged) {
    await writeConfig(configPath, mergedConfig);
  }

  let readmeChanged = false;
  if (!(await pathExists(readmePath))) {
    await writeFile(readmePath, PROJECT_README, "utf8");
    readmeChanged = true;
  } else {
    const existing = await readFile(readmePath, "utf8");
    if (!deepEqual(existing, PROJECT_README)) {
      readmeChanged = false;
    }
  }

  return {
    configPath,
    readmePath,
    configChanged,
    readmeChanged,
    skippedPaths: skippedPaths.sort()
  };
}

function mergeMissingKeys(
  target: TomlTable,
  patch: TomlTable,
  rootPath: string,
  skippedPaths: string[]
): boolean {
  let changed = false;

  for (const [key, patchValue] of Object.entries(patch)) {
    const nextPath = rootPath ? `${rootPath}.${key}` : key;

    if (!Object.hasOwn(target, key)) {
      target[key] = deepClone(patchValue);
      changed = true;
      continue;
    }

    const existing = target[key];

    if (isPlainObject(existing) && isPlainObject(patchValue)) {
      changed =
        mergeMissingKeys(existing as TomlTable, patchValue as TomlTable, nextPath, skippedPaths) || changed;
      continue;
    }

    if (!deepEqual(existing, patchValue)) {
      skippedPaths.push(nextPath);
    }
  }

  return changed;
}
