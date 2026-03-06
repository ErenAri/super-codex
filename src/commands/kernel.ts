import type { Command } from "commander";

import { buildFrameworkKernelSnapshot, listKernelPersonaNames } from "../kernel";
import { runCommand } from "./utils";

export function registerKernelCommands(program: Command): void {
  const kernel = program.command("kernel").description("Inspect framework kernel primitives");

  kernel
    .command("export")
    .description("Export kernel primitive snapshot")
    .option("--codex-home <path>", "Accepted for CLI consistency; not used by this command")
    .option("--json", "Output JSON (default)")
    .action((options) =>
      runCommand(async () => {
        const snapshot = buildFrameworkKernelSnapshot();
        if (Boolean(options.json)) {
          console.log(JSON.stringify(snapshot, null, 2));
          return;
        }

        console.log(`Kernel version: ${snapshot.version}`);
        console.log(`Generated at: ${snapshot.generated_at}`);
        console.log(`Commands: ${snapshot.command_registry.length}`);
        console.log(`Agents: ${snapshot.agent_registry.length}`);
        console.log(`Modes: ${snapshot.mode_engine.length}`);
        console.log(`Connectors: ${snapshot.connector_registry.length}`);
        console.log(`Personas: ${listKernelPersonaNames().join(", ")}`);
        console.log(`Tools: ${snapshot.tool_layer.map((tool) => tool.tool_id).join(", ")}`);
      })
    );
}
