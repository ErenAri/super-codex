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
import {
  BUILTIN_MCP_PROFILES,
  getCatalogEntry,
  listCatalogEntries,
  loadRegistry,
  type CatalogEntry
} from "../registry";
import { tryRecordMetricEvent } from "../services/metrics";
import { registerMcpCatalogCommands } from "./catalog";
import { registerMcpDoctorCommand } from "./doctor";
import { bullet, kv, line, resolveOutputStyle, type OutputStyle } from "./presenter";
import { collectRepeatedOption, printWarnings, runCommand } from "./utils";

const DEFAULT_GUIDED_LIMIT = 3;

interface CatalogInstallOutcome {
  id: string;
  server: string;
  backupDir: string;
  configChanged: boolean;
  warnings: string[];
  testOk: boolean;
  testMessages: string[];
}

interface GuidedRecommendation {
  entry: CatalogEntry;
  score: number;
  reasons: string[];
}

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
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const result = await listConfiguredMcpServers(options.codexHome as string | undefined);
        if (Boolean(options.json)) {
          console.log(JSON.stringify(result.servers, null, 2));
          return;
        }

        if (result.servers.length === 0) {
          console.log(line("info", "No MCP servers configured.", style));
          return;
        }

        console.log(line("section", "Configured MCP servers", style));
        for (const server of result.servers) {
          console.log(bullet(`${server.name} (${server.transport})`, style, "info"));
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  mcp
    .command("install")
    .description("Install MCP server from bundled catalog")
    .argument("[id]", "Catalog entry id")
    .option("--profile <name>", "Install all entries from a profile")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply values directly when conflicts exist")
    .option("--plain", "Disable decorated output")
    .action((id, options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          plain: Boolean(options.plain)
        });
        const codexHome = options.codexHome as string | undefined;
        const force = Boolean(options.force);
        const selectedId = normalizeToken(id as string | undefined);
        const profileName = normalizeToken(options.profile as string | undefined);

        if (selectedId && profileName) {
          throw new Error('Choose either "<id>" or "--profile <name>", not both.');
        }
        if (!selectedId && !profileName) {
          throw new Error('Provide a catalog "<id>" or "--profile <name>".');
        }

        const registry = await loadRegistry({ codexHome });

        if (profileName) {
          const profileEntries = BUILTIN_MCP_PROFILES[profileName];
          if (!profileEntries) {
            throw new Error(
              `Unknown MCP profile "${profileName}". Available profiles: ${Object.keys(BUILTIN_MCP_PROFILES).join(", ")}`
            );
          }
          if (profileEntries.length === 0) {
            console.log(line("info", `MCP profile "${profileName}" has no entries.`, style));
            return;
          }

          const outcomes: CatalogInstallOutcome[] = [];
          for (const profileEntryId of profileEntries) {
            const entry = getCatalogEntry(registry.registry, profileEntryId);
            if (!entry) {
              throw new Error(
                `Catalog entry "${profileEntryId}" from profile "${profileName}" not found.`
              );
            }
            outcomes.push(await installCatalogEntry(entry, { codexHome, force, source: "profile", goal: profileName }));
          }

          printInstallOutcomes(outcomes, `profile "${profileName}"`, style);
          if (outcomes.some((outcome) => !outcome.testOk)) {
            process.exitCode = 1;
          }
          return;
        }

        const entry = getCatalogEntry(registry.registry, selectedId as string);
        if (!entry) {
          throw new Error(`Catalog entry "${selectedId}" not found.`);
        }

        const outcome = await installCatalogEntry(entry, { codexHome, force, source: "manual" });
        printInstallOutcomes([outcome], `entry "${selectedId}"`, style);
        if (!outcome.testOk) {
          process.exitCode = 1;
        }
      }, {
        plain: Boolean(options.plain)
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
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((name, options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const result = await testMcpServerByName(name as string, {
          codexHome: options.codexHome as string | undefined
        });
        if (!result.exists || !result.result) {
          throw new Error(`MCP server "${name}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(result.result, null, 2));
        } else {
          console.log(
            line(result.result.ok ? "ok" : "error", `${result.result.name}: ${result.result.ok ? "ok" : "failed"}`, style)
          );
          for (const message of result.result.messages) {
            console.log(bullet(message, style, result.result.ok ? "info" : "warn"));
          }
        }

        if (!result.result.ok) {
          process.exitCode = 1;
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  mcp
    .command("guided")
    .description("Recommend MCP servers and optionally install the top picks")
    .option("--goal <category>", "Goal keyword (docs, database, github, etc.)")
    .option("--yes", "Install and test top recommendations automatically")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--force", "Apply values directly when conflicts exist")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const codexHome = options.codexHome as string | undefined;
        const force = Boolean(options.force);
        const goal = normalizeToken(options.goal as string | undefined);
        const registry = await loadRegistry({ codexHome });
        const recommendations = rankGuidedCatalogEntries(listCatalogEntries(registry.registry), goal).slice(
          0,
          DEFAULT_GUIDED_LIMIT
        );

        const outcomes: CatalogInstallOutcome[] = [];
        if (Boolean(options.yes)) {
          for (const recommendation of recommendations) {
            outcomes.push(
              await installCatalogEntry(recommendation.entry, {
                codexHome,
                force,
                source: "guided",
                goal: goal ?? "general"
              })
            );
          }
        }

        const payload = {
          goal: goal ?? null,
          auto_install: Boolean(options.yes),
          recommendations: recommendations.map((recommendation) => ({
            id: recommendation.entry.id,
            name: recommendation.entry.name,
            description: recommendation.entry.description,
            transport: recommendation.entry.transport,
            ux_score: recommendation.entry.ux_score ?? null,
            setup_complexity: recommendation.entry.setup_complexity ?? null,
            requires_keys: recommendation.entry.requires_keys ?? [],
            recommended_for: recommendation.entry.recommended_for ?? [],
            score: recommendation.score,
            reasons: recommendation.reasons
          })),
          installed: outcomes.map((outcome) => ({
            id: outcome.id,
            server: outcome.server,
            config_changed: outcome.configChanged,
            test_ok: outcome.testOk,
            test_messages: outcome.testMessages
          }))
        };

        if (Boolean(options.json)) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(line("section", "Guided MCP recommendations", style));
          console.log(kv("Goal", goal ?? "general productivity", style));
          if (recommendations.length === 0) {
            console.log(line("info", "No catalog entries are available.", style));
            return;
          }

          console.log(line("info", "Recommended entries:", style));
          for (const recommendation of recommendations) {
            const entry = recommendation.entry;
            const complexity = entry.setup_complexity ? `, setup: ${entry.setup_complexity}` : "";
            const uxScore = typeof entry.ux_score === "number" ? `, ux: ${entry.ux_score}` : "";
            console.log(bullet(`${entry.id} (${entry.transport}${uxScore}${complexity})`, style, "step"));
            console.log(`  ${line("info", entry.description, style)}`);
            if (recommendation.reasons.length > 0) {
              console.log(`  ${line("tip", `Why: ${recommendation.reasons.join(" ")}`, style)}`);
            }
            if ((entry.requires_keys ?? []).length > 0) {
              console.log(`  ${line("warn", `Requires keys: ${(entry.requires_keys ?? []).join(", ")}`, style)}`);
            }
          }

          if (!Boolean(options.yes)) {
            const installIds = recommendations.map((item) => item.entry.id).join(" ");
            console.log(line("next", "Install all suggested now: supercodex mcp install --profile recommended", style));
            console.log(line("next", `Install one directly: supercodex mcp install ${recommendations[0]?.entry.id}`, style));
            if (goal) {
              console.log(line("next", `Re-run with auto install: supercodex mcp guided --goal ${goal} --yes`, style));
            } else {
              console.log(line("next", "Re-run with auto install: supercodex mcp guided --yes", style));
            }
            if (installIds.length > 0) {
              console.log(line("tip", `Top picks: ${installIds}`, style));
            }
          } else {
            console.log(line("info", "Install/test results:", style));
            for (const outcome of outcomes) {
              console.log(bullet(`${outcome.id}: ${outcome.testOk ? "ok" : "failed"}`, style, outcome.testOk ? "ok" : "error"));
              for (const message of outcome.testMessages) {
                console.log(`  ${message}`);
              }
            }
          }
        }

        if (outcomes.some((outcome) => !outcome.testOk)) {
          process.exitCode = 1;
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  registerMcpDoctorCommand(mcp);
  registerMcpCatalogCommands(mcp);
}

async function installCatalogEntry(
  entry: CatalogEntry,
  options: { codexHome?: string; force: boolean; source: "manual" | "profile" | "guided"; goal?: string }
): Promise<CatalogInstallOutcome> {
  const installResult = await installMcpFromCatalog(entry, {
    codexHome: options.codexHome,
    force: options.force
  });
  const testResult = await testMcpServerByName(installResult.serverName, {
    codexHome: options.codexHome
  });
  const tested = testResult.result;
  const testOk = testResult.exists && Boolean(tested?.ok);
  const testMessages = tested?.messages ?? ["Server test did not return a result."];

  await tryRecordMetricEvent(testOk ? "mcp_install_success" : "mcp_install_failed", {
    codexHome: options.codexHome,
    payload: {
      catalog_id: entry.id,
      server_name: installResult.serverName,
      source: options.source,
      goal: options.goal ?? null,
      config_changed: installResult.configChanged,
      test_ok: testOk
    }
  });

  return {
    id: installResult.catalogId,
    server: installResult.serverName,
    backupDir: installResult.backup.backupDir,
    configChanged: installResult.configChanged,
    warnings: installResult.warnings.map((warning) => warning.message),
    testOk,
    testMessages
  };
}

function printInstallOutcomes(outcomes: CatalogInstallOutcome[], context: string, style: OutputStyle): void {
  if (outcomes.length === 0) {
    console.log(line("info", `No MCP installs performed for ${context}.`, style));
    return;
  }

  for (const outcome of outcomes) {
    console.log(line("section", `MCP install result (${context})`, style));
    console.log(kv("Backup", outcome.backupDir, style));
    console.log(
      line(
        outcome.configChanged ? "ok" : "info",
        outcome.configChanged
          ? `Installed MCP catalog entry "${outcome.id}" as server "${outcome.server}".`
          : `MCP catalog entry "${outcome.id}" is already current.`,
        style
      )
    );
    for (const warning of outcome.warnings) {
      console.warn(line("warn", warning, style));
    }
    console.log(line(outcome.testOk ? "ok" : "error", `Test: ${outcome.testOk ? "ok" : "failed"}`, style));
    for (const message of outcome.testMessages) {
      console.log(bullet(message, style, outcome.testOk ? "info" : "warn"));
    }
  }
}

function rankGuidedCatalogEntries(entries: CatalogEntry[], goal?: string): GuidedRecommendation[] {
  const goalTokens = tokenize(goal ?? "");

  const ranked = entries.map((entry) => {
    let score = typeof entry.ux_score === "number" ? entry.ux_score : 50;
    const reasons: string[] = [];
    if (typeof entry.ux_score === "number") {
      reasons.push(`High UX score (${entry.ux_score}).`);
    }
    if (entry.setup_complexity === "low") {
      score += 10;
      reasons.push("Low setup complexity.");
    } else if (entry.setup_complexity === "medium") {
      score += 4;
    } else if (entry.setup_complexity === "high") {
      score -= 6;
    }

    const requiresKeys = (entry.requires_keys ?? []).length;
    if (requiresKeys > 0) {
      score -= requiresKeys * 4;
    }

    if (goalTokens.length > 0) {
      const goalMatches = countGoalMatches(entry, goalTokens);
      score += goalMatches * 14;
      if (goalMatches > 0) {
        reasons.push("Matches requested goal.");
      }
    }

    if (reasons.length === 0) {
      reasons.push("General-purpose recommendation.");
    }

    return {
      entry,
      score,
      reasons
    };
  });

  return ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.entry.id.localeCompare(b.entry.id);
  });
}

function countGoalMatches(entry: CatalogEntry, goalTokens: string[]): number {
  const haystack = [
    entry.id,
    entry.name,
    entry.description,
    ...(entry.tags ?? []),
    ...(entry.recommended_for ?? [])
  ]
    .join(" ")
    .toLowerCase();

  let matches = 0;
  for (const token of goalTokens) {
    if (token.length >= 2 && haystack.includes(token)) {
      matches += 1;
    }
  }
  return matches;
}

function normalizeToken(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}
