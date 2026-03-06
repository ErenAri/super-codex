import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { loadConfig, writeConfig, type TomlTable } from "./config";
import { deepClone, deepEqual, isPlainObject, pathExists } from "./fs-utils";

export type ProjectTemplatePresetId = "api-service" | "web-app" | "library" | "monorepo";

export interface ProjectTemplatePolicyDefaults {
  default_mode: string;
  default_persona: string;
  strictness: "standard" | "strict";
}

export interface ProjectTemplatePreset {
  id: ProjectTemplatePresetId;
  title: string;
  description: string;
  command_packs: string[];
  policy_defaults: ProjectTemplatePolicyDefaults;
  config_patch: TomlTable;
}

export interface ProjectTemplatePresetSummary {
  id: ProjectTemplatePresetId;
  title: string;
  description: string;
  command_packs: string[];
  policy_defaults: ProjectTemplatePolicyDefaults;
}

export interface InitProjectOptions {
  preset?: string;
}

export const DEFAULT_PROJECT_TEMPLATE_PRESET: ProjectTemplatePresetId = "library";

const PROJECT_TEMPLATE_PRESETS: Record<ProjectTemplatePresetId, ProjectTemplatePreset> = {
  "api-service": {
    id: "api-service",
    title: "API Service",
    description: "Backend/API service defaults with stricter review and security-focused quality gates.",
    command_packs: ["core-planning", "quality-review", "command-workflows"],
    policy_defaults: {
      default_mode: "safe",
      default_persona: "architect",
      strictness: "strict"
    },
    config_patch: {
      supercodex: {
        project: {
          enabled: true,
          preset: "api-service",
          checkpoints: true,
          prompts: ["plan", "implement", "review", "test"],
          command_packs: ["core-planning", "quality-review", "command-workflows"]
        },
        runtime: {
          default_mode: "safe",
          default_persona: "architect"
        },
        policy: {
          strictness: "strict"
        },
        lock: {
          path: ".supercodex.lock.json",
          enforce_in_ci: true
        }
      }
    }
  },
  "web-app": {
    id: "web-app",
    title: "Web App",
    description: "Frontend-heavy app defaults balancing delivery speed with accessibility and regression checks.",
    command_packs: ["core-planning", "quality-review", "refactor-delivery", "command-workflows"],
    policy_defaults: {
      default_mode: "balanced",
      default_persona: "architect",
      strictness: "standard"
    },
    config_patch: {
      supercodex: {
        project: {
          enabled: true,
          preset: "web-app",
          checkpoints: true,
          prompts: ["plan", "build", "review", "document"],
          command_packs: ["core-planning", "quality-review", "refactor-delivery", "command-workflows"]
        },
        runtime: {
          default_mode: "balanced",
          default_persona: "architect"
        },
        policy: {
          strictness: "standard"
        },
        lock: {
          path: ".supercodex.lock.json",
          enforce_in_ci: true
        }
      }
    }
  },
  library: {
    id: "library",
    title: "Library",
    description: "Reusable package defaults emphasizing stable public APIs and documentation quality.",
    command_packs: ["core-planning", "quality-review", "command-workflows"],
    policy_defaults: {
      default_mode: "safe",
      default_persona: "reviewer",
      strictness: "strict"
    },
    config_patch: {
      supercodex: {
        project: {
          enabled: true,
          preset: "library",
          checkpoints: true,
          prompts: ["plan", "review", "refactor", "debug"],
          command_packs: ["core-planning", "quality-review", "command-workflows"]
        },
        runtime: {
          default_mode: "safe",
          default_persona: "reviewer"
        },
        policy: {
          strictness: "strict"
        },
        lock: {
          path: ".supercodex.lock.json",
          enforce_in_ci: true
        }
      }
    }
  },
  monorepo: {
    id: "monorepo",
    title: "Monorepo",
    description: "Multi-package workspace defaults focused on coordination, release discipline, and reproducibility.",
    command_packs: ["core-planning", "quality-review", "refactor-delivery", "command-workflows"],
    policy_defaults: {
      default_mode: "deep",
      default_persona: "architect",
      strictness: "strict"
    },
    config_patch: {
      supercodex: {
        project: {
          enabled: true,
          preset: "monorepo",
          checkpoints: true,
          prompts: ["plan", "implement", "review", "workflow"],
          command_packs: ["core-planning", "quality-review", "refactor-delivery", "command-workflows"]
        },
        runtime: {
          default_mode: "deep",
          default_persona: "architect"
        },
        policy: {
          strictness: "strict"
        },
        lock: {
          path: ".supercodex.lock.json",
          enforce_in_ci: true
        }
      }
    }
  }
};

