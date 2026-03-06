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
import type { DoctorFixPlanStep, DoctorFixResult, DoctorReport } from "./types";

export interface ApplyDoctorFixOptions extends OperationOptions {
  doctorStatus?: "ok" | "issues";
}

interface DoctorFixPlanContext {
  codexHome?: string;
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

export function buildDoctorFixPlan(
  report: DoctorReport,
  context: DoctorFixPlanContext = {}
): DoctorFixPlanStep[] {
  const issueIds = new Set(report.issues.filter((issue) => issue.fixable).map((issue) => issue.id));
  const steps: DoctorFixPlanStep[] = [];
  const paths = getCodexPaths(context.codexHome);

  const installIssues = report.issues
    .filter((issue) => issue.id === "config.missing" || issue.id === "supercodex.missing")
    .map((issue) => issue.id);
  if (installIssues.length > 0) {
    steps.push({
      id: "install.patch",
      title: "Create/repair managed SuperCodex config",
      applies_to: installIssues,
      command_preview: "supercodex doctor --fix",
      before: "config.toml is missing or [supercodex] section is not present.",
      after: "Config includes managed [supercodex] runtime section and prompt pack path.",
      rollback_hint:
        `Restore latest backup under ${paths.home}/supercodex/backups or run supercodex uninstall to remove managed entries.`
    });
  }

  const promptIssues = report.issues.filter((issue) => issue.id.startsWith("prompts.")).map((issue) => issue.id);
  if (promptIssues.length > 0) {
    steps.push({
      id: "prompts",
      title: "Reinstall missing prompt files",
      applies_to: promptIssues,
      command_preview: "supercodex doctor --fix",
      before: "One or more bundled prompts are missing from the installed prompt pack.",
      after: "Prompt pack is synchronized with bundled command/workflow prompt files.",
      rollback_hint: "Reinstall a previous package version, then restore prompts from your backup directory if needed."
    });
  }

  const runtimeIssues = report.issues
    .filter((issue) => issue.id === "runtime.default_mode.invalid" || issue.id === "runtime.default_persona.invalid")
    .map((issue) => issue.id);
  if (runtimeIssues.length > 0) {
    steps.push({
      id: "runtime.defaults",
      title: "Clear invalid runtime defaults",
      applies_to: runtimeIssues,
      command_preview: "supercodex doctor --fix",
      before: "Runtime defaults reference mode/persona entries that do not exist in registry.",
      after: "Invalid defaults are removed so runtime falls back to builtin mode/persona.",
      rollback_hint:
        "Reapply desired defaults with supercodex mode set <mode> and supercodex persona set <persona>."
    });
  }

  const coveredIssueIds = new Set(steps.flatMap((step) => step.applies_to));
  const manualFollowup = Array.from(issueIds).filter((issueId) => !coveredIssueIds.has(issueId)).sort();
  if (manualFollowup.length > 0) {
    steps.push({
      id: "manual.followup",
      title: "Manual remediation required",
      applies_to: manualFollowup,
      command_preview: "supercodex doctor --strict",
      before: "Doctor detected fixable issues without an automated fixer mapping.",
      after: "Run strict doctor and follow listed remediation commands.",
      rollback_hint: "No automated rollback needed because no write action is planned."
    });
  }

  return steps;
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
