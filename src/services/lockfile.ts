import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { loadConfig, type TomlTable } from "../config";
import { loadContentFile, listContentFiles } from "../content-loader";
import { deepEqual, isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import { renderInteractivePrompt } from "../prompts";
import { SUPERCODEX_VERSION } from "../constants";
import { loadRegistry } from "../registry";
import { evaluatePolicy } from "./policy";

export interface LockSettings {
  path: string;
  enforceInCi: boolean;
}

export interface SupercodexLock {
  schema_version: 1;
  supercodex_version: string;
  hashes: {
    registry_commands: string;
    alias_map: string;
    workflow_content: string;
    wrapper_content: string;
    metadata_doc: string;
    policy_report: string;
  };
  counts: {
    commands: number;
    aliases: number;
    workflows: number;
    wrappers: number;
  };
}

export interface LockReadResult {
  path: string;
  exists: boolean;
  lock: SupercodexLock | null;
}

export interface LockStatusResult {
  path: string;
  exists: boolean;
  inSync: boolean;
  differences: string[];
  expected: SupercodexLock;
  current: SupercodexLock | null;
}

export interface LockOptions {
  codexHome?: string;
  projectRoot?: string;
  pathOverride?: string;
}

export async function resolveLockSettings(options: LockOptions = {}): Promise<LockSettings> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const config = await loadSupercodexConfig(options.codexHome);
  const lock = isPlainObject(config.lock) ? (config.lock as TomlTable) : null;

  const configuredPath = typeof lock?.path === "string" && lock.path.trim().length > 0
    ? lock.path.trim()
    : ".supercodex.lock.json";

  const enforceInCi = typeof lock?.enforce_in_ci === "boolean"
    ? lock.enforce_in_ci
    : true;

  const targetPath = options.pathOverride
    ? options.pathOverride
    : configuredPath;
  const resolvedPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(projectRoot, targetPath);

  return {
    path: resolvedPath,
    enforceInCi
  };
}

export async function buildCurrentLock(options: LockOptions = {}): Promise<SupercodexLock> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const registryResult = await loadRegistry({
    codexHome: options.codexHome,
    projectRoot
  });
  const policyReport = await evaluatePolicy({
    codexHome: options.codexHome,
    projectRoot
  });

  const commandIds = Object.keys(registryResult.registry.commands).sort();
  const aliases = Object.values(registryResult.registry.aliases)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const workflowFiles = listContentFiles("workflows")
    .map((fileName) => `workflows/${fileName}`);
  const commandWorkflowFiles = listContentFiles("commands")
    .map((fileName) => `commands/${fileName}`);
  const workflowContentFiles = [...workflowFiles, ...commandWorkflowFiles].sort();

  const workflowHashInput = workflowContentFiles.map((relativePath) => {
    const [category, ...rest] = relativePath.split("/");
    const fileName = rest.join("/");
    const content = loadContentFile(category as "workflows" | "commands", fileName);
    return `${relativePath}\n${content}`;
  });

  const wrapperHashInput = aliases
    .map((alias) => {
      const workflow = alias.target.startsWith("run.") ? alias.target.slice(4) : null;
      if (!workflow) {
        return `supercodex-${alias.name}.md\n<non-workflow-target:${alias.target}>`;
      }
      const wrapper = renderInteractivePrompt(alias, workflow);
      return `supercodex-${alias.name}.md\n${wrapper}`;
    })
    .sort();

  const metadataPath = path.join(projectRoot, "docs", "METADATA.md");
  const metadataContent = await readOptionalUtf8(metadataPath);

  return {
    schema_version: 1,
    supercodex_version: SUPERCODEX_VERSION,
    hashes: {
      registry_commands: hashValue(commandIds),
      alias_map: hashValue(
        aliases.map((alias) => ({
          name: alias.name,
          target: alias.target,
          pack: alias.pack ?? "",
          mode: alias.default_mode ?? "",
          persona: alias.default_persona ?? "",
          stability: alias.stability ?? ""
        }))
      ),
      workflow_content: hashValue(workflowHashInput),
      wrapper_content: hashValue(wrapperHashInput),
      metadata_doc: hashValue(metadataContent),
      policy_report: hashValue(policyReport)
    },
    counts: {
      commands: commandIds.length,
      aliases: aliases.length,
      workflows: workflowContentFiles.length,
      wrappers: aliases.length
    }
  };
}