export interface InitProjectResult {
  projectRoot: string;
  preset: ProjectTemplatePresetSummary;
  configPath: string;
  readmePath: string;
  configChanged: boolean;
  readmeChanged: boolean;
  skippedPaths: string[];
}

export function listProjectTemplatePresets(): ProjectTemplatePresetSummary[] {
  return Object.values(PROJECT_TEMPLATE_PRESETS)
    .map((preset) => toPresetSummary(preset))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function getProjectTemplatePreset(presetId?: string): ProjectTemplatePresetSummary {
  return toPresetSummary(resolveProjectTemplatePreset(presetId));
}

export async function initProjectTemplate(
  projectRoot = process.cwd(),
  options: InitProjectOptions = {}
): Promise<InitProjectResult> {
  const preset = resolveProjectTemplatePreset(options.preset);
  const codexDir = path.join(projectRoot, ".codex");
  const configPath = path.join(codexDir, "config.toml");
  const readmePath = path.join(codexDir, "README.md");

  await mkdir(codexDir, { recursive: true });

  const currentConfig = await loadConfig(configPath);
  const mergedConfig = deepClone(currentConfig);
  const skippedPaths: string[] = [];
  const configChanged = mergeMissingKeys(mergedConfig, preset.config_patch, "", skippedPaths);

  if (configChanged) {
    await writeConfig(configPath, mergedConfig);
  }

  const expectedReadme = renderProjectReadme(preset);
  let readmeChanged = false;
  if (!(await pathExists(readmePath))) {
    await writeFile(readmePath, expectedReadme, "utf8");
    readmeChanged = true;
  } else {
    const existing = await readFile(readmePath, "utf8");
    if (!deepEqual(existing, expectedReadme)) {
      readmeChanged = false;
    }
  }

  return {
    projectRoot,
    preset: toPresetSummary(preset),
    configPath,
    readmePath,
    configChanged,
    readmeChanged,
    skippedPaths: skippedPaths.sort()
  };
}

function resolveProjectTemplatePreset(presetId?: string): ProjectTemplatePreset {
  const normalized = (presetId ?? DEFAULT_PROJECT_TEMPLATE_PRESET).trim().toLowerCase();
  if (!normalized) {
    return PROJECT_TEMPLATE_PRESETS[DEFAULT_PROJECT_TEMPLATE_PRESET];
  }

  if (Object.hasOwn(PROJECT_TEMPLATE_PRESETS, normalized)) {
    return PROJECT_TEMPLATE_PRESETS[normalized as ProjectTemplatePresetId];
  }

  const supported = listProjectTemplatePresets().map((preset) => preset.id).join(", ");
  throw new Error(
    `Unknown project preset "${presetId ?? ""}". Supported presets: ${supported}`
  );
}

function toPresetSummary(preset: ProjectTemplatePreset): ProjectTemplatePresetSummary {
  return {
    id: preset.id,
    title: preset.title,
    description: preset.description,
    command_packs: [...preset.command_packs],
    policy_defaults: {
      default_mode: preset.policy_defaults.default_mode,
      default_persona: preset.policy_defaults.default_persona,
      strictness: preset.policy_defaults.strictness
    }
  };
}

function renderProjectReadme(preset: ProjectTemplatePreset): string {
  const commandPacks = preset.command_packs.map((pack) => `\`${pack}\``).join(", ");
  return `# Project SuperCodex Layer

This project uses a local \`.codex/config.toml\` layer for team defaults.

## Applied preset
- Preset id: \`${preset.id}\`
- Title: ${preset.title}
- Description: ${preset.description}

## Preset defaults
- Command packs: ${commandPacks}
- Policy defaults:
  - mode: \`${preset.policy_defaults.default_mode}\`
  - persona: \`${preset.policy_defaults.default_persona}\`
  - strictness: \`${preset.policy_defaults.strictness}\`

## Typical workflow
1. Run global install once:
   \`supercodex install\`
2. Apply or refresh local project preset:
   \`supercodex init --preset ${preset.id} --refresh-lock\`
3. Before opening a PR:
   \`supercodex verify --strict\`

## Notes
- Local project config is additive and non-destructive.
- Existing keys are preserved by default.
- Commit \`.codex/config.toml\`, \`.codex/README.md\`, and \`.supercodex.lock.json\` for team reproducibility.
`;
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
