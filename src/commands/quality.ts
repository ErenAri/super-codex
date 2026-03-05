import type { Command } from "commander";

import { evaluateCommandPromptQuality } from "../services/command-validation";
import { bullet, line, resolveOutputStyle } from "./presenter";
import { runCommand } from "./utils";

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${value}`);
  }
  return parsed;
}

export function registerQualityCommands(program: Command): void {
  const quality = program
    .command("quality")
    .description("Inspect SuperCodex quality signals");

  quality
    .command("prompts")
    .description("Evaluate prompt quality across command workflow files")
    .option("--codex-home <path>", "Accepted for CLI consistency; not used by this check")
    .option("--json", "Output JSON")
    .option("--plain", "Disable decorated output")
    .option("--strict", "Fail on warnings too")
    .option("--limit <count>", "Max issue lines to print in plain output", parsePositiveInt, 25)
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const report = evaluateCommandPromptQuality();
        const strict = Boolean(options.strict);
        const hasWarnings = report.warn_count > 0;
        const valid = report.error_count === 0 && (!strict || !hasWarnings);

        const payload = {
          valid,
          strict,
          score: report.score,
          error_count: report.error_count,
          warn_count: report.warn_count,
          command_count: report.commands.length,
          commands: report.commands,
          issues: report.issues
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          const statusKind = valid ? "ok" : "warn";
          console.log(line("section", "Prompt quality report", style));
          console.log(line(statusKind, `Status: ${valid ? "pass" : "issues detected"}`, style));
          console.log(line("info", `Strict mode: ${strict ? "on" : "off"}`, style));
          console.log(line("info", `Score: ${payload.score}/100`, style));
          console.log(
            line(
              "info",
              `Commands: ${payload.command_count}, errors: ${payload.error_count}, warnings: ${payload.warn_count}`,
              style
            )
          );

          const limit = options.limit as number;
          for (const issue of payload.issues.slice(0, limit)) {
            const kind = issue.level === "error" ? "error" : "warn";
            console.log(
              bullet(
                `[${issue.level}] ${issue.commandId} ${issue.code}: ${issue.message} (${issue.file})`,
                style,
                kind
              )
            );
          }

          if (payload.issues.length > limit) {
            console.log(line("info", `Showing ${limit}/${payload.issues.length} issues.`, style));
          }
        }

        if (!valid) {
          process.exitCode = 1;
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );
}
