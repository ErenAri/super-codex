import type { Command } from "commander";

import { syncCatalogMetadata } from "../operations";
import { getCatalogEntry, listCatalogEntries, loadRegistry, searchCatalogEntries } from "../registry";
import { runCommand } from "./utils";

export function registerCatalogCommands(program: Command): void {
  const catalog = program.command("catalog").description("Browse and sync bundled MCP catalog");

  attachCatalogSubcommands(catalog, {
    showPrettyByDefault: true,
    includeSync: true
  });
}

export function registerMcpCatalogCommands(parent: Command): void {
  const catalog = parent.command("catalog").description("Browse MCP catalog");
  attachCatalogSubcommands(catalog, {
    showPrettyByDefault: false,
    includeSync: false
  });
}

interface CatalogAttachOptions {
  showPrettyByDefault: boolean;
  includeSync: boolean;
}

function attachCatalogSubcommands(catalog: Command, options: CatalogAttachOptions): void {
  catalog
    .command("list")
    .description("List catalog entries")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((cmdOptions) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: cmdOptions.codexHome as string | undefined });
        const entries = listCatalogEntries(registry.registry);
        if (Boolean(cmdOptions.json)) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        for (const entry of entries) {
          console.log(`${entry.id} (${entry.transport}) - ${entry.description}`);
        }
      })
    );

  catalog
    .command("search")
    .description("Search catalog entries")
    .argument("<query>", "Search query")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((query, cmdOptions) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: cmdOptions.codexHome as string | undefined });
        const entries = searchCatalogEntries(registry.registry, query as string);
        if (Boolean(cmdOptions.json)) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        if (entries.length === 0) {
          console.log("No matching catalog entries.");
          return;
        }
        for (const entry of entries) {
          console.log(`${entry.id} (${entry.transport}) - ${entry.description}`);
        }
      })
    );

  catalog
    .command("show")
    .description("Show catalog entry")
    .argument("<id>", "Catalog entry id")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((id, cmdOptions) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: cmdOptions.codexHome as string | undefined });
        const entry = getCatalogEntry(registry.registry, id as string);
        if (!entry) {
          throw new Error(`Catalog entry "${id}" not found.`);
        }

        if (Boolean(cmdOptions.json)) {
          console.log(JSON.stringify(entry, null, 2));
          return;
        }

        if (!options.showPrettyByDefault) {
          console.log(JSON.stringify(entry, null, 2));
          return;
        }

        console.log(`${entry.id} (${entry.transport})`);
        console.log(entry.description);
        if (entry.transport === "stdio") {
          console.log(`Command: ${entry.command} ${(entry.args ?? []).join(" ")}`.trim());
        } else {
          console.log(`URL: ${entry.url}`);
        }
      })
    );

  if (options.includeSync) {
    catalog
      .command("sync")
      .description("Sync catalog metadata into config")
      .option("--codex-home <path>", "Override Codex home directory")
      .action((cmdOptions) =>
        runCommand(async () => {
          const result = await syncCatalogMetadata({
            codexHome: cmdOptions.codexHome as string | undefined
          });
          console.log(`Backup: ${result.backup.backupDir}`);
          console.log(result.changed ? "Catalog metadata updated." : "Catalog metadata already current.");
        })
      );
  }
}
