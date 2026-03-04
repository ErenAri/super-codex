import { mkdir } from "node:fs/promises";

import { createTimestampedBackup } from "../backup";
import { loadConfig, type TomlTable, writeConfig } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import type { OperationOptions, SetDefaultResult, SetSkillEnabledResult } from "../operations";

export async function setDefaultMode(
  mode: string,
  options: OperationOptions = {}
): Promise<SetDefaultResult> {
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

export async function setSkillEnabled(
  skillId: string,
  enabled: boolean,
  options: OperationOptions = {}
): Promise<SetSkillEnabledResult> {
  const paths = getCodexPaths(options.codexHome);
  await mkdir(paths.home, { recursive: true });
  const backup = await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
  const config = await loadConfig(paths.configPath);

  const supercodex = ensureSupercodexTable(config);
  const skills = ensureChildTable(supercodex, "skills");
  const skillTable = ensureChildTable(skills, skillId);
  const changed = skillTable.enabled !== enabled;
  skillTable.enabled = enabled;

  if (changed) {
    await writeConfig(paths.configPath, config);
  }

  return {
    paths,
    backup,
    changed,
    enabled
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

export function ensureSupercodexTable(config: TomlTable): TomlTable {
  if (!isPlainObject(config.supercodex)) {
    config.supercodex = {};
  }

  return config.supercodex as TomlTable;
}

export function ensureChildTable(parent: TomlTable, key: string): TomlTable {
  if (!isPlainObject(parent[key])) {
    parent[key] = {};
  }

  return parent[key] as TomlTable;
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
