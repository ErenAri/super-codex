import type { Command } from "commander";

import { getFrameworkProfile, listFrameworkProfiles } from "../profiles";
import { runCommand } from "./utils";

export function registerProfileCommands(program: Command): void {
  const profile = program.command("profile").description("Inspect framework profiles");

  profile
    .command("list")
    .description("List available framework profiles")
    .option("--codex-home <path>", "Accepted for CLI consistency; not used by this command")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const profiles = listFrameworkProfiles();
        if (Boolean(options.json)) {
          console.log(JSON.stringify(profiles, null, 2));
          return;
        }

        for (const entry of profiles) {
          console.log(`${entry.id} - ${entry.title}`);
          console.log(`  ${entry.description}`);
        }
      })
    );

  profile
    .command("show")
    .description("Show profile details")
    .argument("<id>", "Profile id")
    .option("--codex-home <path>", "Accepted for CLI consistency; not used by this command")
    .option("--json", "Output JSON")
    .action((id, options) =>
      runCommand(async () => {
        const profileEntry = getFrameworkProfile(String(id));
        if (!profileEntry) {
          throw new Error(`Profile "${String(id)}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(profileEntry, null, 2));
          return;
        }

        console.log(`${profileEntry.id} - ${profileEntry.title}`);
        console.log(profileEntry.description);
        console.log("");
        console.log("Workflow loop:");
        for (const step of profileEntry.workflow_loop) {
          console.log(`- ${step.step_id}: ${step.primary_command}`);
          console.log(`  ${step.objective}`);
          if (step.suggested_aliases.length > 0) {
            console.log(`  aliases: ${step.suggested_aliases.join(", ")}`);
          }
        }
        console.log(`Core agents: ${profileEntry.core_agents.join(", ")}`);
        console.log(`Core modes: ${profileEntry.core_modes.join(", ")}`);
      })
    );
}
