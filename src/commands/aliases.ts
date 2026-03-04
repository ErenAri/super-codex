import type { Command } from "commander";

import {
  listAliases,
  listAliasPacks,
  loadRegistry,
  normalizeAliasToken,
  recommendAliases,
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
          console.log(`/supercodex:${entry.name} (/sc:${entry.name}) -> ${entry.target}${packLabel}`);
        }
      })
    );

  aliases
    .command("show")
    .description("Show a specific alias mapping")
    .argument("<name>", "Alias name (supports /supercodex:name, supercodex:name, /sc:name, sc:name)")
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

        console.log(`/supercodex:${entry.name}`);
        console.log(`Short alias: /sc:${entry.name}`);
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
          console.log(`/supercodex:${entry.name} (/sc:${entry.name}) -> ${entry.target}${packLabel}`);
        }
      })
    );

  aliases
    .command("recommend")
    .description("Recommend aliases for an intent")
    .argument("<intent>", "Intent or task description")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--pack <name>", "Filter aliases by pack")
    .option("--limit <count>", "Maximum recommendations to return (default: 5)")
    .option("--json", "Output JSON")
    .action((intent, options) =>
      runCommand(async () => {
        const registryResult = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const packName = normalizePackOption(options.pack as string | undefined);
        ensurePackExists(registryResult.registry.alias_packs, packName);
        const limit = parseLimitOption(options.limit as string | undefined);
        const recommendations = recommendAliases(registryResult.registry, intent as string, {
          pack: packName,
          limit
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(recommendations, null, 2));
          return;
        }

        if (recommendations.length === 0) {
          console.log("No alias recommendations found.");
          return;
        }

        for (const recommendation of recommendations) {
          const entry = recommendation.alias;
          const packLabel = entry.pack ? ` [${entry.pack}]` : "";
          console.log(
            `/supercodex:${entry.name} (/sc:${entry.name}) -> ${entry.target}${packLabel} ` +
              `(score: ${recommendation.score})`
          );
          if (recommendation.reasons.length > 0) {
            console.log(`  ${recommendation.reasons.join(" ")}`);
          }
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

function parseLimitOption(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit value "${value}". Expected a positive number.`);
  }
  return Math.trunc(parsed);
}
