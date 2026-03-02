import { mkdir } from "node:fs/promises";

import { createTimestampedBackup, type BackupResult } from "./backup";
import {
  createInstallSpec,
  getManagedNames,
  loadConfig,
  mergeInstallConfig,
  mergeMcpServerConfig,
  mergeSupercodexPatch,
  removeSupercodexManagedSections,
  type MergeWarning,
  type TomlTable,
  writeConfig
} from "./config";
import { isPlainObject, pathExists } from "./fs-utils";
import {
  buildServerDefinitionFromCatalog,
  getMcpServerFromConfig,
  listMcpServersFromConfig,
  testMcpServer
} from "./mcp";
import { getCodexPaths } from "./paths";
import {
  installPromptPack,
  installInteractivePromptCommands,
  listBundledPrompts,
  listBundledInteractivePromptCommands,
  listInstalledPrompts,
  listInstalledInteractivePromptCommands,
  removeInteractivePromptCommands,
  removePromptPack
} from "./prompts";
import { BUILTIN_CATALOG_VERSION, type CatalogEntry } from "./registry";

export interface OperationOptions {
  codexHome?: string;
  force?: boolean;
  now?: Date;
}

export interface InstallResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  configChanged: boolean;
  promptChanged: boolean;
  warnings: MergeWarning[];
}

export interface UninstallResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  configChanged: boolean;
  promptRemoved: boolean;
  removedAgents: string[];
  removedMcpServers: string[];
}

export interface AddMcpResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  configChanged: boolean;
  warnings: MergeWarning[];
}

export interface PromptListResult {
  promptsDir: string;
  promptPackDir: string;
  bundled: string[];
  installed: string[];
  interactiveBundled: string[];
  interactiveInstalled: string[];
}

export interface StatusResult {
  codexHome: string;
  configPath: string;
  promptsDir: string;
  promptPackDir: string;
  configExists: boolean;
  promptPackInstalled: boolean;
  interactivePromptCommandsInstalled: string[];
  interactivePromptCommandsMissing: string[];
  supercodexInstalled: boolean;
  managedAgents: string[];
  managedMcpServers: string[];
  overridePaths: string[];
  defaultMode?: string;
  defaultPersona?: string;
  catalogVersion?: string;
  catalogInstalledIds: string[];
}

export interface SetDefaultResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  changed: boolean;
}

export interface McpListResult {
  paths: ReturnType<typeof getCodexPaths>;
  servers: Array<{ name: string; transport: string }>;
}

export interface McpRemoveResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  changed: boolean;
  removed: boolean;
  removedCatalogIds: string[];
}

export interface McpCatalogInstallResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  configChanged: boolean;
  warnings: MergeWarning[];
  serverName: string;
  catalogId: string;
}

export interface McpTestOperationResult {
  paths: ReturnType<typeof getCodexPaths>;
  exists: boolean;
  result: Awaited<ReturnType<typeof testMcpServer>> | null;
}

export interface CatalogSyncResult {
  paths: ReturnType<typeof getCodexPaths>;
  backup: BackupResult;
  changed: boolean;
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
}

export async function installSupercodex(options: OperationOptions = {}): Promise<InstallResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });

  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const current = await loadConfig(paths.configPath);

  const spec = createInstallSpec(paths.promptPackDir);
  const merged = mergeInstallConfig(current, spec, Boolean(options.force));

  if (merged.changed) {
    await writeConfig(paths.configPath, merged.config);
  }

  const promptInstall = await installPromptPack(paths.promptPackDir);
  const interactivePromptInstall = await installInteractivePromptCommands(paths.promptsDir);

  return {
    paths,
    backup,
    configChanged: merged.changed,
    promptChanged: promptInstall.changed || interactivePromptInstall.changed,
    warnings: merged.warnings
  };
}

export async function uninstallSupercodex(options: OperationOptions = {}): Promise<UninstallResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });

  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const current = await loadConfig(paths.configPath);
  const removed = removeSupercodexManagedSections(current);

  if (removed.changed) {
    await writeConfig(paths.configPath, removed.config);
  }

  const promptRemoved = await removePromptPack(paths.promptPackDir);
  const interactivePromptRemoved = await removeInteractivePromptCommands(paths.promptsDir);

  return {
    paths,
    backup,
    configChanged: removed.changed,
    promptRemoved: promptRemoved || interactivePromptRemoved,
    removedAgents: removed.removedAgents,
    removedMcpServers: removed.removedMcpServers
  };
}

