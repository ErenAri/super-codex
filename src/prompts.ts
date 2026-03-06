import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import { contentFileExists, loadContentFile, listContentFiles, type ContentCategory } from "./content-loader";
import { removePathWithRetry } from "./fs-retry";
import { pathExists } from "./fs-utils";
import { BUILTIN_ALIASES } from "./registry/aliases";
import type { AliasDefinition } from "./registry/types";
import { extractPurposeSummary, formatDisplayName, truncateText } from "./workflow-summary";

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
const INTERACTIVE_PROMPT_PREFIX = "supercodex-";
const LEGACY_INTERACTIVE_PROMPT_PREFIXES = ["sc-"];

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

  // Clean up managed legacy wrapper names after migration (e.g. sc-*.md).
  for (const legacyFileName of getLegacyInteractivePromptFileNames()) {
    if (Object.hasOwn(bundled, legacyFileName)) {
      continue;
    }

    const legacyPath = path.join(promptsDir, legacyFileName);
    if (!(await pathExists(legacyPath))) {
      continue;
    }

    const legacyContent = await readFile(legacyPath, "utf8");
    if (!legacyContent.includes(PROMPT_WRAPPER_MARKER)) {
      continue;
    }

    await removePathWithRetry(legacyPath, {
      rmOptions: {
        force: true
      }
    });
    changed = true;
  }

  return { changed, writtenFiles };
}

export async function removePromptPack(promptPackDir: string): Promise<boolean> {
  if (!(await pathExists(promptPackDir))) {
    return false;
  }

  await removePathWithRetry(promptPackDir, {
    rmOptions: {
      recursive: true,
      force: true
    }
  });
  return true;
}

export async function removeInteractivePromptCommands(promptsDir: string): Promise<boolean> {
  let changed = false;
  const bundled = new Set<string>([
    ...listBundledInteractivePromptCommands(),
    ...getLegacyInteractivePromptFileNames()
  ]);

  for (const fileName of Array.from(bundled).sort()) {
    const targetPath = path.join(promptsDir, fileName);
    if (!(await pathExists(targetPath))) {
      continue;
    }

    const content = await readFile(targetPath, "utf8");
    if (!content.includes(PROMPT_WRAPPER_MARKER)) {
      continue;
    }

    await removePathWithRetry(targetPath, {
      rmOptions: {
        force: true
      }
    });
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

    const fileName = getInteractivePromptFileName(alias.name);
    files[fileName] = renderInteractivePrompt(alias, workflow);
  }

  return files;
}

function getInteractivePromptCommandName(aliasName: string): string {
  return `${INTERACTIVE_PROMPT_PREFIX}${aliasName}`;
}

function getInteractivePromptFileName(aliasName: string): string {
  return `${getInteractivePromptCommandName(aliasName)}.md`;
}

function getLegacyInteractivePromptFileNames(): string[] {
  const files = new Set<string>();
  for (const aliasName of Object.keys(BUILTIN_ALIASES)) {
    for (const prefix of LEGACY_INTERACTIVE_PROMPT_PREFIXES) {
      files.add(`${prefix}${aliasName}.md`);
    }
  }
  return Array.from(files).sort();
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

  // Try alias-named command first, then workflow-named command, then base workflow scaffold.
  const aliasCommandContent = bundled[`commands/${alias.name}.md`];
  const workflowCommandContent = bundled[`commands/${workflow}.md`];
  const workflowScaffold = bundled[`${workflow}.md`] ?? bundled[`workflows/${workflow}.md`];
  const scaffold = aliasCommandContent ?? workflowCommandContent ?? workflowScaffold ?? "";

  const purposeSummary = extractPurposeSummary(scaffold, 110);
  const interactiveDescription = buildInteractiveDescription(alias, workflow, purposeSummary, mode, persona);
  const argumentHint = resolveArgumentHint(alias, workflow);
  const intentLine = purposeSummary ?? alias.description;

  return [
    "---",
    `description: ${interactiveDescription}`,
    `argument-hint: "${argumentHint}"`,
    "---",
    "",
    PROMPT_WRAPPER_MARKER,
    `# SuperCodex ${formatDisplayName(alias.name)}`,
    "",
    `- Slash Command: /prompts:${getInteractivePromptCommandName(alias.name)}`,
    `- SuperCodex Alias: /supercodex:${alias.name} (short: /sc:${alias.name})`,
    `- Intent: ${intentLine}`,
    `- Workflow: ${workflow}`,
    `- Mode: ${mode}`,
    `- Persona: ${persona}`,
    ...(alias.pack ? [`- Pack: ${alias.pack}`] : []),
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

const ARGUMENT_HINTS: Record<string, string> = {
  analyze: "<target|scope|focus>",
  brainstorm: "<problem|goal|constraints>",
  build: "<feature|requirements|constraints>",
  cleanup: "<module|debt|constraints>",
  debug: "<symptom|repro|context>",
  design: "<problem|constraints|architecture target>",
  document: "<audience|scope|source>",
  estimate: "<scope|constraints|timeline>",
  explain: "<code|module|question>",
  implement: "<spec|feature|requirements>",
  index: "<scope|format>",
  "index-repo": "<repo|scope|output>",
  load: "<context|goal>",
  plan: "<goal|constraints|deliverable>",
  pm: "<project|objective|constraints>",
  recommend: "<goal|constraints|options>",
  reflect: "<work|outcome|lessons>",
  refactor: "<target|constraints|safety>",
  research: "<topic|question|decision>",
  review: "<diff|module|risk focus>",
  save: "<summary|state>",
  "select-tool": "<task|constraints|environment>",
  spawn: "<goal|subtasks|constraints>",
  "spec-panel": "<spec|requirements|risk>",
  task: "<task|acceptance criteria>",
  test: "<target|test strategy|edge cases>",
  troubleshoot: "<issue|signals|context>",
  workflow: "<objective|handoffs|milestones>"
};

function resolveArgumentHint(alias: AliasDefinition, workflow: string): string {
  return ARGUMENT_HINTS[alias.name] ?? ARGUMENT_HINTS[workflow] ?? "<task>";
}

function buildInteractiveDescription(
  alias: AliasDefinition,
  workflow: string,
  purposeSummary: string | null,
  mode: string,
  persona: string
): string {
  const label = `SuperCodex ${formatDisplayName(alias.name)}`;
  const summary = purposeSummary ?? alias.description ?? `${workflow} workflow`;
  const profile = `${mode}/${persona}`;
  return truncateText(`${label}: ${summary} (${profile})`, 160);
}
