import type { Command } from "commander";

import { loadRegistry } from "../registry";
import { checkCompatibility, resolveWorkflow } from "../runtime";
import { runCommand } from "./utils";

export function registerRunCommands(program: Command): void {
  const run = program.command("run").description("Resolve workflow context");

  for (const workflowName of ["plan", "review", "refactor", "debug"] as const) {
    run
      .command(workflowName)
      .description(`Resolve ${workflowName} workflow context`)
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
          const compat = checkCompatibility(
            registry.registry,
            `run.${workflowName}`,
            resolution.mode,
            resolution.persona
          );
          if (!compat.ok) {
            throw new Error(compat.errors.join(" "));
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
}
