import type { Command } from "commander";

import { listContentFiles } from "../content-loader";
import { loadRegistry } from "../registry";
import { checkCompatibility, resolveWorkflow, isBaseWorkflow } from "../runtime";
import { runCommand } from "./utils";

const BASE_WORKFLOWS = ["plan", "review", "refactor", "debug"];

export function registerRunCommands(program: Command): void {
  const run = program.command("run").description("Resolve workflow context");

  // Register the 4 base workflows first
  for (const workflowName of BASE_WORKFLOWS) {
    registerWorkflowCommand(run, workflowName, `Resolve ${workflowName} workflow context`);
  }

  // Dynamically register command workflows from content/commands/
  const commandFiles = listContentFiles("commands");
  for (const file of commandFiles) {
    const commandName = file.replace(/\.md$/, "");
    // Skip if it collides with a base workflow name
    if (BASE_WORKFLOWS.includes(commandName)) {
      continue;
    }
    registerWorkflowCommand(run, commandName, `Run ${commandName} command workflow`);
  }
}

function registerWorkflowCommand(parent: Command, workflowName: string, description: string): void {
  parent
    .command(workflowName)
    .description(description)
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--mode <name>", "Override mode")
    .option("--persona <name>", "Override persona")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const resolution = await resolveWorkflow(registry.registry, {
          workflow: workflowName,
          codexHome: options.codexHome as string | undefined,
          mode: options.mode as string | undefined,
          persona: options.persona as string | undefined,
          projectRoot: process.cwd()
        });

        const commandId = `run.${workflowName}`;
        if (Object.hasOwn(registry.registry.commands, commandId)) {
          const compat = checkCompatibility(
            registry.registry,
            commandId,
            resolution.mode,
            resolution.persona
          );
          if (!compat.ok) {
            throw new Error(compat.errors.join(" "));
          }
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(resolution, null, 2));
          return;
        }

        console.log(`Workflow: ${resolution.workflow}`);
        console.log(`Prompt: ${resolution.promptPath}`);
        console.log(`Mode: ${resolution.mode} (${resolution.modeSource})`);
        console.log(`Persona: ${resolution.persona} (${resolution.personaSource})`);
        if (resolution.overlays.modePrompt) {
          console.log(`Mode overlay: ${resolution.overlays.modePrompt}`);
        }
        if (resolution.overlays.personaPrompt) {
          console.log(`Persona overlay: ${resolution.overlays.personaPrompt}`);
        }
      })
    );
}
