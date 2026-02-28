import type { Command } from "commander";

import { setDefaultPersona, unsetDefaultPersona } from "../operations";
import { loadRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerPersonaCommands(program: Command): void {
  const persona = program.command("persona").description("Manage SuperCodex personas");

  persona
    .command("list")
    .description("List personas")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        for (const personaName of Object.keys(registry.registry.personas).sort()) {
          const definition = registry.registry.personas[personaName];
          console.log(`${personaName} - ${definition.description}`);
        }
      })
    );

  persona
    .command("show")
    .description("Show persona details")
    .argument("<name>", "Persona name")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.personas[name as string];
        if (!definition) {
          throw new Error(`Persona "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(definition, null, 2));
        } else {
          console.log(`${definition.name} - ${definition.description}`);
          if (definition.system_prompt) {
            console.log(`System prompt: ${definition.system_prompt}`);
          }
        }
      })
    );

  persona
    .command("set")
    .description("Set default persona")
    .argument("<name>", "Persona name")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        if (!registry.registry.personas[name as string]) {
          throw new Error(`Unknown persona "${name}".`);
        }

        const result = await setDefaultPersona(name as string, {
          codexHome: options.codexHome as string | undefined
        });
        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(result.changed ? `Default persona set to "${name}".` : `Default persona already "${name}".`);
      })
    );

  persona
    .command("unset")
    .description("Unset default persona")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const result = await unsetDefaultPersona({
          codexHome: options.codexHome as string | undefined
        });
        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(result.changed ? "Default persona unset." : "Default persona was already unset.");
      })
    );
}
