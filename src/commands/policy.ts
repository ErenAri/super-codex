import type { Command } from "commander";

import { evaluatePolicy } from "../services/policy";
import { runCommand } from "./utils";

export function registerPolicyCommands(program: Command): void {
  const policy = program.command("policy").description("Policy checks for command and prompt quality");

  policy
    .command("validate")
    .description("Validate policy compliance")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--strict", "Fail on warnings too")
    .action((options) =>
      runCommand(async () => {
        const report = await evaluatePolicy({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });

        const strict = Boolean(options.strict);
        const hasWarn = report.summary.warn > 0;
        const hasFail = report.summary.fail > 0;
        const valid = !hasFail && (!strict || !hasWarn);

        const payload = {
          valid,
          strict,
          score: report.score,
          summary: report.summary,
          checks: report.checks
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(`Policy valid: ${valid ? "yes" : "no"}`);
          console.log(`Strict mode: ${strict ? "on" : "off"}`);
          console.log(`Quality score: ${report.score}`);
          for (const check of report.checks) {
            console.log(`- [${check.status}] ${check.id} - ${check.title}`);
            for (const issue of check.issues) {
              console.log(`  - [${issue.level}] ${issue.message}`);
            }
          }
        }

        if (!valid) {
          process.exitCode = 1;
        }
      })
    );
}
