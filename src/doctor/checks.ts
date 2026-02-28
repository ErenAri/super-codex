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
import type { DoctorIssue, DoctorReport } from "./types";

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

  const mcpIssues = await runMcpChecks(config, Boolean(options.mcpConnectivity));
  issues.push(...mcpIssues);

  return {
    report: {
      ok: !issues.some((entry) => entry.level === "error"),
      issues
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
  const issues = await runMcpChecks(config, includeConnectivity);
  return {
    ok: !issues.some((entry) => entry.level === "error"),
    issues
  };
}

async function runMcpChecks(config: TomlTable, includeConnectivity: boolean): Promise<DoctorIssue[]> {
  const issues: DoctorIssue[] = [];
  const mcpServers = listMcpServersFromConfig(config);

  for (const server of mcpServers) {
    const validationMessages = validateMcpDefinition(server.definition);
    for (const message of validationMessages) {
      issues.push(issue(`mcp.${server.name}.invalid`, "error", message, false, `mcp_servers.${server.name}`));
    }
  }

  if (includeConnectivity) {
    for (const server of mcpServers) {
      const testResult = await testMcpServer(server.name, server.definition);
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
      }
    }
  }

  return issues;
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