export async function addMcpServer(
  name: string,
  definition: TomlTable,
  options: OperationOptions = {}
): Promise<AddMcpResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });

  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const current = await loadConfig(paths.configPath);
  const merged = mergeMcpServerConfig(current, name, definition, Boolean(options.force));

  let nextConfig = merged.config;
  let changed = merged.changed;
  const warnings = [...merged.warnings];

  const catalogPatch = mergeSupercodexPatch(
    nextConfig,
    {
      catalog: {
        source: "local",
        catalog_version: BUILTIN_CATALOG_VERSION
      }
    },
    false
  );
  if (catalogPatch.changed) {
    nextConfig = catalogPatch.config;
    changed = true;
    warnings.push(...catalogPatch.warnings);
  }

  if (changed) {
    await writeConfig(paths.configPath, nextConfig);
  }

  return {
    paths,
    backup,
    configChanged: changed,
    warnings
  };
}

export async function listPromptPackStatus(codexHome?: string): Promise<PromptListResult> {
  const paths = getCodexPaths(codexHome);

  return {
    promptsDir: paths.promptsDir,
    promptPackDir: paths.promptPackDir,
    bundled: listBundledPrompts(),
    installed: await listInstalledPrompts(paths.promptPackDir),
    interactiveBundled: listBundledInteractivePromptCommands(),
    interactiveInstalled: await listInstalledInteractivePromptCommands(paths.promptsDir)
  };
}

