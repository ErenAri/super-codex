import { loadRegistry, validateRegistry } from "../registry";
import { validateSupercodexCommandSet } from "./command-validation";
import { checkLockStatus, type LockOptions } from "./lockfile";
import { evaluatePolicy } from "./policy";

export type VerifyCheckStatus = "pass" | "warn" | "fail";

export interface VerifyCheck {
  id: string;
  title: string;
  status: VerifyCheckStatus;
  details: string[];
}

export interface VerifyOptions extends LockOptions {
  strict?: boolean;
}

export interface VerifyReport {
  ok: boolean;
  strict: boolean;
  status: VerifyCheckStatus;
  score: number;
  lock_path: string;
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

  const hasFailure = checks.some((check) => check.status === "fail");
  const hasWarning = checks.some((check) => check.status === "warn");
  const ok = !hasFailure && (!strict || !hasWarning);

  return {
    ok,
    strict,
    status: hasFailure ? "fail" : hasWarning ? "warn" : "pass",
    score: computeVerifyScore(checks, policy.score),
    lock_path: lockStatus.path,
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
