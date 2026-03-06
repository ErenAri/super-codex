import type { TomlTable } from "../config";
import { isPlainObject } from "../fs-utils";
import { listMcpServersFromConfig, type McpServerDefinition } from "../mcp";

export type SafetyGateStatus = "pass" | "warn" | "fail";

export interface SafetyGateCheck {
  id: string;
  title: string;
  status: SafetyGateStatus;
  details: string[];
}

export interface SafetyGateEvaluationOptions {
  config: TomlTable;
  env?: NodeJS.ProcessEnv;
}

export function evaluateSafetyGates(options: SafetyGateEvaluationOptions): SafetyGateCheck[] {
  const env = options.env ?? process.env;
  return [
    evaluateApiKeyCheck(options.config, env),
    evaluateSandboxCheck(env),
    evaluateApprovalPolicyCheck(env),
    evaluateDeterministicLoggingCheck(options.config),
    evaluateReplayCheck(options.config)
  ];
}

function evaluateApiKeyCheck(config: TomlTable, env: NodeJS.ProcessEnv): SafetyGateCheck {
  const requiredKeys = new Set<string>(["OPENAI_API_KEY"]);
  const configuredServers = listMcpServersFromConfig(config);

  for (const server of configuredServers) {
    for (const key of inferRequiredEnvKeys(server.definition)) {
      requiredKeys.add(key);
    }
  }

  const missing: string[] = [];
  const present: string[] = [];
  for (const key of Array.from(requiredKeys).sort()) {
    if (typeof env[key] === "string" && env[key]!.trim().length > 0) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  if (missing.length === 0) {
    return {
      id: "api_keys",
      title: "API keys present",
      status: "pass",
      details: [`Resolved keys: ${present.join(", ")}`]
    };
  }

  return {
    id: "api_keys",
    title: "API keys present",
    status: "warn",
    details: [
      `Missing keys: ${missing.join(", ")}`,
      "Set required keys in environment before running network-dependent workflows."
    ]
  };
}

function evaluateSandboxCheck(env: NodeJS.ProcessEnv): SafetyGateCheck {
  const sandboxMode = readFirstEnv(env, ["CODEX_SANDBOX_MODE", "SANDBOX_MODE", "SUPERCODEX_SANDBOX_MODE"]);
  if (!sandboxMode) {
    return {
      id: "sandbox_mode",
      title: "Sandbox mode detected",
      status: "warn",
      details: ["Sandbox mode was not detected from environment variables."]
    };
  }

  const normalized = sandboxMode.toLowerCase();
  const warnsOn = ["danger-full-access", "disabled", "none"];
  const status: SafetyGateStatus = warnsOn.some((token) => normalized.includes(token)) ? "warn" : "pass";
  const details = [
    `Detected sandbox mode: ${sandboxMode}`,
    status === "warn"
      ? "Environment appears permissive; confirm write scope and guardrails."
      : "Sandbox restrictions appear active."
  ];

  return {
    id: "sandbox_mode",
    title: "Sandbox mode detected",
    status,
    details
  };
}

function evaluateApprovalPolicyCheck(env: NodeJS.ProcessEnv): SafetyGateCheck {
  const policy = readFirstEnv(env, ["CODEX_APPROVAL_POLICY", "APPROVAL_POLICY"]);
  if (!policy) {
    return {
      id: "write_approval",
      title: "Write approvals are gated",
      status: "warn",
      details: ["Approval policy was not detected from environment variables."]
    };
  }

  const normalized = policy.toLowerCase();
  if (normalized === "never") {
    return {
      id: "write_approval",
      title: "Write approvals are gated",
      status: "fail",
      details: [
        `Approval policy is "${policy}", which disables explicit approval gating.`,
        "Use an approval policy that requires confirmation for elevated writes."
      ]
    };
  }

  return {
    id: "write_approval",
    title: "Write approvals are gated",
    status: "pass",
    details: [`Detected approval policy: ${policy}`]
  };
}

function evaluateDeterministicLoggingCheck(config: TomlTable): SafetyGateCheck {
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : {};
  const metrics = isPlainObject(supercodex.metrics) ? (supercodex.metrics as TomlTable) : {};
  const enabled = metrics.enabled !== false;
  const metricsPath = typeof metrics.path === "string" ? metrics.path.trim() : "";

  if (!enabled || metricsPath.length === 0) {
    return {
      id: "deterministic_logging",
      title: "Deterministic logging configured",
      status: "warn",
      details: [
        "Metrics logging path is missing or disabled in [supercodex.metrics].",
        "Set [supercodex.metrics].enabled=true and a stable path for deterministic logs."
      ]
    };
  }

  return {
    id: "deterministic_logging",
    title: "Deterministic logging configured",
    status: "pass",
    details: [`Metrics path: ${metricsPath}`]
  };
}

function evaluateReplayCheck(config: TomlTable): SafetyGateCheck {
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : {};
  const memory = isPlainObject(supercodex.memory) ? (supercodex.memory as TomlTable) : {};
  const enabled = memory.enabled !== false;
  const memoryPath = typeof memory.path === "string" ? memory.path.trim() : "";

  if (!enabled || memoryPath.length === 0) {
    return {
      id: "replay",
      title: "Deterministic replay inputs configured",
      status: "warn",
      details: [
        "Session memory path is missing or disabled in [supercodex.memory].",
        "Enable memory path to support reproducible replay context."
      ]
    };
  }

  return {
    id: "replay",
    title: "Deterministic replay inputs configured",
    status: "pass",
    details: [`Session memory path: ${memoryPath}`]
  };
}

function inferRequiredEnvKeys(definition: McpServerDefinition): string[] {
  if (!isPlainObject(definition.env)) {
    return [];
  }

  const envTable = definition.env as Record<string, unknown>;
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(envTable)) {
    if (typeof value !== "string") {
      continue;
    }
    const raw = value.trim();
    if (!raw) {
      keys.add(key);
      continue;
    }

    const envRef = resolveEnvReference(raw);
    if (envRef) {
      keys.add(envRef);
    } else {
      keys.add(key);
    }
  }

  return Array.from(keys).sort();
}

function resolveEnvReference(value: string): string | null {
  if (value.startsWith("${") && value.endsWith("}")) {
    const name = value.slice(2, -1).trim();
    return name || null;
  }
  if (value.startsWith("$")) {
    const name = value.slice(1).trim();
    return name || null;
  }
  return null;
}

function readFirstEnv(env: NodeJS.ProcessEnv, keys: string[]): string | null {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
