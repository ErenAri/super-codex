import type { Command } from "commander";

import { checkLockStatus, writeLock } from "../services/lockfile";
import { runCommand } from "./utils";

export function registerLockCommands(program: Command): void {
  const lock = program.command("lock").description("Manage deterministic SuperCodex lock state");

  lock
    .command("refresh")
    .description("Refresh lock file from current command/prompt/docs state")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--path <path>", "Override lock file path")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await writeLock({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd(),
          pathOverride: options.path as string | undefined
        });

        const payload = {
          updated: true,
          path: result.path,
          lock: result.lock
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(`Lock refreshed: ${result.path}`);
          console.log(`Command count: ${result.lock.counts.commands}`);
          console.log(`Alias count: ${result.lock.counts.aliases}`);
          console.log(`Workflow file count: ${result.lock.counts.workflows}`);
          console.log(`Wrapper count: ${result.lock.counts.wrappers}`);
        }
      })
    );

  lock
    .command("status")
    .description("Check lock file consistency without modifying files")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--path <path>", "Override lock file path")
    .option("--json", "Output JSON")
    .option("--strict", "Fail when lock file is missing")
    .action((options) =>
      runCommand(async () => {
        const status = await checkLockStatus({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd(),
          pathOverride: options.path as string | undefined
        });
        const strict = Boolean(options.strict);
        const ok = status.inSync || (!status.exists && !strict);

        const payload = {
          ok,
          strict,
          path: status.path,
          exists: status.exists,
          in_sync: status.inSync,
          differences: status.differences
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(`Lock path: ${status.path}`);
          console.log(`Exists: ${status.exists ? "yes" : "no"}`);
          console.log(`In sync: ${status.inSync ? "yes" : "no"}`);
          if (status.differences.length > 0) {
            for (const difference of status.differences) {
              console.log(`- ${difference}`);
            }
          }
        }

        if (!ok) {
          process.exitCode = 1;
        }
      })
    );
}
