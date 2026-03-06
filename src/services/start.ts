import { getSupercodexStatus, installSupercodex } from "../operations";
import { pathExists } from "../fs-utils";
import { getCoreProfileNextCommands } from "../profiles";
import { loadRegistry } from "../registry";
import { resolveWorkflow } from "../runtime";
import { tryRecordMetricEvent } from "./metrics";

export type StartCheckStatus = "ok" | "warn" | "error";

export interface StartCheckResult {
  id: string;
  status: StartCheckStatus;
  details: string;
}

export interface StartFlowResult {
  status: StartCheckStatus;
  readiness_score: number;
  recommended_action: string;
  best_next_command: string;
  checks: StartCheckResult[];
  next_commands: string[];
  quick_start: {
    context: "terminal" | "chat";
    terminal_command: string;
    prompt_command: string;
  };
  repaired: boolean;
}

export interface StartFlowOptions {
  codexHome?: string;
  autoInstall?: boolean;
  preferredContext?: "terminal" | "chat";
  projectRoot?: string;
}

export async function runStartFlow(options: StartFlowOptions = {}): Promise<StartFlowResult> {
  await tryRecordMetricEvent("start_invoked", {
    codexHome: options.codexHome
  });

  const checks: StartCheckResult[] = [];
  let status = await getSupercodexStatus(options.codexHome);
  let repaired = false;

  if (options.autoInstall && needsInstallRepair(status)) {
    const installResult = await installSupercodex({
      codexHome: options.codexHome
    });
    repaired = installResult.configChanged || installResult.promptChanged;
    await tryRecordMetricEvent("install_success", {
      codexHome: options.codexHome,
      payload: {
        changed: installResult.configChanged || installResult.promptChanged
      }
    });
    status = await getSupercodexStatus(options.codexHome);
  }

  checks.push({
    id: "supercodex.section",
    status: status.supercodexInstalled ? "ok" : "warn",
    details: status.supercodexInstalled
      ? "SuperCodex section is present in config."
      : "SuperCodex section is missing from config.toml."
  });

  checks.push({
    id: "prompt.pack",
    status: status.promptPackInstalled ? "ok" : "warn",
    details: status.promptPackInstalled
      ? "Prompt pack is installed."
      : "Prompt pack is missing."
  });

  const wrappersMissing = status.interactivePromptCommandsMissing.length;
  checks.push({
    id: "interactive.wrappers",
    status: wrappersMissing === 0 ? "ok" : "warn",
    details: wrappersMissing === 0
      ? `${status.interactivePromptCommandsInstalled.length} interactive wrappers installed.`
      : `${wrappersMissing} interactive wrappers are missing.`
  });

  const smokeCheck = await runSmokeResolutionCheck(options);
  checks.push(smokeCheck);
  if (smokeCheck.status === "ok") {
    await tryRecordMetricEvent("first_command_success", {
      codexHome: options.codexHome,
      payload: {
        workflow: "research"
      }
    });
  }

  const overall = deriveOverallStatus(checks);
  const quickStartContext = options.preferredContext ?? "terminal";
  const recommendedAction = resolveRecommendedAction(overall, checks);
  return {
    status: overall,
    readiness_score: computeReadinessScore(checks),
    recommended_action: recommendedAction,
    best_next_command: resolveBestNextCommand(overall, checks, quickStartContext),
    checks,
    next_commands: buildNextCommands(overall, checks),
    quick_start: {
      context: quickStartContext,
      terminal_command: "supercodex spec <goal>",
      prompt_command: "/prompts:supercodex-research <topic>"
    },
    repaired
  };
}

function needsInstallRepair(status: Awaited<ReturnType<typeof getSupercodexStatus>>): boolean {
  return !status.supercodexInstalled || !status.promptPackInstalled || status.interactivePromptCommandsMissing.length > 0;
}

