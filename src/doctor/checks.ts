import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { listMcpServersFromConfig, testMcpServer, validateMcpDefinition } from "../mcp";
import { getCodexPaths } from "../paths";
import { listBundledPrompts, listInstalledPrompts } from "../prompts";
import {
  BUILTIN_DEFAULT_MODE,
  BUILTIN_DEFAULT_PERSONA,
  loadRegistry,
  validateRegistry
} from "../registry";
import { getRuntimeDefaults } from "../runtime";
import type { DoctorIssue, DoctorReport, McpHealthReport, McpHealthServer } from "./types";

export interface DoctorOptions {
  codexHome?: string;
  projectRoot?: string;
  mcpConnectivity?: boolean;
}

export interface DoctorContext {
  config: TomlTable;
  configPath: string;
  promptPackDir: string;
}

export interface DoctorRunResult {
  report: DoctorReport;
  context: DoctorContext;
}

interface McpChecksResult {
  issues: DoctorIssue[];
  health: McpHealthServer[];
}

export async function runDoctorChecks(options: DoctorOptions = {}): Promise<DoctorRunResult> {
  const codexPaths = getCodexPaths(options.codexHome);
  const configExists = await pathExists(codexPaths.configPath);
  const config = configExists ? await loadConfig(codexPaths.configPath) : {};
  const issues: DoctorIssue[] = [];
  const registry = await loadRegistry({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot
  });

  if (!configExists) {
    issues.push(issue("config.missing", "warn", `Missing config at ${codexPaths.configPath}.`, true));
  }

  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  if (!supercodex) {
    issues.push(issue("supercodex.missing", "warn", "Missing [supercodex] section.", true));
  }

  const installedPrompts = await listInstalledPrompts(codexPaths.promptPackDir);
  const bundledPrompts = listBundledPrompts();
  for (const promptName of bundledPrompts) {
    if (!installedPrompts.includes(promptName)) {
      issues.push(
        issue(
          `prompts.${promptName}.missing`,
          "warn",
          `Missing prompt file "${promptName}" in ${codexPaths.promptPackDir}.`,
          true
        )
      );
    }
  }

  const runtimeDefaults = getRuntimeDefaults(config);
  if (runtimeDefaults.defaultMode && !registry.registry.modes[runtimeDefaults.defaultMode]) {
    issues.push(
      issue(
        "runtime.default_mode.invalid",
        "warn",
        `default_mode "${runtimeDefaults.defaultMode}" not found in registry (fallback: ${BUILTIN_DEFAULT_MODE}).`,
        true,
        "supercodex.runtime.default_mode"
      )
    );
  }
  if (runtimeDefaults.defaultPersona && !registry.registry.personas[runtimeDefaults.defaultPersona]) {
    issues.push(
      issue(
        "runtime.default_persona.invalid",
        "warn",
        `default_persona "${runtimeDefaults.defaultPersona}" not found in registry (fallback: ${BUILTIN_DEFAULT_PERSONA}).`,
        true,
        "supercodex.runtime.default_persona"
      )
    );
  }

  if (registry.issues.length > 0) {
    for (const registryIssue of registry.issues) {
      issues.push(
        issue(
          `registry.overlay.${registryIssue.path}`,
          registryIssue.level === "error" ? "error" : "warn",
          registryIssue.message,
          false,
          registryIssue.path
        )
      );
    }
  }

  const staticRegistryIssues = validateRegistry(registry.registry);
  for (const registryIssue of staticRegistryIssues) {
    issues.push(
      issue(
        `registry.invalid.${registryIssue.path}`,
        registryIssue.level === "error" ? "error" : "warn",
        registryIssue.message,
        false,
        registryIssue.path
      )
    );
  }

  const frameworkFiles = ["PRINCIPLES.md", "RULES.md", "FLAGS.md"];
  for (const frameworkFile of frameworkFiles) {
    const frameworkPath = `${codexPaths.frameworkDir}/${frameworkFile}`;
    if (!(await pathExists(frameworkPath))) {
      issues.push(
        issue(
          `framework.${frameworkFile}.missing`,
          "warn",
          `Missing framework file "${frameworkFile}" in ${codexPaths.frameworkDir}.`,
          true
        )
      );
    }
  }

  const mcpChecks = await runMcpChecks(config, Boolean(options.mcpConnectivity));
  issues.push(...mcpChecks.issues);

  return {
    report: {
      ok: !issues.some((entry) => entry.level === "error"),
      issues,
      mcp_health: buildMcpHealthReport(mcpChecks.health)
    },
    context: {
      config,
      configPath: codexPaths.configPath,
      promptPackDir: codexPaths.promptPackDir
    }
  };
}

export async function runMcpDoctorChecks(
  config: TomlTable,
  includeConnectivity: boolean
): Promise<DoctorReport> {
  const mcpChecks = await runMcpChecks(config, includeConnectivity);
  return {
    ok: !mcpChecks.issues.some((entry) => entry.level === "error"),
    issues: mcpChecks.issues,
    mcp_health: buildMcpHealthReport(mcpChecks.health)
  };
}

