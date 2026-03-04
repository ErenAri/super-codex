import type { Command } from "commander";

import { bullet, line, resolveOutputStyle } from "./presenter";
import { runStartFlow } from "../services/start";
import { runCommand } from "./utils";

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .description("Guided first-run setup and verification")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--yes", "Apply safe install/repair actions automatically")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const result = await runStartFlow({
          codexHome: options.codexHome as string | undefined,
          autoInstall: Boolean(options.yes),
          projectRoot: process.cwd()
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const statusKind = result.status === "ok" ? "ok" : result.status === "warn" ? "warn" : "error";
          console.log(line("section", "Start check", style));
          console.log(line(statusKind, `Status: ${result.status}`, style));
          if (result.repaired) {
            console.log(line("ok", "Applied install/repair actions.", style));
          }
          for (const check of result.checks) {
            const checkKind = check.status === "ok" ? "ok" : check.status === "warn" ? "warn" : "error";
            console.log(bullet(`[${check.status}] ${check.id}: ${check.details}`, style, checkKind));
          }
          console.log(line("next", "Next commands:", style));
          for (const command of result.next_commands) {
            console.log(bullet(command, style, "next"));
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