export async function getSupercodexStatus(codexHome?: string): Promise<StatusResult> {
  const paths = getCodexPaths(codexHome);
  const configExists = await pathExists(paths.configPath);
  const promptPackInstalled = await pathExists(paths.promptPackDir);
  const config = configExists ? await loadConfig(paths.configPath) : {};
  const managed = getManagedNames(config);
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const overridePaths =
    supercodex && isPlainObject(supercodex.overrides)
      ? Object.keys(supercodex.overrides as TomlTable).sort()
      : [];
  const runtime = supercodex && isPlainObject(supercodex.runtime) ? (supercodex.runtime as TomlTable) : null;
  const catalog = supercodex && isPlainObject(supercodex.catalog) ? (supercodex.catalog as TomlTable) : null;
  const catalogInstalledIds = Array.isArray(catalog?.installed_ids)
    ? (catalog?.installed_ids as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .sort()
    : [];
  const interactiveBundled = listBundledInteractivePromptCommands();
  const interactiveInstalled = await listInstalledInteractivePromptCommands(paths.promptsDir);
  const interactiveInstalledSet = new Set(interactiveInstalled);
  const interactiveMissing = interactiveBundled.filter((item) => !interactiveInstalledSet.has(item));

  return {
    codexHome: paths.home,
    configPath: paths.configPath,
    promptsDir: paths.promptsDir,
    promptPackDir: paths.promptPackDir,
    configExists,
    promptPackInstalled,
    interactivePromptCommandsInstalled: interactiveInstalled,
    interactivePromptCommandsMissing: interactiveMissing,
    supercodexInstalled: Boolean(supercodex),
    managedAgents: managed.agents,
    managedMcpServers: managed.mcpServers,
    overridePaths,
    defaultMode: typeof runtime?.default_mode === "string" ? runtime.default_mode : undefined,
    defaultPersona: typeof runtime?.default_persona === "string" ? runtime.default_persona : undefined,
    catalogVersion: typeof runtime?.catalog_version === "string" ? runtime.catalog_version : undefined,
    catalogInstalledIds
  };
}

export async function setDefaultMode(mode: string, options: OperationOptions = {}): Promise<SetDefaultResult> {
  return updateRuntimeKey("default_mode", mode, options);
}

export async function unsetDefaultMode(options: OperationOptions = {}): Promise<SetDefaultResult> {
  return clearRuntimeKey("default_mode", options);
}

export async function setDefaultPersona(
  persona: string,
  options: OperationOptions = {}
): Promise<SetDefaultResult> {
  return updateRuntimeKey("default_persona", persona, options);
}

export async function unsetDefaultPersona(options: OperationOptions = {}): Promise<SetDefaultResult> {
  return clearRuntimeKey("default_persona", options);
}

export async function listConfiguredMcpServers(codexHome?: string): Promise<McpListResult> {
  const paths = getCodexPaths(codexHome);
  const config = (await pathExists(paths.configPath)) ? await loadConfig(paths.configPath) : {};
  const servers = listMcpServersFromConfig(config).map((server) => ({
    name: server.name,
    transport: String(server.definition.transport ?? "unknown")
  }));
  return { paths, servers };
}

export async function removeMcpServer(name: string, options: OperationOptions = {}): Promise<McpRemoveResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });

  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const config = await loadConfig(paths.configPath);
  const removedCatalogIds = new Set<string>();

  let changed = false;
  if (isPlainObject(config.mcp_servers) && Object.hasOwn(config.mcp_servers as TomlTable, name)) {
    delete (config.mcp_servers as TomlTable)[name];
    changed = true;
    if (Object.keys(config.mcp_servers as TomlTable).length === 0) {
      delete config.mcp_servers;
    }
  }

  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  if (supercodex && isPlainObject(supercodex.managed)) {
    const managed = supercodex.managed as TomlTable;
    if (Array.isArray(managed.mcp_servers)) {
      const filtered = (managed.mcp_servers as unknown[])
        .filter((value): value is string => typeof value === "string")
        .filter((value) => value !== name);
      if ((managed.mcp_servers as unknown[]).length !== filtered.length) {
        managed.mcp_servers = filtered.sort();
        changed = true;
      }
    }
  }

  if (supercodex && isPlainObject(supercodex.catalog) && Array.isArray((supercodex.catalog as TomlTable).installed_ids)) {
    const catalog = supercodex.catalog as TomlTable;
    if (isPlainObject(catalog.installed_servers)) {
      const installedServers = catalog.installed_servers as TomlTable;
      const mappedId = typeof installedServers[name] === "string" ? (installedServers[name] as string) : null;
      if (mappedId) {
        removedCatalogIds.add(mappedId);
        delete installedServers[name];
        changed = true;
      }
    }

    const beforeIds = (catalog.installed_ids as unknown[])
      .filter((value): value is string => typeof value === "string");
    const filtered = beforeIds.filter((value) => {
      if (removedCatalogIds.has(value)) {
        return false;
      }

      if (removedCatalogIds.size === 0 && value === name) {
        removedCatalogIds.add(value);
        return false;
      }

      return true;
    });
    if (beforeIds.length !== filtered.length) {
      catalog.installed_ids = filtered.sort();
      changed = true;
    }
  }

  if (changed) {
    await writeConfig(paths.configPath, config);
  }

  return {
    paths,
    backup,
    changed,
    removed: changed,
    removedCatalogIds: Array.from(removedCatalogIds).sort()
  };
}

export async function installMcpFromCatalog(
  entry: CatalogEntry,
  options: OperationOptions = {}
): Promise<McpCatalogInstallResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });
  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const current = await loadConfig(paths.configPath);

  const serverName = entry.name;
  const definition = buildServerDefinitionFromCatalog(entry);
  const merged = mergeMcpServerConfig(current, serverName, definition, Boolean(options.force));
  let nextConfig = merged.config;
  let changed = merged.changed;
  const warnings = [...merged.warnings];

  const supercodex = ensureSupercodexTable(nextConfig);
  const runtime = ensureChildTable(supercodex, "runtime");
  if (runtime.catalog_version !== BUILTIN_CATALOG_VERSION) {
    runtime.catalog_version = BUILTIN_CATALOG_VERSION;
    changed = true;
  }
  const catalog = ensureChildTable(supercodex, "catalog");
  const installedIds = Array.isArray(catalog.installed_ids)
    ? (catalog.installed_ids as unknown[]).filter((value): value is string => typeof value === "string")
    : [];
  if (!installedIds.includes(entry.id)) {
    installedIds.push(entry.id);
    catalog.installed_ids = installedIds.sort();
    changed = true;
  }
  const installedServers = ensureChildTable(catalog, "installed_servers");
  if (installedServers[serverName] !== entry.id) {
    installedServers[serverName] = entry.id;
    changed = true;
  }

  if (!catalog.catalog_version || typeof catalog.catalog_version !== "string") {
    catalog.catalog_version = BUILTIN_CATALOG_VERSION;
    changed = true;
  }

  if (changed) {
    await writeConfig(paths.configPath, nextConfig);
  }

  return {
    paths,
    backup,
    configChanged: changed,
    warnings,
    serverName,
    catalogId: entry.id
  };
}

