import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as TOML from "@iarna/toml";

import { SUPERCODEX_DEFAULT_AGENT, SUPERCODEX_PROMPT_PACK, SUPERCODEX_VERSION } from "./constants";
import { deepClone, deepEqual, isPlainObject, pathExists } from "./fs-utils";
import {
  BUILTIN_CATALOG_VERSION,
  BUILTIN_COMMANDS,
  BUILTIN_DEFAULT_MODE,
  BUILTIN_DEFAULT_PERSONA,
  BUILTIN_MODES,
  BUILTIN_PERSONAS
} from "./registry/builtins";

export type TomlTable = Record<string, unknown>;

export interface InstallSpec {
  supercodex: TomlTable;
  agents: Record<string, TomlTable>;
  mcpServers: Record<string, TomlTable>;
}

export interface MergeWarning {
  path: string;
  message: string;
  desired: unknown;
}

export interface MergeOutcome {
  config: TomlTable;
  changed: boolean;
  warnings: MergeWarning[];
}

export interface UninstallOutcome {
  config: TomlTable;
  changed: boolean;
  removedAgents: string[];
  removedMcpServers: string[];
}

interface EnsureObjectResult {
  table: TomlTable | null;
  changed: boolean;
}

interface NamedMergeResult {
  changed: boolean;
  appliedNames: string[];
}

export async function loadConfig(configPath: string): Promise<TomlTable> {
  if (!(await pathExists(configPath))) {
    return {};
  }

  const raw = await readFile(configPath, "utf8");
  if (!raw.trim()) {
    return {};
  }

  const parsed = TOML.parse(raw) as unknown;
  if (!isPlainObject(parsed)) {
    return {};
  }

  return parsed as TomlTable;
}

export async function writeConfig(configPath: string, config: TomlTable): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  const serialized = TOML.stringify(config as Parameters<typeof TOML.stringify>[0]);
  await writeFile(configPath, serialized, "utf8");
}

export function createInstallSpec(promptPackDir: string, version = SUPERCODEX_VERSION): InstallSpec {
  const modeTable: TomlTable = {};
  for (const [name, definition] of Object.entries(BUILTIN_MODES)) {
    modeTable[name] = {
      description: definition.description,
      prompt_overlay: definition.prompt_overlay ?? "",
      reasoning_budget: definition.reasoning_budget ?? "medium",
      temperature: definition.temperature ?? 0.2
    };
  }

  const personaTable: TomlTable = {};
  for (const [name, definition] of Object.entries(BUILTIN_PERSONAS)) {
    personaTable[name] = {
      description: definition.description,
      policy_tags: definition.policy_tags ?? []
    };
  }

  const commandTable: TomlTable = {};
  for (const [name, definition] of Object.entries(BUILTIN_COMMANDS)) {
    commandTable[name] = {
      description: definition.description,
      enabled: definition.enabled,
      mode_compatible: definition.mode_compatible,
      persona_compatible: definition.persona_compatible
    };
  }

  return {
    supercodex: {
      enabled: true,
      version,
      prompt_pack: SUPERCODEX_PROMPT_PACK,
      prompts_dir: promptPackDir,
      runtime: {
        default_mode: BUILTIN_DEFAULT_MODE,
        default_persona: BUILTIN_DEFAULT_PERSONA,
        catalog_version: BUILTIN_CATALOG_VERSION
      },
      prompts: {
        plan: "supercodex/plan.md",
        review: "supercodex/review.md",
        refactor: "supercodex/refactor.md",
        debug: "supercodex/debug.md"
      },
      modes: modeTable,
      personas: personaTable,
      commands: commandTable,
      framework: {
        principles: "supercodex/framework/PRINCIPLES.md",
        rules: "supercodex/framework/RULES.md",
        flags: "supercodex/framework/FLAGS.md"
      },
      catalog: {
        source: "local",
        installed_ids: []
      },
      doctor: {
        last_run_at: "",
        last_status: "unknown"
      }
    },
    agents: {
      [SUPERCODEX_DEFAULT_AGENT]: {
        description: "SuperCodex structured planning profile",
        prompt: "supercodex/plan.md"
      }
    },
    mcpServers: {}
  };
}

