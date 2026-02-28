import type { Command } from "commander";

import { validateSupercodexCommandCount } from "../operations";
import { loadRegistry, validateRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Validate command registry and static SuperCodex configuration")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--strict", "Fail on warnings too")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registryResult = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const issues = [
          ...registryResult.issues,
          ...validateRegistry(registryResult.registry)
        ];
        const strict = Boolean(options.strict);
        const commandCountValidation = validateSupercodexCommandCount(
          Object.keys(registryResult.registry.commands)
        );
        const hasErrors = issues.some((issue) => issue.level === "error");
        const hasWarnings = issues.some((issue) => issue.level === "warn");

        const payload = {
          valid:
            !hasErrors &&
            commandCountValidation.valid &&
            (!strict || !hasWarnings),
          command_count: Object.keys(registryResult.registry.commands).length,
          strict,
          issues: issues.map((issue) => ({
            level: issue.level,
            path: issue.path,
            message: issue.message
          })),
          errors: commandCountValidation.errors
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(`Registry valid: ${payload.valid ? "yes" : "no"}`);
          console.log(`Strict mode: ${strict ? "on" : "off"}`);
          console.log(`Command count: ${payload.command_count}`);
          for (const error of commandCountValidation.errors) {
            console.log(`- [error] ${error}`);
          }
          for (const issue of payload.issues) {
            console.log(`- [${issue.level}] ${issue.message} (${issue.path})`);
          }
        }

        if (!payload.valid) {
          process.exitCode = 1;
        }
      })
    );
}
