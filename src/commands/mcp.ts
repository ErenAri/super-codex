import type { Command } from "commander";

import { loadConfig } from "../config";
import { pathExists } from "../fs-utils";
import {
  buildHttpServerDefinition,
  buildStdioServerDefinition,
  getMcpServerFromConfig,
  parseEnvAssignments,
  testMcpServer,
  validateMcpDefinition
} from "../mcp";
import {
  addMcpServer,
  installMcpFromCatalog,
  listConfiguredMcpServers,
  removeMcpServer,
  testMcpServerByName
} from "../operations";
import { getCodexPaths } from "../paths";
import {
  BUILTIN_MCP_PROFILES,
  getCatalogEntry,
  getMcpConnector,
  listCatalogEntries,
  listMcpCapabilities,
  listMcpConnectors,
  loadRegistry,
  type CatalogEntry,
  type McpTransport
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

interface ConnectorHealthEntry {
  connector_id: string;
  catalog_entry_id: string;
  server_name: string;
  transport: McpTransport;
  official: boolean;
  status: "healthy" | "degraded" | "missing";
  capabilities: string[];
  messages: string[];
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

  mcp
    .command("connectors")
    .description("List MCP connector contracts (official and user-extended)")
    .option("--official", "Only show official connectors")
    .option("--transport <transport>", "Filter connectors by transport (stdio|http)")
    .option("--health", "Include connector health diagnostics")
    .option("--connectivity", "Probe connectivity for health diagnostics")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const codexHome = options.codexHome as string | undefined;
        const registry = await loadRegistry({ codexHome });
        const transport = parseTransportFilter(options.transport as string | undefined);
        const connectors = listMcpConnectors(registry.registry, {
          officialOnly: Boolean(options.official),
          transport: transport ?? undefined
        });
        const includeHealth = Boolean(options.health);
        const connectorHealth = includeHealth
          ? await evaluateConnectorHealth(connectors, {
              codexHome,
              includeConnectivity: Boolean(options.connectivity)
            })
          : [];

        if (Boolean(options.json)) {
          const payload = {
            filters: {
              official: Boolean(options.official),
              transport: transport ?? null
            },
            connectors,
            health: includeHealth
              ? {
                  summary: summarizeConnectorHealth(connectorHealth),
                  entries: connectorHealth
                }
              : null
          };
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        if (connectors.length === 0) {
          console.log(line("info", "No MCP connectors match the current filters.", style));
          return;
        }

        console.log(line("section", "MCP connectors", style));
        for (const connector of connectors) {
          const marker = connector.official ? "official" : "custom";
          console.log(
            bullet(
              `${connector.id} (${marker}, ${connector.transport}) -> ${connector.catalog_entry_id}`,
              style,
              "info"
            )
          );
          console.log(`  ${line("info", connector.description, style)}`);
          console.log(`  ${line("tip", `Capabilities: ${connector.capabilities.join(", ")}`, style)}`);
          console.log(`  ${line("info", `Health checks: ${connector.health_checks.join(", ")}`, style)}`);
        }

        if (includeHealth) {
          const summary = summarizeConnectorHealth(connectorHealth);
          console.log(line("section", "Connector health", style));
          console.log(kv("Healthy", String(summary.healthy), style));
          console.log(kv("Degraded", String(summary.degraded), style));
          console.log(kv("Missing", String(summary.missing), style));
          for (const health of connectorHealth) {
            const kind = health.status === "healthy" ? "ok" : health.status === "missing" ? "warn" : "error";
            console.log(line(kind, `${health.connector_id}: ${health.status}`, style));
            for (const message of health.messages) {
              console.log(`  ${message}`);
            }
          }
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  mcp
    .command("capabilities")
    .description("Discover MCP capabilities across connectors and transports")
    .option("--official", "Only include official connectors")
    .option("--transport <transport>", "Filter by transport (stdio|http)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--plain", "Disable decorated output")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const style = resolveOutputStyle({
          json: Boolean(options.json),
          plain: Boolean(options.plain)
        });
        const transport = parseTransportFilter(options.transport as string | undefined);
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const capabilities = listMcpCapabilities(registry.registry, {
          officialOnly: Boolean(options.official),
          transport: transport ?? undefined
        });

        if (Boolean(options.json)) {
          const payload = {
            filters: {
              official: Boolean(options.official),
              transport: transport ?? null
            },
            capabilities
          };
          console.log(JSON.stringify(payload, null, 2));
          return;
        }

        if (capabilities.length === 0) {
          console.log(line("info", "No MCP capabilities found for current filters.", style));
          return;
        }

        console.log(line("section", "MCP capability discovery", style));
        for (const capability of capabilities) {
          console.log(bullet(capability.capability, style, "info"));
          for (const connector of capability.connectors) {
            const official = connector.official ? "official" : "custom";
            console.log(
              `  ${connector.connector_id} -> ${connector.catalog_entry_id} (${connector.transport}, ${official})`
            );
          }
        }
      }, {
        json: Boolean(options.json),
        plain: Boolean(options.plain)
      })
    );

  mcp
    .command("connector")
    .description("Show one MCP connector contract by id")
    .argument("<id>", "Connector id")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((id, options) =>
      runCommand(async () => {
        const registry = await loadRegistry({ codexHome: options.codexHome as string | undefined });
        const connector = getMcpConnector(registry.registry, id as string);
        if (!connector) {
          throw new Error(`MCP connector "${id}" not found.`);
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(connector, null, 2));
          return;
        }

        console.log(`${connector.id} (${connector.transport})`);
        console.log(connector.description);
        console.log(`Catalog entry: ${connector.catalog_entry_id}`);
        console.log(`Capabilities: ${connector.capabilities.join(", ")}`);
        console.log(`Health checks: ${connector.health_checks.join(", ")}`);
      }, {
        json: Boolean(options.json)
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

function parseTransportFilter(value: string | undefined): McpTransport | null {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return null;
  }
  if (normalized === "stdio" || normalized === "http") {
    return normalized;
  }
  throw new Error(`Unsupported transport "${value}". Expected "stdio" or "http".`);
}

async function evaluateConnectorHealth(
  connectors: ReturnType<typeof listMcpConnectors>,
  options: { codexHome?: string; includeConnectivity: boolean }
): Promise<ConnectorHealthEntry[]> {
  const paths = getCodexPaths(options.codexHome);
  const config = (await pathExists(paths.configPath)) ? await loadConfig(paths.configPath) : {};
  const health: ConnectorHealthEntry[] = [];

  for (const connector of connectors) {
    const server = getMcpServerFromConfig(config, connector.catalog_entry_name);
    if (!server) {
      health.push({
        connector_id: connector.id,
        catalog_entry_id: connector.catalog_entry_id,
        server_name: connector.catalog_entry_name,
        transport: connector.transport,
        official: connector.official,
        status: "missing",
        capabilities: connector.capabilities,
        messages: [
          `Expected server "${connector.catalog_entry_name}" is not configured.`,
          `Install with: supercodex mcp install ${connector.catalog_entry_id}`
        ]
      });
      continue;
    }

    const messages: string[] = [];
    const validationMessages = validateMcpDefinition(server.definition);
    messages.push(...validationMessages);

    if (validationMessages.length > 0) {
      health.push({
        connector_id: connector.id,
        catalog_entry_id: connector.catalog_entry_id,
        server_name: connector.catalog_entry_name,
        transport: connector.transport,
        official: connector.official,
        status: "degraded",
        capabilities: connector.capabilities,
        messages: [
          ...messages,
          `Fix definition at [mcp_servers.${connector.catalog_entry_name}] and re-run connector health.`
        ]
      });
      continue;
    }

    if (!options.includeConnectivity) {
      health.push({
        connector_id: connector.id,
        catalog_entry_id: connector.catalog_entry_id,
        server_name: connector.catalog_entry_name,
        transport: connector.transport,
        official: connector.official,
        status: "degraded",
        capabilities: connector.capabilities,
        messages: ["Connectivity probe skipped. Re-run with --connectivity."]
      });
      continue;
    }

    const connectivity = await testMcpServer(server.name, server.definition);
    const status: ConnectorHealthEntry["status"] = connectivity.ok ? "healthy" : "degraded";
    health.push({
      connector_id: connector.id,
      catalog_entry_id: connector.catalog_entry_id,
      server_name: connector.catalog_entry_name,
      transport: connector.transport,
      official: connector.official,
      status,
      capabilities: connector.capabilities,
      messages: connectivity.messages
    });
  }

  return health.sort((a, b) => a.connector_id.localeCompare(b.connector_id));
}

function summarizeConnectorHealth(entries: ConnectorHealthEntry[]): {
  healthy: number;
  degraded: number;
  missing: number;
} {
  let healthy = 0;
  let degraded = 0;
  let missing = 0;
  for (const entry of entries) {
    if (entry.status === "healthy") {
      healthy += 1;
    } else if (entry.status === "degraded") {
      degraded += 1;
    } else {
      missing += 1;
    }
  }

  return {
    healthy,
    degraded,
    missing
  };
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
