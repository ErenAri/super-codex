import path from "node:path";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

import { contentFileExists, loadContentFile, listContentFiles, type ContentCategory } from "./content-loader";
import { pathExists } from "./fs-utils";
import { BUILTIN_ALIASES } from "./registry/aliases";
import type { AliasDefinition } from "./registry/types";

let _bundledPrompts: Record<string, string> | null = null;

/**
 * Returns the bundled prompt content, keyed by install-relative path.
 * Loaded lazily from content/ files on first access.
 */
export function getBundledPrompts(): Record<string, string> {
  if (_bundledPrompts) {
    return _bundledPrompts;
  }

  _bundledPrompts = {};

  // Load workflow prompts (install as top-level: plan.md, review.md, etc.)
  for (const file of listContentFiles("workflows")) {
    _bundledPrompts[file] = loadContentFile("workflows", file);
  }

  // Load mode overlays (install as modes/deep.md, modes/fast.md, etc.)
  for (const file of listContentFiles("modes")) {
    _bundledPrompts[`modes/${file}`] = loadContentFile("modes", file);
  }

  // Load persona prompts (install as personas/architect.md, etc.)
  for (const file of listContentFiles("personas")) {
    _bundledPrompts[`personas/${file}`] = loadContentFile("personas", file);
  }

  // Load command prompts (install as commands/analyze.md, etc.)
  for (const file of listContentFiles("commands")) {
    _bundledPrompts[`commands/${file}`] = loadContentFile("commands", file);
  }

  // Load agent prompts (install as agents/pm.md, etc.)
  for (const file of listContentFiles("agents")) {
    _bundledPrompts[`agents/${file}`] = loadContentFile("agents", file);
  }

  // Load framework docs (install as framework/PRINCIPLES.md, etc.)
  for (const file of listContentFiles("framework")) {
    _bundledPrompts[`framework/${file}`] = loadContentFile("framework", file);
  }

  // Load skill content (install as skills/confidence-check/SKILL.md, etc.)
  for (const file of listContentFiles("skills")) {
    _bundledPrompts[`skills/${file}`] = loadContentFile("skills", file);
  }

  return _bundledPrompts;
}

/**
 * @deprecated Use getBundledPrompts() instead. Kept for backward compatibility.
 */
export const BUNDLED_PROMPTS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return getBundledPrompts()[prop];
  },
  has(_target, prop: string) {
    return prop in getBundledPrompts();
  },
  ownKeys() {
    return Object.keys(getBundledPrompts());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    const prompts = getBundledPrompts();
    if (prop in prompts) {
      return {
        configurable: true,
        enumerable: true,
        value: prompts[prop],
        writable: false
      };
    }
    return undefined;
  }
});

const PROMPT_WRAPPER_MARKER = "<!-- supercodex:managed-prompt-wrapper -->";

export interface PromptInstallResult {
  changed: boolean;
  writtenFiles: string[];
}

export function listBundledPrompts(): string[] {
  return Object.keys(getBundledPrompts()).sort();
}

export function listBundledInteractivePromptCommands(): string[] {
  return Object.keys(getBundledInteractivePromptFiles()).sort();
}

