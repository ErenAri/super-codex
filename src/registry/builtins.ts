import type {
  AgentDefinition,
  CatalogEntry,
  CommandDefinition,
  FlagDefinition,
  ModeDefinition,
  PersonaDefinition,
  SkillDefinition
} from "./types";

export const BUILTIN_MODES: Record<string, ModeDefinition> = {
  balanced: {
    name: "balanced",
    description: "General-purpose mode for normal coding tasks.",
    prompt_overlay: "supercodex/plan.md",
    reasoning_budget: "medium",
    content_file: "balanced.md"
  },
  deep: {
    name: "deep",
    description: "High-rigor mode for architecture and risky changes.",
    prompt_overlay: "supercodex/review.md",
    reasoning_budget: "high",
    temperature: 0.2,
    content_file: "deep.md"
  },
  fast: {
    name: "fast",
    description: "Delivery-focused mode for straightforward tasks.",
    prompt_overlay: "supercodex/refactor.md",
    reasoning_budget: "low",
    temperature: 0.4,
    content_file: "fast.md"
  },
  safe: {
    name: "safe",
    description: "Conservative mode emphasizing tests and rollback paths.",
    prompt_overlay: "supercodex/review.md",
    reasoning_budget: "high",
    temperature: 0.1,
    content_file: "safe.md"
  },
  brainstorming: {
    name: "brainstorming",
    description: "Divergent thinking mode for idea generation and exploration.",
    reasoning_budget: "high",
    content_file: "brainstorming.md"
  },
  "deep-research": {
    name: "deep-research",
    description: "Multi-source research mode with evidence management.",
    reasoning_budget: "high",
    temperature: 0.2,
    content_file: "deep-research.md"
  },
  "task-management": {
    name: "task-management",
    description: "Structured task decomposition and tracking mode.",
    reasoning_budget: "medium",
    content_file: "task-management.md"
  },
  orchestration: {
    name: "orchestration",
    description: "Multi-tool coordination mode for complex operations.",
    reasoning_budget: "medium",
    content_file: "orchestration.md"
  },
  "token-efficiency": {
    name: "token-efficiency",
    description: "Optimized for 30-50% token reduction while maintaining quality.",
    reasoning_budget: "low",
    content_file: "token-efficiency.md"
  },
  "business-panel": {
    name: "business-panel",
    description: "Multi-expert business analysis panel mode.",
    reasoning_budget: "high",
    content_file: "business-panel.md"
  },
  introspection: {
    name: "introspection",
    description: "Self-analysis mode with transparent reasoning and bias detection.",
    reasoning_budget: "high",
    content_file: "introspection.md"
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
  // Core commands
  install: command("install", "Install prompt pack and managed config"),
  uninstall: command("uninstall", "Remove SuperCodex-managed config and prompts"),
  list: command("list", "List bundled and installed prompts"),
  status: command("status", "Show install/runtime status"),
  init: command("init", "Create project-level .codex template"),
  validate: command("validate", "Validate config and registries"),
  doctor: command("doctor", "Run diagnostics and optional fixes"),

  // Catalog commands
  "catalog.list": command("catalog.list", "List MCP catalog entries"),
  "catalog.search": command("catalog.search", "Search MCP catalog entries"),
  "catalog.show": command("catalog.show", "Show MCP catalog entry"),
  "catalog.sync": command("catalog.sync", "Sync local catalog metadata"),

  // Alias commands
  "aliases.list": command("aliases.list", "List slash alias mappings"),
  "aliases.show": command("aliases.show", "Show slash alias mapping"),
  "aliases.packs": command("aliases.packs", "List alias packs"),
  "aliases.search": command("aliases.search", "Search alias mappings"),

  // Mode commands
  "mode.list": command("mode.list", "List available modes"),
  "mode.show": command("mode.show", "Show mode details"),
  "mode.set": command("mode.set", "Set default mode"),
  "mode.unset": command("mode.unset", "Unset default mode"),

  // Persona commands
  "persona.list": command("persona.list", "List available personas"),
  "persona.show": command("persona.show", "Show persona details"),
  "persona.set": command("persona.set", "Set default persona"),
  "persona.unset": command("persona.unset", "Unset default persona"),

  // MCP commands
  "mcp.add": command("mcp.add", "Add MCP server"),
  "mcp.list": command("mcp.list", "List configured MCP servers"),
  "mcp.install": command("mcp.install", "Install MCP server from catalog"),
  "mcp.remove": command("mcp.remove", "Remove configured MCP server"),
  "mcp.test": command("mcp.test", "Test MCP server definition"),
  "mcp.doctor": command("mcp.doctor", "Run MCP-specific diagnostics"),
  "mcp.catalog.list": command("mcp.catalog.list", "List MCP catalog entries"),
  "mcp.catalog.search": command("mcp.catalog.search", "Search MCP catalog entries"),
  "mcp.catalog.show": command("mcp.catalog.show", "Show MCP catalog entry"),

  // Base workflow commands
  "run.plan": command("run.plan", "Resolve context for planning workflow"),
  "run.review": command("run.review", "Resolve context for review workflow"),
  "run.refactor": command("run.refactor", "Resolve context for refactor workflow"),
  "run.debug": command("run.debug", "Resolve context for debugging workflow"),

  // Extended command workflows (30 commands ported from SuperClaude)
  "run.analyze": command("run.analyze", "Analyze code or architecture"),
  "run.brainstorm": command("run.brainstorm", "Brainstorm ideas and options"),
  "run.build": command("run.build", "Build a feature from requirements"),
  "run.business-panel": command("run.business-panel", "Multi-expert business analysis panel"),
  "run.cleanup": command("run.cleanup", "Code cleanup and debt reduction"),
  "run.design": command("run.design", "System or feature design"),
  "run.document": command("run.document", "Documentation generation"),
  "run.estimate": command("run.estimate", "Effort estimation with ranges"),
  "run.explain": command("run.explain", "Code explanation and walkthrough"),
  "run.git": command("run.git", "Git operations workflow"),
  "run.help": command("run.help", "Framework help and guidance"),
  "run.implement": command("run.implement", "Implementation from spec"),
  "run.improve": command("run.improve", "Code improvement and optimization"),
  "run.index": command("run.index", "File and project indexing"),
  "run.index-repo": command("run.index-repo", "Repository-level indexing"),
  "run.load": command("run.load", "Context loading and orientation"),
  "run.pm": command("run.pm", "Project management workflow"),
  "run.recommend": command("run.recommend", "Recommendation generation"),
  "run.reflect": command("run.reflect", "Self-reflection and retrospective"),
  "run.research": command("run.research", "Deep research workflow"),
  "run.save": command("run.save", "Session and context saving"),
  "run.sc": command("run.sc", "SuperCodex meta help"),
  "run.select-tool": command("run.select-tool", "Tool selection guidance"),
  "run.spawn": command("run.spawn", "Sub-task decomposition and spawning"),
  "run.spec-panel": command("run.spec-panel", "Multi-expert spec review panel"),
  "run.task": command("run.task", "Task management and breakdown"),
  "run.test": command("run.test", "Test generation and execution"),
  "run.troubleshoot": command("run.troubleshoot", "Problem troubleshooting"),
  "run.workflow": command("run.workflow", "Workflow management and optimization"),

  // Shell commands
  "shell.install": command("shell.install", "Install SuperCodex shell bridge"),
  "shell.remove": command("shell.remove", "Remove SuperCodex shell bridge"),
  "shell.status": command("shell.status", "Inspect SuperCodex shell bridge"),
  "shell.script": command("shell.script", "Print SuperCodex shell bridge script")
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

export const BUILTIN_AGENT_DEFINITIONS: Record<string, AgentDefinition> = {
  pm: {
    name: "pm",
    description: "Project management agent with PDCA cycle and session lifecycle.",
    triggers: ["project planning", "task tracking", "sprint management"],
    primary_persona: "architect",
    primary_mode: "balanced",
    content_file: "pm.md",
    capabilities: ["task decomposition", "priority management", "progress tracking"]
  },
  "deep-research": {
    name: "deep-research",
    description: "Multi-hop reasoning and evidence management research agent.",
    triggers: ["research", "investigation", "literature review"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "deep-research.md",
    capabilities: ["evidence gathering", "source evaluation", "synthesis"]
  },
  "system-architect": {
    name: "system-architect",
    description: "Holistic system design and scalability analysis agent.",
    triggers: ["architecture", "system design", "scalability"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "system-architect.md",
    capabilities: ["system design", "scalability analysis", "component decomposition"]
  },
  "security-engineer": {
    name: "security-engineer",
    description: "Threat modeling and vulnerability assessment agent.",
    triggers: ["security review", "threat model", "vulnerability scan"],
    primary_persona: "reviewer",
    primary_mode: "safe",
    content_file: "security-engineer.md",
    capabilities: ["threat modeling", "vulnerability assessment", "security audit"]
  },
  "frontend-architect": {
    name: "frontend-architect",
    description: "UI/UX and component architecture design agent.",
    triggers: ["frontend design", "UI architecture", "component system"],
    primary_persona: "architect",
    primary_mode: "balanced",
    content_file: "frontend-architect.md",
    capabilities: ["component architecture", "state management", "accessibility"]
  },
  "backend-architect": {
    name: "backend-architect",
    description: "API design and data modeling agent.",
    triggers: ["API design", "backend architecture", "data modeling"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "backend-architect.md",
    capabilities: ["API design", "data modeling", "service architecture"]
  },
  "performance-engineer": {
    name: "performance-engineer",
    description: "Profiling and optimization specialist agent.",
    triggers: ["performance", "profiling", "optimization"],
    primary_persona: "reviewer",
    primary_mode: "deep",
    content_file: "performance-engineer.md",
    capabilities: ["profiling", "bottleneck analysis", "optimization"]
  },
  "devops-engineer": {
    name: "devops-engineer",
    description: "CI/CD pipeline and infrastructure agent.",
    triggers: ["CI/CD", "deployment", "infrastructure"],
    primary_persona: "shipper",
    primary_mode: "balanced",
    content_file: "devops-engineer.md",
    capabilities: ["pipeline design", "infrastructure provisioning", "monitoring"]
  },
  "data-engineer": {
    name: "data-engineer",
    description: "Data pipeline and schema design agent.",
    triggers: ["data pipeline", "ETL", "schema design"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "data-engineer.md",
    capabilities: ["pipeline design", "schema modeling", "data quality"]
  },
  "qa-engineer": {
    name: "qa-engineer",
    description: "Test strategy and coverage analysis agent.",
    triggers: ["test strategy", "QA", "coverage analysis"],
    primary_persona: "reviewer",
    primary_mode: "safe",
    content_file: "qa-engineer.md",
    capabilities: ["test strategy", "coverage analysis", "regression detection"]
  },
  "tech-writer": {
    name: "tech-writer",
    description: "Documentation and API docs specialist agent.",
    triggers: ["documentation", "API docs", "guides"],
    primary_persona: "educator",
    primary_mode: "balanced",
    content_file: "tech-writer.md",
    capabilities: ["documentation", "API reference", "tutorials"]
  },
  "incident-responder": {
    name: "incident-responder",
    description: "On-call incident response and postmortem agent.",
    triggers: ["incident", "outage", "postmortem"],
    primary_persona: "debugger",
    primary_mode: "fast",
    content_file: "incident-responder.md",
    capabilities: ["incident triage", "root cause analysis", "postmortem writing"]
  },
  "ml-engineer": {
    name: "ml-engineer",
    description: "Model development and evaluation agent.",
    triggers: ["machine learning", "model training", "ML pipeline"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "ml-engineer.md",
    capabilities: ["model development", "evaluation", "feature engineering"]
  },
  "mobile-architect": {
    name: "mobile-architect",
    description: "iOS/Android and cross-platform architecture agent.",
    triggers: ["mobile app", "iOS", "Android", "cross-platform"],
    primary_persona: "architect",
    primary_mode: "balanced",
    content_file: "mobile-architect.md",
    capabilities: ["mobile architecture", "platform APIs", "offline support"]
  },
  "database-architect": {
    name: "database-architect",
    description: "Schema design and query optimization agent.",
    triggers: ["database", "schema", "query optimization"],
    primary_persona: "architect",
    primary_mode: "deep",
    content_file: "database-architect.md",
    capabilities: ["schema design", "query optimization", "migration planning"]
  },
  "accessibility-engineer": {
    name: "accessibility-engineer",
    description: "Accessibility compliance and WCAG assessment agent.",
    triggers: ["accessibility", "a11y", "WCAG"],
    primary_persona: "reviewer",
    primary_mode: "safe",
    content_file: "accessibility-engineer.md",
    capabilities: ["WCAG compliance", "screen reader testing", "keyboard navigation"]
  }
};

export const BUILTIN_SKILLS: Record<string, SkillDefinition> = {
  "confidence-check": {
    id: "confidence-check",
    name: "Confidence Check",
    description: "Pre-implementation confidence assessment (>=90% required).",
    version: "1.0.0",
    content_file: "confidence-check/SKILL.md",
    triggers: ["before implementation", "before refactor"],
    required_confidence: 90,
    enabled: true
  }
};

export const BUILTIN_FLAGS: Record<string, FlagDefinition> = {
  brainstorm: {
    name: "brainstorm",
    flag: "--brainstorm",
    category: "mode",
    description: "Activate brainstorming mode",
    activates_mode: "brainstorming"
  },
  think: {
    name: "think",
    flag: "--think",
    category: "depth",
    description: "Enable extended reasoning",
    reasoning_budget: "high"
  },
  ultrathink: {
    name: "ultrathink",
    flag: "--ultrathink",
    category: "depth",
    description: "Enable maximum reasoning depth",
    reasoning_budget: "maximum",
    conflicts_with: ["think"]
  },
  c7: {
    name: "c7",
    flag: "--c7",
    category: "mcp",
    description: "Enable Context7 MCP server",
    activates_mcp: ["context7"]
  },
  seq: {
    name: "seq",
    flag: "--seq",
    category: "mcp",
    description: "Enable Sequential MCP server",
    activates_mcp: ["sequential"]
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
