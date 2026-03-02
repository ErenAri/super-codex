import type { Command } from "commander";

import { loadRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerFlagCommands(program: Command): void {
  const flag = program.command("flag").description("Manage SuperCodex flags");

  flag
    .command("list")
    .description("List flags")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const flags = Object.values(registry.registry.flags).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (Boolean(options.json)) {
          console.log(JSON.stringify(flags, null, 2));
          return;
        }

        for (const def of flags) {
          const extra = def.activates_mode ? ` -> mode:${def.activates_mode}` : "";
          console.log(`${def.flag} [${def.category}]${extra} - ${def.description}`);
        }
      })
    );

  flag
    .command("show")
    .description("Show flag details")
    .argument("<name>", "Flag name")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.flags[name as string];
        if (!definition) {
          throw new Error(`Flag "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(definition, null, 2));
          return;
        }

        console.log(`${definition.flag} (${definition.name})`);
        console.log(`Category: ${definition.category}`);
        console.log(`Description: ${definition.description}`);
        if (definition.activates_mode) {
          console.log(`Activates mode: ${definition.activates_mode}`);
        }
        if (definition.activates_mcp && definition.activates_mcp.length > 0) {
          console.log(`Activates MCP: ${definition.activates_mcp.join(", ")}`);
        }
        if (definition.reasoning_budget) {
          console.log(`Reasoning budget: ${definition.reasoning_budget}`);
        }
        if (definition.conflicts_with && definition.conflicts_with.length > 0) {
          console.log(`Conflicts with: ${definition.conflicts_with.join(", ")}`);
        }
      })
    );
}
