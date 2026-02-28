import type { Command } from "commander";

import {
  getShellBridgeStatus,
  installShellBridge,
  normalizeShellKind,
  removeShellBridge,
  renderShellBridgeScript,
  SUPPORTED_SHELLS
} from "../shell-bridge";
import { runCommand } from "./utils";

const SHELL_LABEL = SUPPORTED_SHELLS.join(", ");

export function registerShellCommands(program: Command): void {
  const shell = program.command("shell").description("Install shell bridge for sc alias shortcuts");

  shell
    .command("install")
    .description("Install or update shell profile with the SuperCodex sc bridge")
    .option("--shell <name>", `Shell type (${SHELL_LABEL})`)
    .option("--profile <path>", "Shell profile path override")
    .action((options) =>
      runCommand(async () => {
        const result = await installShellBridge({
          shell: options.shell as string | undefined,
          profilePath: options.profile as string | undefined
        });

        console.log(`Shell: ${result.shell}`);
        console.log(`Profile: ${result.profilePath}`);
        console.log(result.changed ? "Shell bridge installed/updated." : "Shell bridge already current.");
        console.log("Reload your shell or source the profile to activate `sc`.");
      })
    );

  shell
    .command("remove")
    .description("Remove SuperCodex shell bridge from profile")
    .option("--shell <name>", `Shell type (${SHELL_LABEL})`)
    .option("--profile <path>", "Shell profile path override")
    .action((options) =>
      runCommand(async () => {
        const result = await removeShellBridge({
          shell: options.shell as string | undefined,
          profilePath: options.profile as string | undefined
        });

        console.log(`Shell: ${result.shell}`);
        console.log(`Profile: ${result.profilePath}`);
        console.log(result.changed ? "Shell bridge removed." : "Shell bridge not present.");
      })
    );

  shell
    .command("status")
    .description("Inspect shell bridge status")
    .option("--shell <name>", `Shell type (${SHELL_LABEL})`)
    .option("--profile <path>", "Shell profile path override")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await getShellBridgeStatus({
          shell: options.shell as string | undefined,
          profilePath: options.profile as string | undefined
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(`Shell: ${result.shell}`);
        console.log(`Profile: ${result.profilePath}`);
        console.log(`Profile exists: ${result.profileExists ? "yes" : "no"}`);
        console.log(`Bridge installed: ${result.installed ? "yes" : "no"}`);
      })
    );

  shell
    .command("script")
    .description("Print shell bridge script for manual profile setup")
    .option("--shell <name>", `Shell type (${SHELL_LABEL})`)
    .action((options) =>
      runCommand(async () => {
        const normalizedShell = normalizeShellKind(options.shell as string | undefined);
        console.log(renderShellBridgeScript(normalizedShell));
      })
    );
}
