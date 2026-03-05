import path from "node:path";
import type { Command } from "commander";

import {
  getSupercodexStatus,
  installSupercodex,
  listPromptPackStatus,
  uninstallSupercodex
} from "../operations";
import { initProjectTemplate } from "../project-init";
import { getShellBridgeStatus } from "../shell-bridge";
import { bullet, kv, line, resolveOutputStyle } from "./presenter";
import { runCommand, printWarnings } from "./utils";

export function registerCoreCommands(program: Command): void {
  program
    .command("install")
    .description("Install SuperCodex prompt pack and merge ~/.codex/config.toml safely")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply SuperCodex values into conflicting standard locations")
    .option("--plain", "Disable decorated output")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          plain: Boolean(options.plain)
        });
        const result = await installSupercodex({
          codexHome: options.codexHome as string | undefined,
          force: Boolean(options.force)
        });

        console.log(line("section", "Install summary", style));
        console.log(kv("Backup", result.backup.backupDir, style));
        console.log(kv("Config", result.paths.configPath, style));
        console.log(line(result.configChanged ? "ok" : "info", result.configChanged ? "Config merged." : "Config already up to date.", style));
        console.log(
          line(
            result.promptChanged ? "ok" : "info",
            result.promptChanged
              ? `Prompt pack installed at ${result.paths.promptPackDir}.`
              : `Prompt pack already current at ${result.paths.promptPackDir}.`,
            style
          )
        );
        console.log(line("tip", "Alias usage: supercodex /supercodex:research <args...> (short: /sc:research)", style));
        console.log(line("tip", "Codex interactive usage: /prompts:supercodex-research <task>", style));
        console.log(line("tip", "Optional shell shortcut bridge: supercodex shell install", style));

        printWarnings(result.warnings, { plain: Boolean(options.plain) });
      }, {
        plain: Boolean(options.plain)
      })
    );

  program
    .command("uninstall")
    .description("Remove SuperCodex-managed config and prompt pack")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--plain", "Disable decorated output")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          plain: Boolean(options.plain)
        });
        const result = await uninstallSupercodex({
          codexHome: options.codexHome as string | undefined
        });

        console.log(line("section", "Uninstall summary", style));
        console.log(kv("Backup", result.backup.backupDir, style));
        console.log(kv("Config", result.paths.configPath, style));
        console.log(
          line(
            result.configChanged ? "ok" : "info",
            result.configChanged ? "SuperCodex-managed config removed." : "No managed config found.",
            style
          )
        );
        console.log(
          line(
            result.promptRemoved ? "ok" : "info",
            result.promptRemoved ? "Prompt pack removed." : "Prompt pack was not installed.",
            style
          )
        );
        console.log(
          kv(
            "Removed agents",
            result.removedAgents.length > 0 ? result.removedAgents.join(", ") : "(none)",
            style
          )
        );
        console.log(
          kv(
            "Removed MCP servers",
            result.removedMcpServers.length > 0 ? result.removedMcpServers.join(", ") : "(none)",
            style
          )
        );
      }, {
        plain: Boolean(options.plain)
      })
    );

  program
    .command("list")
    .description("List bundled prompt pack files and installed prompt files")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--plain", "Disable decorated output")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          plain: Boolean(options.plain)
        });
        const result = await listPromptPackStatus(options.codexHome as string | undefined);
        const installed = new Set(result.installed);

        console.log(line("section", "Prompt pack inventory", style));
        console.log(kv("Prompt pack directory", result.promptPackDir, style));
        console.log(line("info", "Bundled prompts:", style));
        for (const promptName of result.bundled) {
          const state = installed.has(promptName) ? "installed" : "missing";
          const kind = state === "installed" ? "ok" : "warn";
          console.log(bullet(`${promptName} (${state})`, style, kind));
        }
        const interactiveInstalled = new Set(result.interactiveInstalled);
        console.log(kv("Interactive prompt command directory", result.promptsDir, style));
        console.log(line("info", "Interactive prompt commands:", style));
        for (const fileName of result.interactiveBundled) {
          const state = interactiveInstalled.has(fileName) ? "installed" : "missing";
          const slashName = fileName.replace(/\.md$/i, "");
          const kind = state === "installed" ? "ok" : "warn";
          console.log(bullet(`/prompts:${slashName} (${state})`, style, kind));
        }
      }, {
        plain: Boolean(options.plain)
      })
    );

  program
    .command("status")
    .description("Show SuperCodex install status and managed entries")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const result = await getSupercodexStatus(options.codexHome as string | undefined);

        if (Boolean(options.json)) {
          const shellBridge = await getShellBridgeStatus();
          console.log(JSON.stringify({ ...result, shellBridge }, null, 2));
          return;
        }

        const shellBridge = await getShellBridgeStatus();

        console.log(line("section", "SuperCodex status", style));
        console.log(kv("Codex home", result.codexHome, style));
        console.log(kv("Config path", result.configPath, style));
        console.log(line(result.configExists ? "ok" : "warn", `Config exists: ${result.configExists ? "yes" : "no"}`, style));
        console.log(
          line(
            result.supercodexInstalled ? "ok" : "warn",
            `SuperCodex section installed: ${result.supercodexInstalled ? "yes" : "no"}`,
            style
          )
        );
        console.log(
          line(
            result.promptPackInstalled ? "ok" : "warn",
            `Prompt pack: ${result.promptPackInstalled ? "installed" : "missing"} (${result.promptPackDir})`,
            style
          )
        );
        console.log(kv("Default mode", result.defaultMode ?? "(builtin)", style));
        console.log(kv("Default persona", result.defaultPersona ?? "(builtin)", style));
        console.log(kv("Catalog version", result.catalogVersion ?? "(unknown)", style));
        console.log(kv("Session memory enabled", result.memoryEnabled ? "yes" : "no", style));
        console.log(kv("Session memory path", result.memoryPath, style));
        console.log(kv("Session memory max entries", String(result.memoryMaxEntries), style));
        console.log(kv("Policy enabled", result.policyEnabled ? "yes" : "no", style));
        console.log(kv("Policy strictness", result.policyStrictness, style));
        console.log(kv("Lock path", result.lockPath, style));
        console.log(kv("Lock enforce in CI", result.lockEnforceInCi ? "yes" : "no", style));
        console.log(
          kv(
            "Managed agents",
            result.managedAgents.length > 0 ? result.managedAgents.join(", ") : "(none)",
            style
          )
        );
        console.log(
          kv(
            "Managed MCP servers",
            result.managedMcpServers.length > 0 ? result.managedMcpServers.join(", ") : "(none)",
            style
          )
        );
        console.log(
          kv(
            "Catalog-installed MCP ids",
            result.catalogInstalledIds.length > 0 ? result.catalogInstalledIds.join(", ") : "(none)",
            style
          )
        );
        console.log(
          kv(
            "Pending overrides",
            result.overridePaths.length > 0 ? result.overridePaths.join(", ") : "(none)",
            style
          )
        );
        console.log(
          kv(
            "Interactive prompt commands installed",
            String(result.interactivePromptCommandsInstalled.length),
            style
          )
        );
        console.log(
          kv(
            "Interactive prompt commands missing",
            String(result.interactivePromptCommandsMissing.length),
            style
          )
        );
        console.log(line("tip", "Codex slash invocation format: /prompts:supercodex-research <task>", style));
        console.log(
          line(
            shellBridge.installed ? "ok" : "warn",
            `Shell bridge: ${shellBridge.installed ? "installed" : "missing"} ` +
              `(${shellBridge.shell}: ${shellBridge.profilePath})`,
            style
          )
        );
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
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