export async function installPromptPack(promptPackDir: string): Promise<PromptInstallResult> {
  await mkdir(promptPackDir, { recursive: true });

  let changed = false;
  const writtenFiles: string[] = [];
  const bundled = getBundledPrompts();

  for (const fileName of listBundledPrompts()) {
    const targetPath = path.join(promptPackDir, fileName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    const nextContent = bundled[fileName];
    let currentContent: string | null = null;

    if (await pathExists(targetPath)) {
      currentContent = await readFile(targetPath, "utf8");
    }

    if (currentContent !== nextContent) {
      await writeFile(targetPath, nextContent, "utf8");
      changed = true;
      writtenFiles.push(targetPath);
    }
  }

  return { changed, writtenFiles };
}

export async function installInteractivePromptCommands(promptsDir: string): Promise<PromptInstallResult> {
  await mkdir(promptsDir, { recursive: true });

  let changed = false;
  const writtenFiles: string[] = [];
  const bundled = getBundledInteractivePromptFiles();

  for (const fileName of Object.keys(bundled).sort()) {
    const targetPath = path.join(promptsDir, fileName);
    const nextContent = bundled[fileName];
    let currentContent: string | null = null;

    if (await pathExists(targetPath)) {
      currentContent = await readFile(targetPath, "utf8");
      if (currentContent !== nextContent && !currentContent.includes(PROMPT_WRAPPER_MARKER)) {
        continue;
      }
    }

    if (currentContent !== nextContent) {
      await writeFile(targetPath, nextContent, "utf8");
      changed = true;
      writtenFiles.push(targetPath);
    }
  }

  return { changed, writtenFiles };
}

export async function removePromptPack(promptPackDir: string): Promise<boolean> {
  if (!(await pathExists(promptPackDir))) {
    return false;
  }

  await rm(promptPackDir, { recursive: true, force: true });
  return true;
}

export async function removeInteractivePromptCommands(promptsDir: string): Promise<boolean> {
  let changed = false;
  const bundled = listBundledInteractivePromptCommands();

  for (const fileName of bundled) {
    const targetPath = path.join(promptsDir, fileName);
    if (!(await pathExists(targetPath))) {
      continue;
    }

    const content = await readFile(targetPath, "utf8");
    if (!content.includes(PROMPT_WRAPPER_MARKER)) {
      continue;
    }

    await rm(targetPath, { force: true });
    changed = true;
  }

  return changed;
}

export async function listInstalledPrompts(promptPackDir: string): Promise<string[]> {
  if (!(await pathExists(promptPackDir))) {
    return [];
  }

  return walkPromptFiles(promptPackDir, "");
}

export async function listInstalledInteractivePromptCommands(promptsDir: string): Promise<string[]> {
  const files = listBundledInteractivePromptCommands();
  const installed: string[] = [];

  for (const fileName of files) {
    if (await pathExists(path.join(promptsDir, fileName))) {
      installed.push(fileName);
    }
  }

  return installed.sort();
}

async function walkPromptFiles(baseDir: string, relativeDir: string): Promise<string[]> {
  const targetDir = path.join(baseDir, relativeDir);
  const entries = await readdir(targetDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const children = await walkPromptFiles(baseDir, relativePath);
      files.push(...children);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath.replaceAll("\\", "/"));
    }
  }

  return files.sort();
}

function getBundledInteractivePromptFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  for (const aliasName of Object.keys(BUILTIN_ALIASES).sort()) {
    const alias = BUILTIN_ALIASES[aliasName];
    const workflow = resolveWorkflowFromTarget(alias.target);
    if (!workflow) {
      continue;
    }

    const fileName = `sc-${alias.name}.md`;
    files[fileName] = renderInteractivePrompt(alias, workflow);
  }

  return files;
}

function resolveWorkflowFromTarget(target: string): string | null {
  if (target.startsWith("run.")) {
    return target.slice(4);
  }

  return null;
}

export function renderInteractivePrompt(
  alias: AliasDefinition,
  workflow: string
): string {
  const mode = alias.default_mode ?? "balanced";
  const persona = alias.default_persona ?? "architect";
  const bundled = getBundledPrompts();

  // Try command-specific content first, then fall back to workflow scaffold
  const commandContent = bundled[`commands/${alias.name}.md`];
  const scaffold = commandContent ?? bundled[`${workflow}.md`] ?? "";

  return [
    "---",
    `description: SuperCodex alias /sc:${alias.name}`,
    'argument-hint: "<task>"',
    "---",
    "",
    PROMPT_WRAPPER_MARKER,
    `# SuperCodex Alias: /sc:${alias.name}`,
    "",
    `- Workflow: ${workflow}`,
    `- Mode: ${mode}`,
    `- Persona: ${persona}`,
    "",
    "Use the workflow scaffold below and focus on the user task.",
    "",
    "## User Task",
    "$ARGUMENTS",
    "",
    "## Workflow Scaffold",
    scaffold.trimEnd(),
    ""
  ].join("\n");
}