export function mergeSupercodexPatch(current: TomlTable, patch: TomlTable, force = false): MergeOutcome {
  return mergeInstallConfig(
    current,
    {
      supercodex: patch,
      agents: {},
      mcpServers: {}
    },
    force
  );
}

export function mergeInstallConfig(current: TomlTable, spec: InstallSpec, force = false): MergeOutcome {
  const next = deepClone(current);
  const warnings: MergeWarning[] = [];
  let changed = false;

  const ensureSupercodex = ensureObjectTable(next, "supercodex", force, warnings, "supercodex", {
    install_spec: spec.supercodex
  });
  changed = changed || ensureSupercodex.changed;

  const supercodexTable = ensureSupercodex.table;
  if (supercodexTable) {
    changed =
      mergeObject(supercodexTable, spec.supercodex, "supercodex", force, warnings, supercodexTable) || changed;
  }

  const mergedAgents = mergeNamedEntries(next, "agents", spec.agents, force, warnings, supercodexTable);
  changed = changed || mergedAgents.changed;
  if (supercodexTable && mergedAgents.appliedNames.length > 0) {
    changed =
      mergeManagedNames(supercodexTable, "agents", mergedAgents.appliedNames, force, warnings) || changed;
  }

  const mergedMcpServers = mergeNamedEntries(next, "mcp_servers", spec.mcpServers, force, warnings, supercodexTable);
  changed = changed || mergedMcpServers.changed;
  if (supercodexTable && mergedMcpServers.appliedNames.length > 0) {
    changed =
      mergeManagedNames(supercodexTable, "mcp_servers", mergedMcpServers.appliedNames, force, warnings) || changed;
  }

  return { config: next, changed, warnings };
}

export function mergeMcpServerConfig(
  current: TomlTable,
  serverName: string,
  serverDefinition: TomlTable,
  force = false
): MergeOutcome {
  const next = deepClone(current);
  const warnings: MergeWarning[] = [];
  let changed = false;

  const ensureSupercodex = ensureObjectTable(next, "supercodex", force, warnings, "supercodex", {
    managed: { mcp_servers: [serverName] }
  });
  changed = changed || ensureSupercodex.changed;

  const supercodexTable = ensureSupercodex.table;
  const mcpMerge = mergeNamedEntries(
    next,
    "mcp_servers",
    { [serverName]: serverDefinition },
    force,
    warnings,
    supercodexTable
  );
  changed = changed || mcpMerge.changed;

  if (supercodexTable && mcpMerge.appliedNames.includes(serverName)) {
    changed =
      mergeManagedNames(supercodexTable, "mcp_servers", [serverName], force, warnings) || changed;
  }

  return { config: next, changed, warnings };
}

export function removeSupercodexManagedSections(current: TomlTable): UninstallOutcome {
  const next = deepClone(current);
  let changed = false;
  const removedAgents: string[] = [];
  const removedMcpServers: string[] = [];

  const supercodex = isPlainObject(next.supercodex) ? (next.supercodex as TomlTable) : null;
  const managedAgents = readManagedNames(supercodex, "agents");
  const managedMcpServers = readManagedNames(supercodex, "mcp_servers");

  if (isPlainObject(next.agents)) {
    const agentTable = next.agents as TomlTable;
    for (const agentName of managedAgents) {
      if (Object.hasOwn(agentTable, agentName)) {
        delete agentTable[agentName];
        removedAgents.push(agentName);
        changed = true;
      }
    }
  }

  if (isPlainObject(next.mcp_servers)) {
    const mcpTable = next.mcp_servers as TomlTable;
    for (const serverName of managedMcpServers) {
      if (Object.hasOwn(mcpTable, serverName)) {
        delete mcpTable[serverName];
        removedMcpServers.push(serverName);
        changed = true;
      }
    }
  }

  if (isPlainObject(next.agents) && Object.keys(next.agents as TomlTable).length === 0) {
    delete next.agents;
    changed = true;
  }

  if (isPlainObject(next.mcp_servers) && Object.keys(next.mcp_servers as TomlTable).length === 0) {
    delete next.mcp_servers;
    changed = true;
  }

  if (Object.hasOwn(next, "supercodex")) {
    delete next.supercodex;
    changed = true;
  }

  return {
    config: next,
    changed,
    removedAgents: removedAgents.sort(),
    removedMcpServers: removedMcpServers.sort()
  };
}

