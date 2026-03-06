import type { Command } from "commander";
import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { bullet, line, resolveOutputStyle } from "./presenter";
import { runStartFlow } from "../services/start";
import { runCommand } from "./utils";

interface StartWizardSelection {
  enabled: boolean;
  interactive: boolean;
  autoInstall: boolean;
  context: "terminal" | "chat";
}

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .description("Guided first-run setup and verification")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--wizard", "Run guided onboarding wizard (interactive when TTY is available)")
    .option("--yes", "Apply safe install/repair actions automatically")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const wizard = await resolveWizardSelection(options);
        const result = await runStartFlow({
          codexHome: options.codexHome as string | undefined,
          autoInstall: wizard.autoInstall,
          preferredContext: wizard.context,
          projectRoot: process.cwd()
        });
        const payload = {
          ...result,
          wizard: {
            enabled: wizard.enabled,
            interactive: wizard.interactive
          }
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          const statusKind = result.status === "ok" ? "ok" : result.status === "warn" ? "warn" : "error";
          console.log(line("section", "Start check", style));
          console.log(line(statusKind, `Status: ${result.status}`, style));
          console.log(line("info", `Readiness score: ${result.readiness_score}/100`, style));
          console.log(line("next", `Recommended action: ${result.recommended_action}`, style));
          console.log(line("next", `Best next command: ${result.best_next_command}`, style));
          if (wizard.enabled) {
            console.log(
              line(
                "info",
                `Wizard mode: ${wizard.interactive ? "interactive" : "non-interactive fallback"}`,
                style
              )
            );
          }
          console.log(line("info", `Quick start context: ${result.quick_start.context}`, style));
          if (result.repaired) {
            console.log(line("ok", "Applied install/repair actions.", style));
          }
          for (const check of result.checks) {
            const checkKind = check.status === "ok" ? "ok" : check.status === "warn" ? "warn" : "error";
            console.log(bullet(`[${check.status}] ${check.id}: ${check.details}`, style, checkKind));
          }
          console.log(line("next", "Next commands:", style));
          for (const action of result.quick_actions) {
            console.log(bullet(`${action.label}: ${action.command}`, style, "next"));
          }
          console.log(line("next", "Quick start commands:", style));
          console.log(bullet(result.quick_start.terminal_command, style, "next"));
          console.log(bullet(result.quick_start.prompt_command, style, "next"));
          console.log(line("next", "Core agents for onboarding:", style));
          for (const agent of result.core_profile.recommended_agents) {
            console.log(
              bullet(
                `${agent.agent_id}: ${agent.command} (${agent.reason})`,
                style,
                "next"
              )
            );
          }
        }

        if (result.status === "error") {
          process.exitCode = 1;
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );
}

async function resolveWizardSelection(options: Record<string, unknown>): Promise<StartWizardSelection> {
  const forcedYes = Boolean(options.yes);
  const wizardRequested = Boolean(options.wizard);
  const jsonMode = Boolean(options.json);
  const interactive = canUseInteractiveWizard();
  const fallbackAutoInstall = forcedYes || wizardRequested;

  if (!wizardRequested || jsonMode || forcedYes || !interactive) {
    return {
      enabled: wizardRequested,
      interactive: false,
      autoInstall: fallbackAutoInstall,
      context: "terminal"
    };
  }

  let rl: Interface | null = null;
  try {
    rl = createInterface({ input, output });
    console.log("Start wizard");
    console.log("Select onboarding path and optional auto-repair.");
    const contextAnswer = await rl.question(
      "Entrypoint [1=terminal command, 2=/prompts chat] (default: 1): "
    );
    const context = normalizeWizardContext(contextAnswer);
    const repairAnswer = await rl.question("Apply safe auto-repair now? [Y/n]: ");
    const autoInstall = normalizeYesNoAnswer(repairAnswer, true);
    return {
      enabled: true,
      interactive: true,
      autoInstall,
      context
    };
  } finally {
    rl?.close();
  }
}

function canUseInteractiveWizard(): boolean {
  const ci = process.env.CI;
  if (ci === "1" || ci?.toLowerCase() === "true") {
    return false;
  }
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function normalizeWizardContext(value: string): "terminal" | "chat" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "2" || normalized === "chat" || normalized === "prompt" || normalized === "prompts") {
    return "chat";
  }
  return "terminal";
}

function normalizeYesNoAnswer(value: string, defaultValue: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (normalized === "y" || normalized === "yes") {
    return true;
  }
  if (normalized === "n" || normalized === "no") {
    return false;
  }
  return defaultValue;
}
