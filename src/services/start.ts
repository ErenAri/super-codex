import { getSupercodexStatus, installSupercodex } from "../operations";
import { pathExists } from "../fs-utils";
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
  checks: StartCheckResult[];
  next_commands: string[];
  repaired: boolean;
}

export interface StartFlowOptions {
  codexHome?: string;
  autoInstall?: boolean;
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
  return {
    status: overall,
    checks,
    next_commands: buildNextCommands(overall),
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

function buildNextCommands(status: StartCheckStatus): string[] {
  const defaults = [
    "supercodex /supercodex:research <topic>",
    "supercodex /supercodex:analyze <target>",
    "supercodex /supercodex:build <feature>",
    "/prompts:supercodex-research <topic>",
    "supercodex mcp guided --goal docs --yes",
    "supercodex doctor --strict"
  ];

  if (status === "ok") {
    return defaults;
  }

  return [
    "supercodex install",
    "supercodex start --yes",
    ...defaults
  ];
}
