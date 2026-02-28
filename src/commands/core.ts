import path from "node:path";
import type { Command } from "commander";

import {
  getSupercodexStatus,
  installSupercodex,
  listPromptPackStatus,
  uninstallSupercodex
} from "../operations";
import { initProjectTemplate } from "../project-init";
import { runCommand, printWarnings } from "./utils";

export function registerCoreCommands(program: Command): void {
  program
    .command("install")
    .description("Install SuperCodex prompt pack and merge ~/.codex/config.toml safely")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply SuperCodex values into conflicting standard locations")
    .action((options) =>
      runCommand(async () => {
        const result = await installSupercodex({
          codexHome: options.codexHome as string | undefined,
          force: Boolean(options.force)
        });

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(`Config: ${result.paths.configPath}`);
        console.log(result.configChanged ? "Config merged." : "Config already up to date.");
        console.log(
          result.promptChanged
            ? `Prompt pack installed at ${result.paths.promptPackDir}.`
            : `Prompt pack already current at ${result.paths.promptPackDir}.`
        );

        printWarnings(result.warnings);
      })
    );

  program
    .command("uninstall")
    .description("Remove SuperCodex-managed config and prompt pack")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const result = await uninstallSupercodex({
          codexHome: options.codexHome as string | undefined
        });

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(`Config: ${result.paths.configPath}`);
        console.log(result.configChanged ? "SuperCodex-managed config removed." : "No managed config found.");
        console.log(result.promptRemoved ? "Prompt pack removed." : "Prompt pack was not installed.");
        console.log(
          result.removedAgents.length > 0
            ? `Removed agents: ${result.removedAgents.join(", ")}`
            : "Removed agents: (none)"
        );
        console.log(
          result.removedMcpServers.length > 0
            ? `Removed MCP servers: ${result.removedMcpServers.join(", ")}`
            : "Removed MCP servers: (none)"
        );
      })
    );

  program
    .command("list")
    .description("List bundled prompt pack files and installed prompt files")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((options) =>
      runCommand(async () => {
        const result = await listPromptPackStatus(options.codexHome as string | undefined);
        const installed = new Set(result.installed);

        console.log(`Prompt pack directory: ${result.promptPackDir}`);
        console.log("Bundled prompts:");
        for (const promptName of result.bundled) {
          const state = installed.has(promptName) ? "installed" : "missing";
          console.log(`- ${promptName} (${state})`);
        }
      })
    );

  program
    .command("status")
    .description("Show SuperCodex install status and managed entries")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await getSupercodexStatus(options.codexHome as string | undefined);

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(`Codex home: ${result.codexHome}`);
        console.log(`Config path: ${result.configPath}`);
        console.log(`Config exists: ${result.configExists ? "yes" : "no"}`);
        console.log(`SuperCodex section installed: ${result.supercodexInstalled ? "yes" : "no"}`);
        console.log(
          `Prompt pack: ${result.promptPackInstalled ? "installed" : "missing"} (${result.promptPackDir})`
        );
        console.log(`Default mode: ${result.defaultMode ?? "(builtin)"}`);
        console.log(`Default persona: ${result.defaultPersona ?? "(builtin)"}`);
        console.log(`Catalog version: ${result.catalogVersion ?? "(unknown)"}`);
        console.log(
          result.managedAgents.length > 0
            ? `Managed agents: ${result.managedAgents.join(", ")}`
            : "Managed agents: (none)"
        );
        console.log(
          result.managedMcpServers.length > 0
            ? `Managed MCP servers: ${result.managedMcpServers.join(", ")}`
            : "Managed MCP servers: (none)"
        );
        console.log(
          result.catalogInstalledIds.length > 0
            ? `Catalog-installed MCP ids: ${result.catalogInstalledIds.join(", ")}`
            : "Catalog-installed MCP ids: (none)"
        );
        console.log(
          result.overridePaths.length > 0
            ? `Pending overrides: ${result.overridePaths.join(", ")}`
            : "Pending overrides: (none)"
        );
      })
    );

  program
    .command("init")
    .description("Create a project-scoped .codex template in the current directory")
    .option("--dir <path>", "Project directory (default: cwd)")
    .action((options) =>
      runCommand(async () => {
        const projectRoot = options.dir ? path.resolve(options.dir as string) : process.cwd();
        const result = await initProjectTemplate(projectRoot);

        console.log(`Project config: ${result.configPath}`);
        console.log(result.configChanged ? "Project config initialized." : "Project config already compatible.");
        console.log(`Project README: ${result.readmePath}`);
        console.log(result.readmeChanged ? "Project README created." : "Project README already exists.");

        if (result.skippedPaths.length > 0) {
          console.log(`Preserved existing values: ${result.skippedPaths.join(", ")}`);
        }
      })
    );
}
