import type { Command } from "commander";

import { runStartFlow } from "../services/start";
import { runCommand } from "./utils";

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .description("Guided first-run setup and verification")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--yes", "Apply safe install/repair actions automatically")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await runStartFlow({
          codexHome: options.codexHome as string | undefined,
          autoInstall: Boolean(options.yes),
          projectRoot: process.cwd()
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Start status: ${result.status}`);
          if (result.repaired) {
            console.log("Applied install/repair actions.");
          }
          for (const check of result.checks) {
            console.log(`- [${check.status}] ${check.id}: ${check.details}`);
          }
          console.log("Next commands:");
          for (const command of result.next_commands) {
            console.log(`- ${command}`);
          }
        }

        if (result.status === "error") {
          process.exitCode = 1;
        }
      })
    );
}