export function getManagedNames(config: TomlTable): { agents: string[]; mcpServers: string[] } {
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  return {
    agents: readManagedNames(supercodex, "agents"),
    mcpServers: readManagedNames(supercodex, "mcp_servers")
  };
}

function mergeNamedEntries(
  config: TomlTable,
  tableKey: "agents" | "mcp_servers",
  desiredEntries: Record<string, TomlTable>,
  force: boolean,
  warnings: MergeWarning[],
  supercodexTable: TomlTable | null
): NamedMergeResult {
  if (Object.keys(desiredEntries).length === 0) {
    return { changed: false, appliedNames: [] };
  }

  let changed = false;
  const appliedNames: string[] = [];

  const ensureTable = ensureObjectTable(config, tableKey, force, warnings, tableKey, desiredEntries);
  changed = changed || ensureTable.changed;
  if (!ensureTable.table) {
    return { changed, appliedNames };
  }

  const table = ensureTable.table;

  for (const [entryName, desiredValue] of Object.entries(desiredEntries)) {
    if (!Object.hasOwn(table, entryName)) {
      table[entryName] = deepClone(desiredValue);
      changed = true;
      appliedNames.push(entryName);
      continue;
    }

    const existingValue = table[entryName];
    if (deepEqual(existingValue, desiredValue)) {
      appliedNames.push(entryName);
      continue;
    }

    if (force) {
      table[entryName] = deepClone(desiredValue);
      changed = true;
      appliedNames.push(entryName);
      continue;
    }

    changed =
      addOverride(supercodexTable, `${tableKey}.${entryName}`, desiredValue, warnings) || changed;
  }

  return { changed, appliedNames };
}

function mergeObject(
  target: TomlTable,
  desired: TomlTable,
  rootPath: string,
  force: boolean,
  warnings: MergeWarning[],
  supercodexTable: TomlTable | null
): boolean {
  let changed = false;

  for (const [key, desiredValue] of Object.entries(desired)) {
    const currentPath = `${rootPath}.${key}`;

    if (!Object.hasOwn(target, key)) {
      target[key] = deepClone(desiredValue);
      changed = true;
      continue;
    }

    const existingValue = target[key];

    if (isPlainObject(existingValue) && isPlainObject(desiredValue)) {
      changed =
        mergeObject(existingValue as TomlTable, desiredValue as TomlTable, currentPath, force, warnings, supercodexTable) ||
        changed;
      continue;
    }

    if (Array.isArray(existingValue) && Array.isArray(desiredValue) && isManagedListPath(currentPath)) {
      const mergedList = mergeStringList(existingValue, desiredValue);
      if (!deepEqual(existingValue, mergedList)) {
        target[key] = mergedList;
        changed = true;
      }
      continue;
    }

    if (deepEqual(existingValue, desiredValue)) {
      continue;
    }

    if (force) {
      target[key] = deepClone(desiredValue);
      changed = true;
      continue;
    }

    changed = addOverride(supercodexTable, currentPath, desiredValue, warnings) || changed;
  }

  return changed;
}

