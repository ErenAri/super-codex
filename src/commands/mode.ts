import type { Command } from "commander";

import { setDefaultMode, unsetDefaultMode } from "../operations";
import { loadRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerModeCommands(program: Command): void {
  const mode = program.command("mode").description("Manage SuperCodex modes");

  mode
    .command("list")
    .description("List modes")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        for (const modeName of Object.keys(registry.registry.modes).sort()) {
          const definition = registry.registry.modes[modeName];
          console.log(`${modeName} - ${definition.description}`);
        }
      })
    );

  mode
    .command("show")
    .description("Show mode details")
    .argument("<name>", "Mode name")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.modes[name as string];
        if (!definition) {
          throw new Error(`Mode "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(definition, null, 2));
        } else {
          console.log(`${definition.name} - ${definition.description}`);
          if (definition.prompt_overlay) {
            console.log(`Prompt overlay: ${definition.prompt_overlay}`);
          }
          if (definition.reasoning_budget) {
            console.log(`Reasoning budget: ${definition.reasoning_budget}`);
          }
        }
      })
    );

  mode
    .command("set")
    .description("Set default mode")
    .argument("<name>", "Mode name")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        if (!registry.registry.modes[name as string]) {
          throw new Error(`Unknown mode "${name}".`);
        }

        const result = await setDefaultMode(name as string, {
          codexHome: options.codexHome as string | undefined
        });
        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(result.changed ? `Default mode set to "${name}".` : `Default mode already "${name}".`);
      })
    );

  mode
    .command("unset")
    .description("Unset default mode")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const result = await unsetDefaultMode({
          codexHome: options.codexHome as string | undefined
        });
        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(result.changed ? "Default mode unset." : "Default mode was already unset.");
      })
    );
}
