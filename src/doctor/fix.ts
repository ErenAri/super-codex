import { createTimestampedBackup } from "../backup";
import {
  createInstallSpec,
  loadConfig,
  mergeInstallConfig,
  type TomlTable,
  writeConfig
} from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import type { OperationOptions } from "../operations";
import { getCodexPaths } from "../paths";
import { installPromptPack } from "../prompts";
import type { DoctorFixResult, DoctorReport } from "./types";

export interface ApplyDoctorFixOptions extends OperationOptions {
  doctorStatus?: "ok" | "issues";
}

export async function applyDoctorFixes(
  report: DoctorReport,
  options: ApplyDoctorFixOptions = {}
): Promise<DoctorFixResult> {
  const issueIds = new Set(report.issues.filter((issue) => issue.fixable).map((issue) => issue.id));
  const applied: string[] = [];
  const skipped: string[] = [];
  const paths = getCodexPaths(options.codexHome);

  const shouldApplyInstallPatch =
    hasIssuePrefix(issueIds, "config.missing") ||
    hasIssuePrefix(issueIds, "supercodex.missing");
  const shouldRepairPrompts = hasIssuePrefix(issueIds, "prompts.");
  const shouldClearMode = issueIds.has("runtime.default_mode.invalid");
  const shouldClearPersona = issueIds.has("runtime.default_persona.invalid");
  const shouldWriteDoctorState = options.doctorStatus === "ok" || options.doctorStatus === "issues";

  let nextConfig = (await pathExists(paths.configPath)) ? await loadConfig(paths.configPath) : {};
  let configChanged = false;

  if (shouldApplyInstallPatch) {
    const merged = mergeInstallConfig(
      nextConfig,
      createInstallSpec(paths.promptPackDir),
      false
    );
    nextConfig = merged.config;
    configChanged = configChanged || merged.changed;
    if (merged.changed) {
      applied.push("install.patch");
    }
  }

  const cleared = clearInvalidRuntimeDefaults(nextConfig, {
    mode: shouldClearMode,
    persona: shouldClearPersona
  });
  if (cleared > 0) {
    configChanged = true;
    applied.push("runtime.defaults");
  }

  if (shouldWriteDoctorState) {
    const now = new Date().toISOString();
    const supercodex = ensureChildTable(nextConfig, "supercodex");
    const doctor = ensureChildTable(supercodex, "doctor");
    const stateChanged = doctor.last_status !== options.doctorStatus || doctor.last_run_at !== now;
    doctor.last_status = options.doctorStatus;
    doctor.last_run_at = now;
    if (stateChanged) {
      configChanged = true;
      applied.push("doctor.state");
    }
  }

  if (configChanged) {
    await createTimestampedBackup(paths.configPath, paths.home, options.now ?? new Date());
    await writeConfig(paths.configPath, nextConfig);
  }

  if (shouldRepairPrompts || shouldApplyInstallPatch) {
    const promptResult = await installPromptPack(paths.promptPackDir);
    if (promptResult.changed) {
      applied.push("prompts");
    }
  }

  if (applied.length === 0) {
    skipped.push("No applicable fixable issues.");
  }

  return { applied, skipped };
}

function clearInvalidRuntimeDefaults(
  config: TomlTable,
  opts: { mode: boolean; persona: boolean }
): number {
  if (!opts.mode && !opts.persona) {
    return 0;
  }

  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const runtime = supercodex && isPlainObject(supercodex.runtime) ? (supercodex.runtime as TomlTable) : null;
  if (!runtime) {
    return 0;
  }

  let changed = 0;
  if (opts.mode && Object.hasOwn(runtime, "default_mode")) {
    delete runtime.default_mode;
    changed += 1;
  }

  if (opts.persona && Object.hasOwn(runtime, "default_persona")) {
    delete runtime.default_persona;
    changed += 1;
  }

  return changed;
}

function ensureChildTable(parent: TomlTable, key: string): TomlTable {
  if (!isPlainObject(parent[key])) {
    parent[key] = {};
  }

  return parent[key] as TomlTable;
}

function hasIssuePrefix(issueIds: Set<string>, prefix: string): boolean {
  for (const issueId of issueIds) {
    if (issueId.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