function mergeManagedNames(
  supercodexTable: TomlTable,
  key: "agents" | "mcp_servers",
  names: string[],
  force: boolean,
  warnings: MergeWarning[]
): boolean {
  const normalizedNames = Array.from(new Set(names)).sort();
  if (normalizedNames.length === 0) {
    return false;
  }

  let changed = false;

  if (!Object.hasOwn(supercodexTable, "managed")) {
    supercodexTable.managed = {};
    changed = true;
  }

  if (!isPlainObject(supercodexTable.managed)) {
    if (force) {
      supercodexTable.managed = {};
      changed = true;
    } else {
      changed =
        addOverride(supercodexTable, `supercodex.managed.${key}`, normalizedNames, warnings) || changed;
      return changed;
    }
  }

  const managedTable = supercodexTable.managed as TomlTable;
  if (!Object.hasOwn(managedTable, key)) {
    managedTable[key] = normalizedNames;
    return true;
  }

  if (!Array.isArray(managedTable[key])) {
    if (force) {
      managedTable[key] = normalizedNames;
      return true;
    }

    changed =
      addOverride(supercodexTable, `supercodex.managed.${key}`, normalizedNames, warnings) || changed;
    return changed;
  }

  const merged = mergeStringList(managedTable[key] as unknown[], normalizedNames);
  if (!deepEqual(managedTable[key], merged)) {
    managedTable[key] = merged;
    changed = true;
  }

  return changed;
}

function ensureObjectTable(
  root: TomlTable,
  key: string,
  force: boolean,
  warnings: MergeWarning[],
  warningPath: string,
  desiredValue: unknown
): EnsureObjectResult {
  if (!Object.hasOwn(root, key)) {
    const nextTable: TomlTable = {};
    root[key] = nextTable;
    return { table: nextTable, changed: true };
  }

  const existingValue = root[key];
  if (isPlainObject(existingValue)) {
    return { table: existingValue as TomlTable, changed: false };
  }

  if (force) {
    const nextTable: TomlTable = {};
    root[key] = nextTable;
    return { table: nextTable, changed: true };
  }

  warnings.push({
    path: warningPath,
    desired: deepClone(desiredValue),
    message:
      `Conflict at "${warningPath}". Existing non-table value was preserved. ` +
      `Re-run with --force to replace it.`
  });
  return { table: null, changed: false };
}

function addOverride(
  supercodexTable: TomlTable | null,
  conflictPath: string,
  desiredValue: unknown,
  warnings: MergeWarning[]
): boolean {
  warnings.push({
    path: conflictPath,
    desired: deepClone(desiredValue),
    message:
      `Conflict at "${conflictPath}". Existing value was preserved and desired value ` +
      `was recorded under [supercodex.overrides]. Re-run with --force to apply.`
  });

  if (!supercodexTable) {
    return false;
  }

  let changed = false;
  if (!Object.hasOwn(supercodexTable, "overrides")) {
    supercodexTable.overrides = {};
    changed = true;
  }

  if (!isPlainObject(supercodexTable.overrides)) {
    supercodexTable.overrides = {};
    changed = true;
  }

  const overrides = supercodexTable.overrides as TomlTable;
  if (!deepEqual(overrides[conflictPath], desiredValue)) {
    overrides[conflictPath] = deepClone(desiredValue);
    changed = true;
  }

  return changed;
}

function readManagedNames(supercodexTable: TomlTable | null, key: "agents" | "mcp_servers"): string[] {
  if (!supercodexTable || !isPlainObject(supercodexTable.managed)) {
    return [];
  }

  const managedValue = (supercodexTable.managed as TomlTable)[key];
  if (!Array.isArray(managedValue)) {
    return [];
  }

  return managedValue
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim())
    .sort();
}

function mergeStringList(existing: unknown[], desired: unknown[]): string[] {
  const merged = new Set<string>();

  for (const value of existing) {
    if (typeof value === "string" && value.trim().length > 0) {
      merged.add(value.trim());
    }
  }

  for (const value of desired) {
    if (typeof value === "string" && value.trim().length > 0) {
      merged.add(value.trim());
    }
  }

  return Array.from(merged).sort();
}

function isManagedListPath(pathValue: string): boolean {
  return pathValue === "supercodex.managed.agents" || pathValue === "supercodex.managed.mcp_servers";
}
