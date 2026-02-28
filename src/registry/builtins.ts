import type { CatalogEntry, CommandDefinition, ModeDefinition, PersonaDefinition } from "./types";

export const BUILTIN_MODES: Record<string, ModeDefinition> = {
  balanced: {
    name: "balanced",
    description: "General-purpose mode for normal coding tasks.",
    prompt_overlay: "supercodex/plan.md",
    reasoning_budget: "medium"
  },
  deep: {
    name: "deep",
    description: "High-rigor mode for architecture and risky changes.",
    prompt_overlay: "supercodex/review.md",
    reasoning_budget: "high",
    temperature: 0.2
  },
  fast: {
    name: "fast",
    description: "Delivery-focused mode for straightforward tasks.",
    prompt_overlay: "supercodex/refactor.md",
    reasoning_budget: "low",
    temperature: 0.4
  },
  safe: {
    name: "safe",
    description: "Conservative mode emphasizing tests and rollback paths.",
    prompt_overlay: "supercodex/review.md",
    reasoning_budget: "high",
    temperature: 0.1
  }
};

export const BUILTIN_PERSONAS: Record<string, PersonaDefinition> = {
  architect: {
    name: "architect",
    description: "System design and interface-first thinking.",
    policy_tags: ["design", "tradeoffs", "interfaces"]
  },
  reviewer: {
    name: "reviewer",
    description: "Code quality and risk-focused reviewer.",
    policy_tags: ["correctness", "security", "regression"]
  },
  refactorer: {
    name: "refactorer",
    description: "Incremental refactoring specialist with test-first bias.",
    policy_tags: ["refactor", "test-first"]
  },
  debugger: {
    name: "debugger",
    description: "Hypothesis-driven debugging investigator.",
    policy_tags: ["debug", "instrumentation", "repro"]
  },
  shipper: {
    name: "shipper",
    description: "Pragmatic execution persona focused on delivery.",
    policy_tags: ["delivery", "focus", "simplicity"]
  },
  educator: {
    name: "educator",
    description: "Mentoring persona for rationale and explainability.",
    policy_tags: ["teaching", "clarity"]
  }
};

export const BUILTIN_COMMANDS: Record<string, CommandDefinition> = {
  install: command("install", "Install prompt pack and managed config"),
  uninstall: command("uninstall", "Remove SuperCodex-managed config and prompts"),
  list: command("list", "List bundled and installed prompts"),
  status: command("status", "Show install/runtime status"),
  init: command("init", "Create project-level .codex template"),
  validate: command("validate", "Validate config and registries"),
  doctor: command("doctor", "Run diagnostics and optional fixes"),
  "catalog.list": command("catalog.list", "List MCP catalog entries"),
  "catalog.search": command("catalog.search", "Search MCP catalog entries"),
  "catalog.show": command("catalog.show", "Show MCP catalog entry"),
  "catalog.sync": command("catalog.sync", "Sync local catalog metadata"),
  "aliases.list": command("aliases.list", "List slash alias mappings"),
  "aliases.show": command("aliases.show", "Show slash alias mapping"),
  "aliases.packs": command("aliases.packs", "List alias packs"),
  "aliases.search": command("aliases.search", "Search alias mappings"),
  "mode.list": command("mode.list", "List available modes"),
  "mode.show": command("mode.show", "Show mode details"),
  "mode.set": command("mode.set", "Set default mode"),
  "mode.unset": command("mode.unset", "Unset default mode"),
  "persona.list": command("persona.list", "List available personas"),
  "persona.show": command("persona.show", "Show persona details"),
  "persona.set": command("persona.set", "Set default persona"),
  "persona.unset": command("persona.unset", "Unset default persona"),
  "mcp.add": command("mcp.add", "Add MCP server"),
  "mcp.list": command("mcp.list", "List configured MCP servers"),
  "mcp.install": command("mcp.install", "Install MCP server from catalog"),
  "mcp.remove": command("mcp.remove", "Remove configured MCP server"),
  "mcp.test": command("mcp.test", "Test MCP server definition"),
  "mcp.doctor": command("mcp.doctor", "Run MCP-specific diagnostics"),
  "mcp.catalog.list": command("mcp.catalog.list", "List MCP catalog entries"),
  "mcp.catalog.search": command("mcp.catalog.search", "Search MCP catalog entries"),
  "mcp.catalog.show": command("mcp.catalog.show", "Show MCP catalog entry"),
  "run.plan": command("run.plan", "Resolve context for planning workflow"),
  "run.review": command("run.review", "Resolve context for review workflow"),
  "run.refactor": command("run.refactor", "Resolve context for refactor workflow"),
  "run.debug": command("run.debug", "Resolve context for debugging workflow")
};

export const BUILTIN_CATALOG: Record<string, CatalogEntry> = {
  filesystem: {
    id: "filesystem",
    name: "filesystem",
    description: "Model Context Protocol filesystem server",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    tags: ["files", "local"]
  },
  fetch: {
    id: "fetch",
    name: "fetch",
    description: "MCP fetch server for HTTP resources",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    tags: ["http", "docs"]
  },
  github: {
    id: "github",
    name: "github",
    description: "GitHub MCP server bridge",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    tags: ["git", "github", "prs"]
  },
  postgres: {
    id: "postgres",
    name: "postgres",
    description: "PostgreSQL MCP server",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    tags: ["db", "postgres"]
  },
  sqlite: {
    id: "sqlite",
    name: "sqlite",
    description: "SQLite MCP server",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite"],
    tags: ["db", "sqlite"]
  },
  slack: {
    id: "slack",
    name: "slack",
    description: "Slack MCP server",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    tags: ["chat", "slack"]
  },
  notion: {
    id: "notion",
    name: "notion",
    description: "Notion MCP server",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-notion"],
    tags: ["docs", "notion"]
  },
  "local-http": {
    id: "local-http",
    name: "local-http",
    description: "Example local HTTP MCP endpoint",
    transport: "http",
    url: "http://localhost:3333/mcp",
    tags: ["http", "local"]
  }
};

export const BUILTIN_DEFAULT_MODE = "balanced";
export const BUILTIN_DEFAULT_PERSONA = "architect";
export const BUILTIN_CATALOG_VERSION = "2026.02.28";

function command(id: string, description: string): CommandDefinition {
  return {
    id,
    description,
    enabled: true,
    mode_compatible: ["balanced", "deep", "fast", "safe"],
    persona_compatible: ["architect", "reviewer", "refactorer", "debugger", "shipper", "educator"]
  };
}
