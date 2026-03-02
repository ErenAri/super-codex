import type { Command } from "commander";

import { contentFileExists, loadContentFile } from "../content-loader";
import { loadRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerAgentCommands(program: Command): void {
  const agent = program.command("agent").description("Manage SuperCodex agent definitions");

  agent
    .command("list")
    .description("List agent definitions")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const agents = Object.values(registry.registry.agent_definitions).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (Boolean(options.json)) {
          console.log(JSON.stringify(agents, null, 2));
          return;
        }

        for (const def of agents) {
          const persona = def.primary_persona ? ` [${def.primary_persona}]` : "";
          console.log(`${def.name}${persona} - ${def.description}`);
        }
      })
    );

  agent
    .command("show")
    .description("Show agent definition details")
    .argument("<name>", "Agent name")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--full", "Show full content file")
    .action((name, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.agent_definitions[name as string];
        if (!definition) {
          throw new Error(`Agent "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(definition, null, 2));
          return;
        }

        console.log(`${definition.name} - ${definition.description}`);
        if (definition.primary_persona) {
          console.log(`Primary persona: ${definition.primary_persona}`);
        }
        if (definition.primary_mode) {
          console.log(`Primary mode: ${definition.primary_mode}`);
        }
        if (definition.capabilities && definition.capabilities.length > 0) {
          console.log(`Capabilities: ${definition.capabilities.join(", ")}`);
        }
        if (definition.triggers && definition.triggers.length > 0) {
          console.log(`Triggers: ${definition.triggers.join(", ")}`);
        }

        if (Boolean(options.full) && definition.content_file) {
          if (contentFileExists("agents", definition.content_file)) {
            console.log("");
            console.log(loadContentFile("agents", definition.content_file));
          }
        }
      })
    );
}
