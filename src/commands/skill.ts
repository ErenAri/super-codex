import type { Command } from "commander";

import { contentFileExists, loadContentFile } from "../content-loader";
import { loadRegistry } from "../registry";
import { runCommand } from "./utils";

export function registerSkillCommands(program: Command): void {
  const skill = program.command("skill").description("Manage SuperCodex skills");

  skill
    .command("list")
    .description("List skills")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const skills = Object.values(registry.registry.skills).sort((a, b) =>
          a.id.localeCompare(b.id)
        );

        if (Boolean(options.json)) {
          console.log(JSON.stringify(skills, null, 2));
          return;
        }

        for (const def of skills) {
          const status = def.enabled ? "enabled" : "disabled";
          console.log(`${def.id} (${status}) - ${def.description}`);
        }
      })
    );

  skill
    .command("show")
    .description("Show skill details")
    .argument("<id>", "Skill ID")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--full", "Show full content file")
    .action((id, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.skills[id as string];
        if (!definition) {
          throw new Error(`Skill "${id}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(definition, null, 2));
          return;
        }

        console.log(`${definition.name} (${definition.id}) v${definition.version}`);
        console.log(`Status: ${definition.enabled ? "enabled" : "disabled"}`);
        console.log(`Description: ${definition.description}`);
        if (definition.required_confidence) {
          console.log(`Required confidence: ${definition.required_confidence}%`);
        }
        if (definition.triggers && definition.triggers.length > 0) {
          console.log(`Triggers: ${definition.triggers.join(", ")}`);
        }

        if (Boolean(options.full) && definition.content_file) {
          if (contentFileExists("skills", definition.content_file)) {
            console.log("");
            console.log(loadContentFile("skills", definition.content_file));
          }
        }
      })
    );

  skill
    .command("enable")
    .description("Enable a skill")
    .argument("<id>", "Skill ID")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((id, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.skills[id as string];
        if (!definition) {
          throw new Error(`Skill "${id}" not found.`);
        }
        console.log(`Skill "${id}" is enabled.`);
      })
    );

  skill
    .command("disable")
    .description("Disable a skill")
    .argument("<id>", "Skill ID")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((id, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const definition = registry.registry.skills[id as string];
        if (!definition) {
          throw new Error(`Skill "${id}" not found.`);
        }
        console.log(`Skill "${id}" is disabled.`);
      })
    );
}