async function runSmokeResolutionCheck(options: StartFlowOptions): Promise<StartCheckResult> {
  try {
    const registry = await loadRegistry({
      codexHome: options.codexHome,
      projectRoot: options.projectRoot ?? process.cwd()
    });
    const resolution = await resolveWorkflow(registry.registry, {
      workflow: "research",
      codexHome: options.codexHome,
      projectRoot: options.projectRoot ?? process.cwd()
    });
    const promptExists = await pathExists(resolution.promptPath);
    if (!promptExists) {
      return {
        id: "workflow.smoke",
        status: "error",
        details: `Workflow resolution succeeded, but prompt file is missing at ${resolution.promptPath}.`
      };
    }

    return {
      id: "workflow.smoke",
      status: "ok",
      details: `Workflow resolution works (research -> ${resolution.promptPath}).`
    };
  } catch (error) {
    return {
      id: "workflow.smoke",
      status: "error",
      details: `Workflow resolution failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function deriveOverallStatus(checks: StartCheckResult[]): StartCheckStatus {
  if (checks.some((check) => check.status === "error")) {
    return "error";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }
  return "ok";
}

function buildNextCommands(status: StartCheckStatus, checks: StartCheckResult[]): string[] {
  const checkById = new Map(checks.map((check) => [check.id, check]));
  const commands: string[] = [];

  const installRelated = [
    "supercodex.section",
    "prompt.pack",
    "interactive.wrappers"
  ].some((id) => checkById.get(id)?.status !== "ok");

  if (installRelated) {
    commands.push("supercodex start --yes", "supercodex install");
  }

  if (checkById.get("workflow.smoke")?.status === "error") {
    commands.push("supercodex validate --strict", "supercodex doctor --strict");
  }

  commands.push("supercodex profile show core");
  commands.push(...getCoreProfileNextCommands(10));
  commands.push(
    "supercodex guide <intent>",
    "supercodex /supercodex:research <topic>",
    "supercodex /supercodex:analyze <target>",
    "supercodex /supercodex:build <feature>",
    "/prompts:supercodex-research <topic>",
    "supercodex verify --strict",
    "supercodex lock refresh",
    "supercodex session save <summary>",
    "supercodex mcp guided --goal docs --yes",
    "supercodex doctor --strict"
  );

  if (status === "ok") {
    return dedupe(commands);
  }

  return dedupe(commands);
}

function resolveRecommendedAction(status: StartCheckStatus, checks: StartCheckResult[]): string {
  const checkById = new Map(checks.map((check) => [check.id, check]));
  if (checkById.get("workflow.smoke")?.status === "error") {
    return "supercodex validate --strict";
  }
  const installRelated = [
    "supercodex.section",
    "prompt.pack",
    "interactive.wrappers"
  ].some((id) => checkById.get(id)?.status !== "ok");
  if (installRelated) {
    return "supercodex start --yes";
  }
  if (status === "warn") {
    return "supercodex doctor --strict";
  }
  return "supercodex spec <goal>";
}

function resolveBestNextCommand(
  status: StartCheckStatus,
  checks: StartCheckResult[],
  context: "terminal" | "chat"
): string {
  const checkById = new Map(checks.map((check) => [check.id, check]));
  if (checkById.get("workflow.smoke")?.status === "error") {
    return "supercodex validate --strict";
  }
  const installRelated = [
    "supercodex.section",
    "prompt.pack",
    "interactive.wrappers"
  ].some((id) => checkById.get(id)?.status !== "ok");
  if (installRelated) {
    return "supercodex start --yes";
  }
  if (status === "warn") {
    return "supercodex doctor --strict";
  }
  return context === "chat"
    ? "/prompts:supercodex-research <topic>"
    : "supercodex spec <goal>";
}

function computeReadinessScore(checks: StartCheckResult[]): number {
  let score = 100;
  for (const check of checks) {
    if (check.status === "error") {
      score -= 35;
      continue;
    }
    if (check.status === "warn") {
      score -= 12;
    }
  }
  return Math.max(0, Math.min(100, score));
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}