export async function testMcpServerByName(
  name: string,
  options: OperationOptions = {}
): Promise<McpTestOperationResult> {
  const paths = getCodexPaths(options.codexHome);
  const config = (await pathExists(paths.configPath)) ? await loadConfig(paths.configPath) : {};
  const server = getMcpServerFromConfig(config, name);
  if (!server) {
    return {
      paths,
      exists: false,
      result: null
    };
  }

  return {
    paths,
    exists: true,
    result: await testMcpServer(server.name, server.definition)
  };
}

export async function syncCatalogMetadata(options: OperationOptions = {}): Promise<CatalogSyncResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });

  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const config = await loadConfig(paths.configPath);

  const merged = mergeSupercodexPatch(
    config,
    {
      catalog: {
        source: "local"
      },
      runtime: {
        catalog_version: BUILTIN_CATALOG_VERSION
      }
    },
    false
  );

  if (merged.changed) {
    await writeConfig(paths.configPath, merged.config);
  }

  return {
    paths,
    backup,
    changed: merged.changed
  };
}

export async function updateDoctorState(
  status: "ok" | "issues",
  options: OperationOptions = {}
): Promise<void> {
  const paths = getCodexPaths(options.codexHome);
  if (!(await pathExists(paths.configPath))) {
    return;
  }

  const config = await loadConfig(paths.configPath);
  const supercodex = ensureSupercodexTable(config);
  const doctor = ensureChildTable(supercodex, "doctor");
  const nextRunAt = new Date().toISOString();
  const changed = doctor.last_status !== status || doctor.last_run_at !== nextRunAt;
  doctor.last_run_at = nextRunAt;
  doctor.last_status = status;
  if (changed) {
    await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
    await writeConfig(paths.configPath, config);
  }
}

export function validateSupercodexCommandCount(commandIds: string[]): ValidateResult {
  if (commandIds.length < 56) {
    return {
      valid: false,
      errors: [`Expected at least 56 commands but found ${commandIds.length}.`]
    };
  }

  return {
    valid: true,
    errors: []
  };
}

async function updateRuntimeKey(
  key: "default_mode" | "default_persona",
  value: string,
  options: OperationOptions
): Promise<SetDefaultResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });
  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const config = await loadConfig(paths.configPath);

  const supercodex = ensureSupercodexTable(config);
  const runtime = ensureChildTable(supercodex, "runtime");
  const changed = runtime[key] !== value;
  runtime[key] = value;

  if (changed) {
    await writeConfig(paths.configPath, config);
  }

  return {
    paths,
    backup,
    changed
  };
}

async function clearRuntimeKey(
  key: "default_mode" | "default_persona",
  options: OperationOptions
): Promise<SetDefaultResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });
  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const config = await loadConfig(paths.configPath);

  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const runtime = supercodex && isPlainObject(supercodex.runtime) ? (supercodex.runtime as TomlTable) : null;
  const changed = Boolean(runtime && Object.hasOwn(runtime, key));
  if (runtime && Object.hasOwn(runtime, key)) {
    delete runtime[key];
  }

  if (changed) {
    await writeConfig(paths.configPath, config);
  }

  return {
    paths,
    backup,
    changed
  };
}

function ensureSupercodexTable(config: TomlTable): TomlTable {
  if (!isPlainObject(config.supercodex)) {
    config.supercodex = {};
  }

  return config.supercodex as TomlTable;
}

function ensureChildTable(parent: TomlTable, key: string): TomlTable {
  if (!isPlainObject(parent[key])) {
    parent[key] = {};
  }

  return parent[key] as TomlTable;
}
