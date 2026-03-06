import type { Command } from "commander";

import { line, kv, bullet, resolveOutputStyle } from "./presenter";
import { getCoreProfileNextCommands, getCoreProfileStepByAlias } from "../profiles";
import { runCommand } from "./utils";
import { listAliases, loadRegistry, recommendAliases } from "../registry";
import { buildQuickActionContract } from "../services/quick-actions";

type GuideContext = "auto" | "terminal" | "chat";
type ResolvedGuideContext = "terminal" | "chat";

interface GuideSuggestion {
  alias: string;
  target: string;
  description: string;
  mode?: string;
  persona?: string;
  score: number;
  reasons: string[];
  terminalCommand: string;
  slashCommand: string;
  promptCommand: string;
}

export function registerGuideCommands(program: Command): void {
  program
    .command("guide")
    .description("Recommend the best SuperCodex command entrypoint for an intent")
    .argument("<intent>", "Task intent")
    .option("--pack <name>", "Restrict recommendation to an alias pack")
    .option("--limit <count>", "Maximum recommendations (default: 3)")
    .option("--context <kind>", "Output context: auto|terminal|chat", "auto")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--plain", "Disable decorated output")
    .action((intent, options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const context = parseContextOption(options.context as string);
        const resolvedContext = resolveGuideContext(context);
        const pack = normalizePackOption(options.pack as string | undefined);
        const limit = parseLimitOption(options.limit as string | undefined);
        const registry = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });

        const recommendations = recommendAliases(registry.registry, intent as string, {
          pack,
          limit
        });
        const fallbackAliases = listAliases(registry.registry, { pack }).slice(0, limit);
        const suggestions = (recommendations.length > 0
          ? recommendations.map((item) => toGuideSuggestion(item.alias, item.score, item.reasons))
          : fallbackAliases.map((alias) =>
            toGuideSuggestion(alias, 0, ["No direct keyword hit; showing best default aliases."])
          )).slice(0, limit);

        if (suggestions.length === 0) {
          throw new Error("No aliases available for guidance.");
        }

        const primary = suggestions[0];
        const nextCommands = suggestions
          .slice(1, 3)
          .map((suggestion) => suggestion.terminalCommand);
        const coreStep = getCoreProfileStepByAlias(primary.alias);
        const coreNextCommands = getCoreProfileNextCommands(10);
        const bestNow = resolvedContext === "chat" ? primary.promptCommand : primary.terminalCommand;
        const quickActionContract = buildQuickActionContract(
          [
            {
              id: "best_next",
              label: "Best next command",
              command: bestNow
            },
            ...nextCommands.map((command, index) => ({
              id: `next_${index + 1}`,
              label: index === 0 ? "Then continue with" : "Then run",
              command
            }))
          ],
          {
            bestCommand: bestNow
          }
        );

        const payload = {
          intent: intent as string,
          context: resolvedContext,
          primary,
          best_next_command: quickActionContract.best_next_command,
          core_profile: {
            id: "core",
            matched_step: coreStep ? coreStep.step_id : null,
            matched_objective: coreStep ? coreStep.objective : null,
            next_commands: coreNextCommands
          },
          alternatives: suggestions.slice(1),
          next_commands: quickActionContract.next_commands,
          quick_actions: quickActionContract.quick_actions
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        console.log(line("section", "Guide recommendation", style));
        console.log(kv("Intent", intent as string, style));
        console.log(kv("Context", resolvedContext, style));
        console.log(kv("Primary alias", `/supercodex:${primary.alias}`, style));
        console.log(kv("Target", primary.target, style));
        console.log(kv("Why", primary.reasons.join(" "), style));
        if (primary.mode) {
          console.log(kv("Default mode", primary.mode, style));
        }
        if (primary.persona) {
          console.log(kv("Default persona", primary.persona, style));
        }
        if (coreStep) {
          console.log(kv("Core loop step", coreStep.step_id, style));
          console.log(kv("Core objective", coreStep.objective, style));
        }

        console.log(line("info", "Use one of these forms:", style));
        console.log(bullet(primary.terminalCommand, style, "step"));
        console.log(bullet(primary.slashCommand, style, "step"));
        console.log(bullet(primary.promptCommand, style, "step"));

        console.log(line("next", `Best next command now: ${bestNow}`, style));

        if (nextCommands.length > 0) {
          console.log(line("next", "Then continue with:", style));
          for (const command of nextCommands) {
            console.log(bullet(command, style, "next"));
          }
        }

        console.log(line("next", "Core loop commands:", style));
        for (const command of coreNextCommands.slice(0, 6)) {
          console.log(bullet(command, style, "next"));
        }

        if (suggestions.length > 1) {
          console.log(line("info", "Alternatives:", style));
          for (const suggestion of suggestions.slice(1)) {
            console.log(
              bullet(
                `/supercodex:${suggestion.alias} -> ${suggestion.target} (score: ${suggestion.score})`,
                style,
                "info"
              )
            );
          }
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );
}

function toGuideSuggestion(
  alias: {
    name: string;
    target: string;
    description: string;
    default_mode?: string;
    default_persona?: string;
  },
  score: number,
  reasons: string[]
): GuideSuggestion {
  const promptName = targetToPromptName(alias.target);
  return {
    alias: alias.name,
    target: alias.target,
    description: alias.description,
    mode: alias.default_mode,
    persona: alias.default_persona,
    score,
    reasons,
    terminalCommand: `supercodex ${alias.name}`,
    slashCommand: `supercodex /supercodex:${alias.name}`,
    promptCommand: `/prompts:${promptName}`
  };
}

function targetToPromptName(target: string): string {
  if (target.startsWith("run.")) {
    return `supercodex-${target.slice(4)}`;
  }

  return "supercodex-research";
}

function parseLimitOption(value: string | undefined): number {
  if (!value) {
    return 3;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit value "${value}". Expected a positive number.`);
  }
  return Math.min(10, Math.max(1, Math.trunc(parsed)));
}

function parseContextOption(value: string): GuideContext {
  const normalized = value.trim().toLowerCase();
  if (normalized === "auto" || normalized === "terminal" || normalized === "chat") {
    return normalized;
  }
  throw new Error(`Invalid --context value "${value}". Expected auto|terminal|chat.`);
}

function resolveGuideContext(context: GuideContext): ResolvedGuideContext {
  if (context === "terminal" || context === "chat") {
    return context;
  }

  const chatFlag = process.env.CODEX_CHAT ?? process.env.CODEX_INTERACTIVE_CHAT ?? "";
  if (chatFlag === "1" || chatFlag.toLowerCase() === "true") {
    return "chat";
  }
  return "terminal";
}

function normalizePackOption(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
