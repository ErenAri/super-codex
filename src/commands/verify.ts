import type { Command } from "commander";

import { runVerification } from "../services/verify";
import { runCommand } from "./utils";

export function registerVerifyCommand(program: Command): void {
  program
    .command("verify")
    .description("Run consistency verification for registry, policy, and lock file")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--lock-path <path>", "Override lock file path")
    .option("--json", "Output JSON")
    .option("--strict", "Fail on warnings too")
    .option("--safety-gates", "Include runtime safety gate checks (keys, sandbox, approvals, replay)")
    .action((options) =>
      runCommand(async () => {
        const report = await runVerification({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd(),
          pathOverride: options.lockPath as string | undefined,
          strict: Boolean(options.strict),
          safetyGates: Boolean(options.safetyGates)
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(`Verification status: ${report.status}`);
          console.log(`Strict mode: ${report.strict ? "on" : "off"}`);
          console.log(`Quality score: ${report.score}`);
          console.log(`Lock path: ${report.lock_path}`);
          console.log(`Best next command: ${report.best_next_command}`);
          for (const check of report.checks) {
            console.log(`- [${check.status}] ${check.id} - ${check.title}`);
            for (const detail of check.details) {
              console.log(`  - ${detail}`);
            }
          }
          console.log("Next commands:");
          for (const action of report.quick_actions) {
            console.log(`- ${action.label}: ${action.command}`);
          }
        }

        if (!report.ok) {
          process.exitCode = 1;
        }
      })
    );
}
