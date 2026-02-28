import { spawn } from "node:child_process";

import type { TomlTable } from "./config";
import { isPlainObject } from "./fs-utils";
import type { CatalogEntry } from "./registry";

export type McpServerDefinition = Record<string, unknown>;

export interface McpConfiguredServer {
  name: string;
  definition: McpServerDefinition;
}

export interface McpTestResult {
  name: string;
  ok: boolean;
  transport: "stdio" | "http" | "unknown";
  messages: string[];
}

export function parseEnvAssignments(values: string[]): Record<string, string> {
  const env: Record<string, string> = {};

  for (const value of values) {
    const separatorIndex = value.indexOf("=");
    if (separatorIndex <= 0) {
      throw new Error(`Invalid --env value "${value}". Expected KEY=VALUE.`);
    }

    const key = value.slice(0, separatorIndex).trim();
    const envValue = value.slice(separatorIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment variable name "${key}".`);
    }

    env[key] = envValue;
  }

  return env;
}

export function buildStdioServerDefinition(
  commandParts: string[],
  env: Record<string, string> = {}
): McpServerDefinition {
  if (commandParts.length === 0) {
    throw new Error("STDIO transport requires <command...>.");
  }

  const [command, ...args] = commandParts;
  const definition: McpServerDefinition = {
    transport: "stdio",
    command
  };

  if (args.length > 0) {
    definition.args = args;
  }

  if (Object.keys(env).length > 0) {
    definition.env = env;
  }

  return definition;
}

export function buildHttpServerDefinition(url: string, env: Record<string, string> = {}): McpServerDefinition {
  if (!url.trim()) {
    throw new Error("HTTP transport requires a non-empty URL.");
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    throw new Error(`Invalid MCP HTTP URL "${url}".`);
  }

  const definition: McpServerDefinition = {
    transport: "http",
    url: normalizedUrl
  };

  if (Object.keys(env).length > 0) {
    definition.env = env;
  }

  return definition;
}

export function buildServerDefinitionFromCatalog(entry: CatalogEntry): McpServerDefinition {
  if (entry.transport === "stdio") {
    return buildStdioServerDefinition([entry.command ?? "", ...(entry.args ?? [])], entry.env ?? {});
  }

  return buildHttpServerDefinition(entry.url ?? "", entry.env ?? {});
}

export function listMcpServersFromConfig(config: TomlTable): McpConfiguredServer[] {
  if (!isPlainObject(config.mcp_servers)) {
    return [];
  }

  const servers = config.mcp_servers as TomlTable;
  return Object.keys(servers)
    .sort()
    .map((name) => ({
      name,
      definition: isPlainObject(servers[name]) ? (servers[name] as McpServerDefinition) : {}
    }));
}

export function getMcpServerFromConfig(config: TomlTable, name: string): McpConfiguredServer | null {
  if (!isPlainObject(config.mcp_servers)) {
    return null;
  }

  const servers = config.mcp_servers as TomlTable;
  if (!isPlainObject(servers[name])) {
    return null;
  }

  return {
    name,
    definition: servers[name] as McpServerDefinition
  };
}

export function validateMcpDefinition(definition: McpServerDefinition): string[] {
  const messages: string[] = [];
  const transport = readTransport(definition);

  if (!transport) {
    messages.push("Missing transport (expected \"stdio\" or \"http\").");
    return messages;
  }

  if (transport === "stdio") {
    if (typeof definition.command !== "string" || !definition.command.trim()) {
      messages.push("STDIO server is missing command.");
    }

    if (definition.args && !Array.isArray(definition.args)) {
      messages.push("STDIO args must be an array of strings.");
    }
  }

  if (transport === "http") {
    const rawUrl = typeof definition.url === "string" ? definition.url : "";
    if (!rawUrl.trim()) {
      messages.push("HTTP server is missing url.");
    } else {
      try {
        // eslint-disable-next-line no-new
        new URL(rawUrl);
      } catch {
        messages.push(`Invalid HTTP MCP URL "${rawUrl}".`);
      }
    }
  }

  return messages;
}

export async function testMcpServer(name: string, definition: McpServerDefinition): Promise<McpTestResult> {
  const validationMessages = validateMcpDefinition(definition);
  const transport = readTransport(definition) ?? "unknown";
  if (validationMessages.length > 0) {
    return {
      name,
      ok: false,
      transport,
      messages: validationMessages
    };
  }

  if (transport === "stdio") {
    const command = String(definition.command);
    const available = await isCommandAvailable(command);
    return {
      name,
      ok: available.ok,
      transport,
      messages: available.ok ? [`Command "${command}" is available.`] : [available.message]
    };
  }

  if (transport === "http") {
    const url = String(definition.url);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal
        });
        return {
          name,
          ok: response.ok || response.status === 405,
          transport,
          messages:
            response.ok || response.status === 405
              ? [`HTTP endpoint responded with status ${response.status}.`]
              : [`HTTP endpoint responded with status ${response.status}.`]
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      return {
        name,
        ok: false,
        transport,
        messages: [`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  return {
    name,
    ok: false,
    transport,
    messages: ['Unsupported transport. Expected "stdio" or "http".']
  };
}

function readTransport(definition: McpServerDefinition): "stdio" | "http" | null {
  const transport = definition.transport;
  if (transport === "stdio" || transport === "http") {
    return transport;
  }

  return null;
}

async function isCommandAvailable(command: string): Promise<{ ok: boolean; message: string }> {
  const lookupTool = process.platform === "win32" ? "where" : "which";
  return new Promise((resolve) => {
    const child = spawn(lookupTool, [command], { stdio: "ignore" });
    child.once("error", (error) => {
      resolve({
        ok: false,
        message: `Failed to execute ${lookupTool}: ${error.message}`
      });
    });
    child.once("close", (code) => {
      if (code === 0) {
        resolve({
          ok: true,
          message: `Command "${command}" is available.`
        });
      } else {
        resolve({
          ok: false,
          message: `Command "${command}" was not found in PATH.`
        });
      }
    });
  });
}
