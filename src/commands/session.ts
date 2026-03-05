import path from "node:path";
import type { Command } from "commander";

import { bullet, kv, line, resolveOutputStyle } from "./presenter";
import { collectRepeatedOption, runCommand } from "./utils";
import {
  loadSessionCheckpoints,
  reflectSession,
  saveSessionCheckpoint
} from "../services/session-memory";

export function registerSessionCommands(program: Command): void {
  const session = program.command("session").description("Manage persistent SuperCodex session checkpoints");

  session
    .command("save")
    .description("Save a session checkpoint summary")
    .argument("<summary>", "Session summary text")
    .option("--project <path>", "Project root (default: cwd)")
    .option("--decision <text>", "Decision captured in this checkpoint", collectRepeatedOption, [])
    .option("--next <text>", "Suggested next step", collectRepeatedOption, [])
    .option("--tag <name>", "Tag for search/filter", collectRepeatedOption, [])
    .option("--mode <name>", "Optional mode label")
    .option("--persona <name>", "Optional persona label")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--plain", "Disable decorated output")
    .action((summary, options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const projectRoot = path.resolve((options.project as string | undefined) ?? process.cwd());
        const result = await saveSessionCheckpoint({
          codexHome: options.codexHome as string | undefined,
          projectRoot,
          summary: summary as string,
          decisions: (options.decision as string[]) ?? [],
          nextSteps: (options.next as string[]) ?? [],
          tags: (options.tag as string[]) ?? [],
          mode: options.mode as string | undefined,
          persona: options.persona as string | undefined
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (!result.settings.enabled) {
          console.log(line("warn", "Session memory is disabled in config.", style));
          console.log(kv("Configured path", result.settings.path, style));
          return;
        }

        if (!result.record) {
          console.log(line("error", "Failed to save session checkpoint.", style));
          process.exitCode = 1;
          return;
        }

        console.log(line("section", "Session checkpoint saved", style));
        console.log(kv("ID", result.record.id, style));
        console.log(kv("Project", result.record.project_root, style));
        console.log(kv("Path", result.settings.path, style));
        if (result.record.decisions.length > 0) {
          console.log(line("info", "Decisions:", style));
          for (const decision of result.record.decisions) {
            console.log(bullet(decision, style, "step"));
          }
        }
        if (result.record.next_steps.length > 0) {
          console.log(line("next", "Next steps:", style));
          for (const step of result.record.next_steps) {
            console.log(bullet(step, style, "next"));
          }
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  session
    .command("load")
    .description("Load recent session checkpoints")
    .option("--project <path>", "Project root filter (default: cwd)")
    .option("--all-projects", "Load checkpoints across all projects")
    .option("--recent <count>", "Maximum checkpoints to return (default: 10)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--plain", "Disable decorated output")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const projectRoot = Boolean(options.allProjects)
          ? undefined
          : path.resolve((options.project as string | undefined) ?? process.cwd());
        const recent = parseRecentOption(options.recent as string | undefined);
        const result = await loadSessionCheckpoints({
          codexHome: options.codexHome as string | undefined,
          projectRoot,
          recent
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (!result.settings.enabled) {
          console.log(line("warn", "Session memory is disabled in config.", style));
          console.log(kv("Configured path", result.settings.path, style));
          return;
        }

        if (result.records.length === 0) {
          console.log(line("info", "No session checkpoints found for the selected scope.", style));
          console.log(kv("Path", result.settings.path, style));
          return;
        }

        console.log(line("section", "Recent session checkpoints", style));
        console.log(kv("Path", result.settings.path, style));
        console.log(kv("Total in scope", String(result.totalRecords), style));
        for (const record of result.records) {
          console.log(bullet(`${record.timestamp} ${record.id}`, style, "info"));
          console.log(`  ${record.summary}`);
          if (record.next_steps.length > 0) {
            console.log(`  Next: ${record.next_steps.join(" | ")}`);
          }
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  session
    .command("reflect")
    .description("Summarize progress from recent session checkpoints")
    .option("--project <path>", "Project root filter (default: cwd)")
    .option("--all-projects", "Reflect across all projects")
    .option("--recent <count>", "How many recent checkpoints to use (default: 10)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--plain", "Disable decorated output")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const projectRoot = Boolean(options.allProjects)
          ? undefined
          : path.resolve((options.project as string | undefined) ?? process.cwd());
        const recent = parseRecentOption(options.recent as string | undefined);
        const result = await reflectSession({
          codexHome: options.codexHome as string | undefined,
          projectRoot,
          recent
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        if (!result.settings.enabled) {
          console.log(line("warn", "Session memory is disabled in config.", style));
          console.log(kv("Configured path", result.settings.path, style));
          return;
        }

        if (!result.reflection) {
          console.log(line("info", "No session checkpoints available for reflection.", style));
          console.log(kv("Path", result.settings.path, style));
          return;
        }

        console.log(line("section", "Session reflection", style));
        console.log(kv("Latest checkpoint", `${result.reflection.latest.timestamp} (${result.reflection.latest.id})`, style));
        console.log(kv("Summary", result.reflection.latest.summary, style));
        console.log(kv("Checkpoints analyzed", String(result.reflection.covered_checkpoints), style));
        if (result.reflection.decisions.length > 0) {
          console.log(line("info", "Key decisions:", style));
          for (const decision of result.reflection.decisions) {
            console.log(bullet(decision, style, "step"));
          }
        }
        if (result.reflection.pending_next_steps.length > 0) {
          console.log(line("next", "Pending next steps:", style));
          for (const nextStep of result.reflection.pending_next_steps) {
            console.log(bullet(nextStep, style, "next"));
          }
        }
        console.log(kv("Recommended command", result.reflection.recommended_command, style, "tip"));
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );
}

function parseRecentOption(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --recent value "${value}". Expected a positive number.`);
  }
  return Math.trunc(parsed);
}