async function runMcpChecks(config: TomlTable, includeConnectivity: boolean): Promise<McpChecksResult> {
  const issues: DoctorIssue[] = [];
  const health: McpHealthServer[] = [];
  const mcpServers = listMcpServersFromConfig(config);

  for (const server of mcpServers) {
    const validationMessages = validateMcpDefinition(server.definition);
    const transport =
      server.definition.transport === "stdio" || server.definition.transport === "http"
        ? server.definition.transport
        : "unknown";

    let healthScore = 100;
    const testMessages: string[] = [];
    let failureReasonCode: string | undefined;
    const suggestedFixSteps: string[] = [];

    for (const message of validationMessages) {
      issues.push(issue(`mcp.${server.name}.invalid`, "error", message, false, `mcp_servers.${server.name}`));
      testMessages.push(message);
      failureReasonCode = "invalid_definition";
      healthScore = Math.min(healthScore, 30);
    }

    if (validationMessages.length > 0) {
      suggestedFixSteps.push(
        "Fix MCP transport/command/url fields in config.toml.",
        `Re-run: supercodex mcp test ${server.name}`
      );
    } else if (includeConnectivity) {
      const testResult = await testMcpServer(server.name, server.definition);
      testMessages.push(...testResult.messages);

      if (!testResult.ok) {
        issues.push(
          issue(
            `mcp.${server.name}.connectivity`,
            "warn",
            `${server.name}: ${testResult.messages.join(" ")}`,
            false,
            `mcp_servers.${server.name}`
          )
        );
        healthScore = Math.min(healthScore, 60);
        failureReasonCode = mapConnectivityFailureReason(testResult.messages, transport);
        suggestedFixSteps.push(...buildSuggestedFixSteps(failureReasonCode, server.name, transport));
      }
    } else {
      testMessages.push("Connectivity check skipped. Re-run with --connectivity.");
      healthScore = Math.min(healthScore, 85);
      failureReasonCode = "connectivity_not_checked";
      suggestedFixSteps.push(`Run: supercodex mcp doctor --connectivity`);
    }

    const status = deriveMcpStatus(healthScore, failureReasonCode);
    if (status === "healthy" && suggestedFixSteps.length === 0) {
      suggestedFixSteps.push("No action required.");
    }
    if (testMessages.length === 0) {
      testMessages.push("No MCP validation messages.");
    }

    health.push({
      name: server.name,
      transport,
      path: `mcp_servers.${server.name}`,
      health_score: clampScore(healthScore),
      status,
      ...(failureReasonCode ? { failure_reason_code: failureReasonCode } : {}),
      suggested_fix_steps: dedupeStrings(suggestedFixSteps),
      test_messages: dedupeStrings(testMessages)
    });
  }

  return {
    issues,
    health
  };
}

function buildMcpHealthReport(servers: McpHealthServer[]): McpHealthReport {
  let healthy = 0;
  let degraded = 0;
  let failing = 0;

  for (const server of servers) {
    if (server.status === "healthy") {
      healthy += 1;
    } else if (server.status === "degraded") {
      degraded += 1;
    } else {
      failing += 1;
    }
  }

  return {
    summary: {
      healthy,
      degraded,
      failing
    },
    servers
  };
}

function mapConnectivityFailureReason(
  messages: string[],
  transport: "stdio" | "http" | "unknown"
): string {
  const normalized = messages.join(" ").toLowerCase();
  if (normalized.includes("not found in path")) {
    return "command_not_found";
  }
  if (normalized.includes("timed out") || normalized.includes("abort")) {
    return "connection_timeout";
  }
  if (normalized.includes("http endpoint responded with status")) {
    return "http_status_unexpected";
  }
  if (transport === "http" && normalized.includes("http request failed")) {
    return "http_request_failed";
  }
  if (transport === "stdio" && normalized.includes("failed to execute")) {
    return "command_exec_failed";
  }
  return "connectivity_failed";
}

function buildSuggestedFixSteps(
  reasonCode: string,
  serverName: string,
  transport: "stdio" | "http" | "unknown"
): string[] {
  if (reasonCode === "command_not_found") {
    return [
      `Install the MCP command for "${serverName}" or add it to PATH.`,
      `Check [mcp_servers.${serverName}].command in config.toml.`,
      `Re-run: supercodex mcp test ${serverName}`
    ];
  }

  if (
    reasonCode === "http_status_unexpected" ||
    reasonCode === "http_request_failed" ||
    reasonCode === "connection_timeout"
  ) {
    return [
      `Verify ${transport === "http" ? "HTTP endpoint" : "server endpoint"} reachability for "${serverName}".`,
      `Check auth/env vars configured for "${serverName}".`,
      `Re-run: supercodex mcp test ${serverName}`
    ];
  }

  if (reasonCode === "command_exec_failed") {
    return [
      `Inspect command + args for "${serverName}" in config.toml.`,
      "Check shell execution permissions.",
      `Re-run: supercodex mcp test ${serverName}`
    ];
  }

  return [
    `Inspect MCP definition at [mcp_servers.${serverName}] for invalid values.`,
    `Re-run: supercodex mcp test ${serverName}`
  ];
}

function deriveMcpStatus(
  score: number,
  failureReasonCode: string | undefined
): "healthy" | "degraded" | "failing" {
  if (failureReasonCode === "invalid_definition") {
    return "failing";
  }
  if (score >= 80 && !failureReasonCode) {
    return "healthy";
  }
  if (score >= 55) {
    return "degraded";
  }
  return "failing";
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function issue(
  id: string,
  level: DoctorIssue["level"],
  message: string,
  fixable: boolean,
  path?: string
): DoctorIssue {
  return {
    id,
    level,
    message,
    fixable,
    path
  };
}
