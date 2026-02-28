import type { Command } from "commander";

import {
  buildHttpServerDefinition,
  buildStdioServerDefinition,
  parseEnvAssignments
} from "../mcp";
import {
  addMcpServer,
  installMcpFromCatalog,
  listConfiguredMcpServers,
  removeMcpServer,
  testMcpServerByName
} from "../operations";
import { getCatalogEntry, loadRegistry } from "../registry";
import { registerMcpCatalogCommands } from "./catalog";
import { registerMcpDoctorCommand } from "./doctor";
import { collectRepeatedOption, printWarnings, runCommand } from "./utils";

export function registerMcpCommands(program: Command): void {
  const mcp = program.command("mcp").description("Manage MCP servers and catalog entries");

  mcp
    .command("add")
    .description("Add an MCP server entry in ~/.codex/config.toml")
    .argument("<name>", "MCP server name")
    .argument("[command...]", "STDIO command (omit when --http is used)")
    .option("--http <url>", "Use HTTP transport instead of STDIO")
    .option("--env <key=value>", "Environment variable assignment", collectRepeatedOption, [])
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply values directly when conflicts exist")
    .action((name, commandParts, options) =>
      runCommand(async () => {
        const hasHttp = Boolean(options.http);
        const command = (commandParts as string[] | undefined) ?? [];

        if (hasHttp && command.length > 0) {
          throw new Error("Do not pass <command...> when using --http.");
        }

        if (!hasHttp && command.length === 0) {
          throw new Error("Provide <command...> for STDIO transport, or use --http <url>.");
        }

        const env = parseEnvAssignments((options.env as string[]) ?? []);
        const definition = hasHttp
          ? buildHttpServerDefinition(options.http as string, env)
          : buildStdioServerDefinition(command, env);

        const result = await addMcpServer(name as string, definition, {
          codexHome: options.codexHome as string | undefined,
          force: Boolean(options.force)
        });

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(`Config: ${result.paths.configPath}`);
        console.log(result.configChanged ? `MCP server "${name}" merged.` : `MCP server "${name}" already current.`);
        printWarnings(result.warnings);
      })
    );

  mcp
    .command("list")
    .description("List configured MCP servers")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await listConfiguredMcpServers(options.codexHome as string | undefined);
        if (Boolean(options.json)) {
          console.log(JSON.stringify(result.servers, null, 2));
          return;
        }

        if (result.servers.length === 0) {
          console.log("No MCP servers configured.");
          return;
        }

        for (const server of result.servers) {
          console.log(`${server.name} (${server.transport})`);
        }
      })
    );

  mcp
    .command("install")
    .description("Install MCP server from bundled catalog")
    .argument("<id>", "Catalog entry id")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply values directly when conflicts exist")
    .action((id, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const entry = getCatalogEntry(registry.registry, id as string);
        if (!entry) {
          throw new Error(`Catalog entry "${id}" not found.`);
        }

        const result = await installMcpFromCatalog(entry, {
          codexHome: options.codexHome as string | undefined,
          force: Boolean(options.force)
        });

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(
          result.configChanged
            ? `Installed MCP catalog entry "${result.catalogId}" as server "${result.serverName}".`
            : `MCP catalog entry "${result.catalogId}" is already current.`
        );
        printWarnings(result.warnings);
      })
    );

  mcp
    .command("remove")
    .description("Remove configured MCP server")
    .argument("<name>", "MCP server name")
    .option("--codex-home <path>", "Override Codex home directory")
    .action((name, options) =>
      runCommand(async () => {
        const result = await removeMcpServer(name as string, {
          codexHome: options.codexHome as string | undefined
        });
        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(result.removed ? `Removed MCP server "${name}".` : `MCP server "${name}" not found.`);
        if (result.removedCatalogIds.length > 0) {
          console.log(`Removed catalog ids: ${result.removedCatalogIds.join(", ")}`);
        }
      })
    );

  mcp
    .command("test")
    .description("Test a configured MCP server")
    .argument("<name>", "MCP server name")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const result = await testMcpServerByName(name as string, {
          codexHome: options.codexHome as string | undefined
        });
        if (!result.exists || !result.result) {
          throw new Error(`MCP server "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result.result, null, 2));
        } else {
          console.log(`${result.result.name}: ${result.result.ok ? "ok" : "failed"}`);
          for (const message of result.result.messages) {
            console.log(`- ${message}`);
          }
        }

        if (!result.result.ok) {
          process.exitCode = 1;
        }
      })
    );

  registerMcpDoctorCommand(mcp);
  registerMcpCatalogCommands(mcp);
}
