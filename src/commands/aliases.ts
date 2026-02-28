import type { Command } from "commander";

import {
  listAliases,
  listAliasPacks,
  loadRegistry,
  normalizeAliasToken,
  searchAliases
} from "../registry";
import { runCommand } from "./utils";

export function registerAliasCommands(program: Command): void {
  const aliases = program.command("aliases").description("SuperClaude-style slash alias mappings");

  aliases
    .command("list")
    .description("List alias mappings")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--pack <name>", "Filter aliases by pack")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registryResult = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const packName = normalizePackOption(options.pack as string | undefined);
        ensurePackExists(registryResult.registry.alias_packs, packName);
        const entries = listAliases(registryResult.registry, { pack: packName });
        if (Boolean(options.json)) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        for (const entry of entries) {
          const packLabel = entry.pack ? ` [${entry.pack}]` : "";
          console.log(`/sc:${entry.name} -> ${entry.target}${packLabel}`);
        }
      })
    );

  aliases
    .command("show")
    .description("Show a specific alias mapping")
    .argument("<name>", "Alias name (supports /sc:name or sc:name)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const normalized = normalizeAliasToken(name as string);
        if (!normalized) {
          throw new Error(`Invalid alias name "${String(name)}".`);
        }

        const registryResult = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const entry = registryResult.registry.aliases[normalized.name];
        if (!entry) {
          throw new Error(`Alias "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(entry, null, 2));
          return;
        }

        console.log(`/sc:${entry.name}`);
        console.log(`Target: ${entry.target}`);
        console.log(`Description: ${entry.description}`);
        if (entry.pack) {
          console.log(`Pack: ${entry.pack}`);
        }
        if (entry.risk_level) {
          console.log(`Risk: ${entry.risk_level}`);
        }
        if (entry.stability) {
          console.log(`Stability: ${entry.stability}`);
        }
        if (entry.tags && entry.tags.length > 0) {
          console.log(`Tags: ${entry.tags.join(", ")}`);
        }
        if (entry.default_mode) {
          console.log(`Default mode: ${entry.default_mode}`);
        }
        if (entry.default_persona) {
          console.log(`Default persona: ${entry.default_persona}`);
        }
        console.log(`Forward args: ${entry.forward_args !== false ? "yes" : "no"}`);
      })
    );

  aliases
    .command("packs")
    .description("List alias packs")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registryResult = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const entries = listAliasPacks(registryResult.registry);
        if (Boolean(options.json)) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        for (const entry of entries) {
          console.log(`${entry.name} (${entry.aliases.length})`);
          console.log(`  ${entry.description}`);
        }
      })
    );

  aliases
    .command("search")
    .description("Search alias mappings")
    .argument("<query>", "Text query")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--pack <name>", "Filter aliases by pack")
    .option("--json", "Output JSON")
    .action((query, options) =>
      runCommand(async () => {
        const registryResult = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const packName = normalizePackOption(options.pack as string | undefined);
        ensurePackExists(registryResult.registry.alias_packs, packName);
        const entries = searchAliases(registryResult.registry, query as string, { pack: packName });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        if (entries.length === 0) {
          console.log("No aliases matched.");
          return;
        }

        for (const entry of entries) {
          const packLabel = entry.pack ? ` [${entry.pack}]` : "";
          console.log(`/sc:${entry.name} -> ${entry.target}${packLabel}`);
        }
      })
    );
}

function ensurePackExists(packs: Record<string, unknown>, pack?: string): void {
  if (!pack) {
    return;
  }

  if (!Object.hasOwn(packs, pack)) {
    throw new Error(`Alias pack "${pack}" not found.`);
  }
}

function normalizePackOption(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
