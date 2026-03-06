import { loadConfig } from "../config";
import { pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import { loadRegistry, validateRegistry } from "../registry";
import { evaluateCommandPromptQuality, validateSupercodexCommandSet } from "./command-validation";
import { checkLockStatus, type LockOptions } from "./lockfile";
import { evaluatePolicy } from "./policy";
import { buildQuickActionContract, type QuickAction } from "./quick-actions";
import { evaluateSafetyGates } from "./safety-gates";

export type VerifyCheckStatus = "pass" | "warn" | "fail";

export interface VerifyCheck {
  id: string;
  title: string;
  status: VerifyCheckStatus;
  details: string[];
}

export interface VerifyOptions extends LockOptions {
  strict?: boolean;
  safetyGates?: boolean;
}

export interface VerifyReport {
  ok: boolean;
  strict: boolean;
  status: VerifyCheckStatus;
  score: number;
  lock_path: string;
  best_next_command: string;
  next_commands: string[];
  quick_actions: QuickAction[];
  checks: VerifyCheck[];
}

export async function runVerification(options: VerifyOptions = {}): Promise<VerifyReport> {
  const strict = Boolean(options.strict);
  const checks: VerifyCheck[] = [];

  const registryResult = await loadRegistry({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot ?? process.cwd()
  });
  const commandSet = validateSupercodexCommandSet(Object.keys(registryResult.registry.commands));
  const staticIssues = validateRegistry(registryResult.registry);

  const registryWarnings = [
    ...registryResult.issues.filter((issue) => issue.level !== "error"),
    ...staticIssues.filter((issue) => issue.level !== "error")
  ];
  const registryErrors = [
    ...registryResult.issues.filter((issue) => issue.level === "error"),
    ...staticIssues.filter((issue) => issue.level === "error"),
    ...commandSet.errors.map((message) => ({
      level: "error" as const,
      path: "commands",
      message
    }))
  ];

  checks.push({
    id: "registry",
    title: "Registry and command mapping",
    status: registryErrors.length > 0 ? "fail" : registryWarnings.length > 0 ? "warn" : "pass",
    details: [
      ...registryErrors.map((issue) => `[error] ${issue.message} (${issue.path})`),
      ...registryWarnings.map((issue) => `[warn] ${issue.message} (${issue.path})`)
    ]
  });

  const commandQuality = evaluateCommandPromptQuality();
  const commandQualityStatus: VerifyCheckStatus = !commandQuality.valid
    ? "fail"
    : commandQuality.warn_count > 0
      ? "warn"
      : "pass";
  checks.push({
    id: "command_quality",
    title: "Command prompt quality",
    status: commandQualityStatus,
    details: [
      `score=${commandQuality.score}`,
      `errors=${commandQuality.error_count}`,
      `warnings=${commandQuality.warn_count}`,
      ...commandQuality.issues.slice(0, 12).map(
        (issue) => `[${issue.level}] ${issue.commandId}: ${issue.message} (${issue.file})`
      )
    ]
  });

  const policy = await evaluatePolicy({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot ?? process.cwd()
  });
  const policyWarnings = policy.checks.filter((check) => check.status === "warn");
  const policyFails = policy.checks.filter((check) => check.status === "fail");
  checks.push({
    id: "policy",
    title: "Policy checks",
    status: policyFails.length > 0 ? "fail" : policyWarnings.length > 0 ? "warn" : "pass",
    details: policy.checks
      .filter((check) => check.status !== "pass")
      .flatMap((check) => check.issues.map((issue) => `[${issue.level}] ${check.id}: ${issue.message}`))
  });

  const lockStatus = await checkLockStatus({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot ?? process.cwd(),
    pathOverride: options.pathOverride
  });
  const lockCheckStatus: VerifyCheckStatus = lockStatus.inSync
    ? "pass"
    : lockStatus.exists
      ? "fail"
      : "warn";
  checks.push({
    id: "lockfile",
    title: "Lock file consistency",
    status: lockCheckStatus,
    details: lockStatus.differences
  });

  if (options.safetyGates) {
    const codexPaths = getCodexPaths(options.codexHome);
    const configExists = await pathExists(codexPaths.configPath);
    const config = configExists ? await loadConfig(codexPaths.configPath) : {};
    const safetyChecks = evaluateSafetyGates({ config });
    const hasSafetyFail = safetyChecks.some((check) => check.status === "fail");
    const hasSafetyWarn = safetyChecks.some((check) => check.status === "warn");
    checks.push({
      id: "safety_gates",
      title: "Runtime safety gates",
      status: hasSafetyFail ? "fail" : hasSafetyWarn ? "warn" : "pass",
      details: safetyChecks.flatMap((check) => {
        if (check.status === "pass") {
          return [];
        }
        return [`[${check.status}] ${check.id}: ${check.details.join(" ")}`];
      })
    });
  }

  const hasFailure = checks.some((check) => check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warn");
  const ok = !hasFailure && (!strict || !hasWarning);
  const quickActionContract = buildQuickActionContract(buildVerifyQuickActions(checks, strict));

  return {
    ok,
    strict,
    status: hasFailure ? "fail" : hasWarning ? "warn" : "pass",
    score: computeVerifyScore(checks, policy.score),
    lock_path: lockStatus.path,
    best_next_command: quickActionContract.best_next_command,
    next_commands: quickActionContract.next_commands,
    quick_actions: quickActionContract.quick_actions,
    checks
  };
}

function computeVerifyScore(checks: VerifyCheck[], policyScore: number): number {
  let score = Math.round(policyScore);
  for (const check of checks) {
    if (check.id === "policy") {
      continue;
    }
    if (check.status === "fail") {
      score -= 25;
      continue;
    }
    if (check.status === "warn") {
      score -= 8;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function buildVerifyQuickActions(checks: VerifyCheck[], strict: boolean): QuickAction[] {
  const statusByCheck = new Map(checks.map((check) => [check.id, check.status]));
  const actions: QuickAction[] = [];

  const addAction = (id: string, label: string, command: string): void => {
    actions.push({ id, label, command });
  };

  const registryStatus = statusByCheck.get("registry");
  if (registryStatus === "fail" || (strict && registryStatus === "warn")) {
    addAction("registry", "Fix registry integrity", "supercodex validate --strict");
  }

  const commandQualityStatus = statusByCheck.get("command_quality");
  if (commandQualityStatus === "fail" || (strict && commandQualityStatus === "warn")) {
    addAction("command_quality", "Fix command prompt quality", "supercodex quality prompts --strict");
  }

  const policyStatus = statusByCheck.get("policy");
  if (policyStatus === "fail" || (strict && policyStatus === "warn")) {
    addAction("policy", "Fix policy checks", "supercodex policy validate --strict");
  }

  const lockStatus = statusByCheck.get("lockfile");
  if (lockStatus === "fail" || lockStatus === "warn") {
    addAction("lockfile", "Refresh deterministic lock", "supercodex lock refresh");
  }

  const safetyStatus = statusByCheck.get("safety_gates");
  if (safetyStatus === "fail" || (strict && safetyStatus === "warn")) {
    addAction("safety_gates", "Inspect safety gates", "supercodex doctor --strict");
  }

  addAction("verify", "Re-run strict verification", "supercodex verify --strict");
  return actions;
}
