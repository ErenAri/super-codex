import {
  BUILTIN_AGENT_DEFINITIONS,
  BUILTIN_CATALOG,
  BUILTIN_COMMANDS,
  BUILTIN_MODES,
  BUILTIN_PERSONAS
} from "./registry";

export interface KernelCommandPrimitive {
  command_id: string;
  args_schema: Record<string, unknown>;
  permissions: string[];
  tools: string[];
  output_contract: {
    supports_json: boolean;
    deterministic_fields: string[];
  };
}

export interface KernelAgentPrimitive {
  agent_id: string;
  role: string;
  allowed_tools: string[];
  prompt_template: string;
  guardrails: string[];
}

export interface KernelModePolicyPrimitive {
  mode_id: string;
  verbosity: "low" | "medium" | "high";
  risk_tolerance: "low" | "medium" | "high";
  allowed_actions: string[];
}

export interface KernelSessionStatePrimitive {
  workspace_config_path: string;
  memory_path: string;
  transcript_format: "jsonl";
  reproducibility_contract: string[];
}

export interface KernelToolCapabilityPrimitive {
  tool_id: string;
  transport: string;
  capabilities: string[];
}

export interface FrameworkKernelSnapshot {
  version: string;
  generated_at: string;
  command_registry: KernelCommandPrimitive[];
  agent_registry: KernelAgentPrimitive[];
  mode_engine: KernelModePolicyPrimitive[];
  session_state: KernelSessionStatePrimitive;
  tool_layer: KernelToolCapabilityPrimitive[];
}

const WRITE_COMMAND_PREFIXES = [
  "install",
  "uninstall",
  "init",
  "mode.set",
  "mode.unset",
  "persona.set",
  "persona.unset",
  "mcp.add",
  "mcp.install",
  "mcp.remove",
  "lock.refresh",
  "session.save",
  "shell.install",
  "shell.remove",
  "skill.enable",
  "skill.disable"
];

export function buildFrameworkKernelSnapshot(now: Date = new Date()): FrameworkKernelSnapshot {
  return {
    version: "v2-kernel-0.1",
    generated_at: now.toISOString(),
    command_registry: Object.values(BUILTIN_COMMANDS)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((command) => ({
        command_id: command.id,
        args_schema: {
          type: "array",
          items: { type: "string" }
        },
        permissions: resolveCommandPermissions(command.id),
        tools: resolveCommandTools(command.id),
        output_contract: {
          supports_json: !["install", "uninstall", "list", "init"].includes(command.id),
          deterministic_fields: ["status", "checks", "errors", "warnings", "score"]
        }
      })),
    agent_registry: Object.values(BUILTIN_AGENT_DEFINITIONS)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((agent) => ({
        agent_id: agent.name,
        role: agent.description,
        allowed_tools: resolveAgentTools(agent.name),
        prompt_template: agent.content_file ? `content/agents/${agent.content_file}` : "",
        guardrails: [
          "No destructive writes without explicit user intent.",
          "Prefer deterministic, testable outputs.",
          "Escalate uncertainty before high-risk actions."
        ]
      })),
    mode_engine: Object.values(BUILTIN_MODES)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((mode) => ({
        mode_id: mode.name,
        verbosity: resolveModeVerbosity(mode.name),
        risk_tolerance: resolveModeRisk(mode.name),
        allowed_actions: resolveModeActions(mode.name)
      })),
    session_state: {
      workspace_config_path: "~/.codex/config.toml",
      memory_path: "~/.codex/supercodex/memory/sessions.jsonl",
      transcript_format: "jsonl",
      reproducibility_contract: [
        "Lock file pinned for deterministic command registry hashes.",
        "Session memory stores decisions and next steps.",
        "Verification check emits stable pass/warn/fail statuses."
      ]
    },
    tool_layer: Object.values(BUILTIN_CATALOG)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => ({
        tool_id: entry.id,
        transport: entry.transport,
        capabilities: entry.recommended_for ?? entry.tags ?? []
      }))
  };
}

function resolveCommandPermissions(commandId: string): string[] {
  const writePermission = WRITE_COMMAND_PREFIXES.some(
    (prefix) => commandId === prefix || commandId.startsWith(`${prefix}.`)
  );
  const permissions = new Set<string>(["registry.read", "config.read"]);
  if (writePermission) {
    permissions.add("config.write");
    permissions.add("prompts.write");
  }
  if (commandId.startsWith("mcp.") || commandId.startsWith("catalog.")) {
    permissions.add("network.access");
  }
  return Array.from(permissions).sort();
}

function resolveCommandTools(commandId: string): string[] {
  const tools = new Set<string>(["filesystem"]);
  if (commandId.startsWith("mcp.") || commandId.startsWith("catalog.")) {
    tools.add("mcp");
    tools.add("network");
  }
  if (commandId.startsWith("run.research") || commandId.startsWith("run.select-tool")) {
    tools.add("web");
  }
  if (commandId.startsWith("session.")) {
    tools.add("memory");
  }
  return Array.from(tools).sort();
}

function resolveAgentTools(agentId: string): string[] {
  const tools = new Set<string>(["filesystem", "registry"]);
  if (agentId.includes("security") || agentId.includes("devops") || agentId.includes("incident")) {
    tools.add("shell");
  }
  if (agentId.includes("research") || agentId === "pm") {
    tools.add("web");
  }
  if (agentId.includes("data") || agentId.includes("database")) {
    tools.add("mcp");
  }
  return Array.from(tools).sort();
}

function resolveModeVerbosity(mode: string): "low" | "medium" | "high" {
  if (mode === "fast" || mode === "token-efficiency") {
    return "low";
  }
  if (mode === "deep" || mode === "deep-research" || mode === "business-panel" || mode === "introspection") {
    return "high";
  }
  return "medium";
}

function resolveModeRisk(mode: string): "low" | "medium" | "high" {
  if (mode === "safe") {
    return "low";
  }
  if (mode === "fast") {
    return "high";
  }
  return "medium";
}

function resolveModeActions(mode: string): string[] {
  if (mode === "safe") {
    return ["read", "analyze", "test", "review"];
  }
  if (mode === "fast") {
    return ["read", "write", "execute"];
  }
  if (mode === "deep-research") {
    return ["read", "analyze", "web-research", "synthesize"];
  }
  return ["read", "analyze", "write"];
}

export function listKernelPersonaNames(): string[] {
  return Object.keys(BUILTIN_PERSONAS).sort();
}