export async function readLock(options: LockOptions = {}): Promise<LockReadResult> {
  const settings = await resolveLockSettings(options);
  if (!(await pathExists(settings.path))) {
    return {
      path: settings.path,
      exists: false,
      lock: null
    };
  }

  const raw = await readFile(settings.path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse lock file at ${settings.path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!isSupercodexLock(parsed)) {
    throw new Error(`Lock file at ${settings.path} has invalid format.`);
  }

  return {
    path: settings.path,
    exists: true,
    lock: parsed
  };
}

export async function writeLock(options: LockOptions = {}): Promise<{ path: string; lock: SupercodexLock }> {
  const settings = await resolveLockSettings(options);
  const lock = await buildCurrentLock(options);
  await mkdir(path.dirname(settings.path), { recursive: true });
  await writeFile(settings.path, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return {
    path: settings.path,
    lock
  };
}

export async function checkLockStatus(options: LockOptions = {}): Promise<LockStatusResult> {
  const expected = await buildCurrentLock(options);
  const readResult = await readLock(options).catch((error) => {
    return {
      path: "",
      exists: true,
      lock: null,
      parseError: error instanceof Error ? error.message : String(error)
    };
  });

  if ("parseError" in readResult) {
    const settings = await resolveLockSettings(options);
    return {
      path: settings.path,
      exists: true,
      inSync: false,
      differences: [readResult.parseError],
      expected,
      current: null
    };
  }

  if (!readResult.exists || !readResult.lock) {
    return {
      path: readResult.path,
      exists: false,
      inSync: false,
      differences: [
        `Lock file missing at ${readResult.path}. Run "supercodex lock refresh" to generate it.`
      ],
      expected,
      current: null
    };
  }

  if (deepEqual(readResult.lock, expected)) {
    return {
      path: readResult.path,
      exists: true,
      inSync: true,
      differences: [],
      expected,
      current: readResult.lock
    };
  }

  return {
    path: readResult.path,
    exists: true,
    inSync: false,
    differences: computeLockDifferences(readResult.lock, expected),
    expected,
    current: readResult.lock
  };
}

function computeLockDifferences(current: SupercodexLock, expected: SupercodexLock): string[] {
  const differences: string[] = [];

  if (current.supercodex_version !== expected.supercodex_version) {
    differences.push(
      `supercodex_version: expected ${expected.supercodex_version}, found ${current.supercodex_version}`
    );
  }

  for (const key of Object.keys(expected.hashes) as Array<keyof SupercodexLock["hashes"]>) {
    if (current.hashes[key] !== expected.hashes[key]) {
      differences.push(`hashes.${key} differs`);
    }
  }

  for (const key of Object.keys(expected.counts) as Array<keyof SupercodexLock["counts"]>) {
    if (current.counts[key] !== expected.counts[key]) {
      differences.push(
        `counts.${key}: expected ${expected.counts[key]}, found ${current.counts[key]}`
      );
    }
  }

  return differences.length > 0
    ? differences
    : ["Lock file content differs from current state."];
}

function hashValue(value: unknown): string {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

async function loadSupercodexConfig(codexHome?: string): Promise<TomlTable> {
  const paths = getCodexPaths(codexHome);
  if (!(await pathExists(paths.configPath))) {
    return {};
  }
  const config = await loadConfig(paths.configPath);
  return isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : {};
}

function isSupercodexLock(value: unknown): value is SupercodexLock {
  if (!isPlainObject(value)) {
    return false;
  }

  const schemaVersion = value.schema_version;
  const version = value.supercodex_version;
  const hashes = value.hashes;
  const counts = value.counts;

  return schemaVersion === 1 &&
    typeof version === "string" &&
    isPlainObject(hashes) &&
    typeof hashes.registry_commands === "string" &&
    typeof hashes.alias_map === "string" &&
    typeof hashes.workflow_content === "string" &&
    typeof hashes.wrapper_content === "string" &&
    typeof hashes.metadata_doc === "string" &&
    typeof hashes.policy_report === "string" &&
    isPlainObject(counts) &&
    typeof counts.commands === "number" &&
    typeof counts.aliases === "number" &&
    typeof counts.workflows === "number" &&
    typeof counts.wrappers === "number";
}

async function readOptionalUtf8(filePath: string): Promise<string> {
  if (!(await pathExists(filePath))) {
    return "";
  }
  return readFile(filePath, "utf8");
}
