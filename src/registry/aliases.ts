import type { AliasDefinition, AliasPackDefinition, RegistryData } from "./types";

const PACK_CORE_PLANNING = "core-planning";
const PACK_QUALITY_REVIEW = "quality-review";
const PACK_DEBUG_INVESTIGATION = "debug-investigation";
const PACK_REFACTOR_DELIVERY = "refactor-delivery";
const PACK_COMMAND_WORKFLOWS = "command-workflows";

export const RESERVED_TOP_LEVEL_COMMAND_NAMES = new Set<string>([
  "install",
  "uninstall",
  "list",
  "status",
  "init",
  "validate",
  "doctor",
  "catalog",
  "aliases",
  "mode",
  "persona",
  "mcp",
  "run",
  "shell",
  "agent",
  "skill",
  "flag"
]);

export const BUILTIN_ALIAS_PACKS: Record<string, AliasPackDefinition> = {
  [PACK_CORE_PLANNING]: {
    name: PACK_CORE_PLANNING,
    description: "Research and planning workflows for discovery and specification.",
    default_enabled: true,
    aliases: ["brainstorming", "investigate", "plan", "research", "spec", "synthesize"]
  },
  [PACK_QUALITY_REVIEW]: {
    name: PACK_QUALITY_REVIEW,
    description: "Quality and risk-scanning workflows for review stages.",
    default_enabled: true,
    aliases: ["audit", "checklist", "perf", "review", "security", "test"]
  },
  [PACK_DEBUG_INVESTIGATION]: {
    name: PACK_DEBUG_INVESTIGATION,
    description: "Debugging workflows from reproduction to root-cause.",
    default_enabled: true,
    aliases: ["debug", "fixplan", "repro", "rootcause", "trace", "triage"]
  },
  [PACK_REFACTOR_DELIVERY]: {
    name: PACK_REFACTOR_DELIVERY,
    description: "Refactor and delivery workflows for implementation and shipping.",
    default_enabled: true,
    aliases: ["architect", "doc", "migrate", "refactor", "ship", "simplify"]
  },
  [PACK_COMMAND_WORKFLOWS]: {
    name: PACK_COMMAND_WORKFLOWS,
    description: "Extended command workflows ported from SuperClaude framework.",
    default_enabled: true,
    aliases: [
      "analyze", "build", "business-panel", "cleanup", "design",
      "document", "estimate", "explain", "git", "help",
      "implement", "improve", "index", "index-repo", "load",
      "pm", "recommend", "reflect", "save", "sc",
      "select-tool", "spawn", "spec-panel", "task",
      "troubleshoot", "workflow"
    ]
  }
};

export const BUILTIN_ALIASES: Record<string, AliasDefinition> = {
  // --- core-planning pack ---
  research: alias({
    name: "research",
    description: "Deep research workflow",
    target: "run.research",
    pack: PACK_CORE_PLANNING,
    tags: ["research", "discovery"],
    riskLevel: "medium",
    mode: "deep",
    persona: "architect"
  }),
  brainstorming: alias({
    name: "brainstorming",
    description: "Idea generation workflow",
    target: "run.brainstorm",
    pack: PACK_CORE_PLANNING,
    tags: ["ideation", "options"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),
  plan: alias({
    name: "plan",
    description: "Planning workflow",
    target: "run.plan",
    pack: PACK_CORE_PLANNING,
    tags: ["planning"],
    riskLevel: "low"
  }),
  spec: alias({
    name: "spec",
    description: "Specification-oriented planning workflow",
    target: "run.plan",
    pack: PACK_CORE_PLANNING,
    tags: ["requirements", "specification"],
    riskLevel: "medium",
    mode: "deep",
    persona: "architect"
  }),
  investigate: alias({
    name: "investigate",
    description: "Investigation-first planning workflow",
    target: "run.plan",
    pack: PACK_CORE_PLANNING,
    tags: ["analysis", "evidence"],
    riskLevel: "medium",
    mode: "deep",
    persona: "reviewer"
  }),
  synthesize: alias({
    name: "synthesize",
    description: "Synthesis workflow for findings and options",
    target: "run.plan",
    pack: PACK_CORE_PLANNING,
    tags: ["summary", "decision"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),

  // --- quality-review pack ---
  review: alias({
    name: "review",
    description: "Code review workflow",
    target: "run.review",
    pack: PACK_QUALITY_REVIEW,
    tags: ["review", "quality"],
    riskLevel: "medium"
  }),
  audit: alias({
    name: "audit",
    description: "Safety-first audit workflow",
    target: "run.review",
    pack: PACK_QUALITY_REVIEW,
    tags: ["audit", "risk"],
    riskLevel: "high",
    mode: "safe",
    persona: "reviewer"
  }),
  security: alias({
    name: "security",
    description: "Security-focused review workflow",
    target: "run.review",
    pack: PACK_QUALITY_REVIEW,
    tags: ["security", "threat-model"],
    riskLevel: "high",
    mode: "safe",
    persona: "reviewer"
  }),
  perf: alias({
    name: "perf",
    description: "Performance-focused review workflow",
    target: "run.review",
    pack: PACK_QUALITY_REVIEW,
    tags: ["performance", "profiling"],
    riskLevel: "medium",
    mode: "deep",
    persona: "reviewer"
  }),
  test: alias({
    name: "test",
    description: "Test generation and review workflow",
    target: "run.test",
    pack: PACK_QUALITY_REVIEW,
    tags: ["tests", "regression"],
    riskLevel: "medium",
    mode: "safe"
  }),
  checklist: alias({
    name: "checklist",
    description: "Checklist-driven review workflow",
    target: "run.review",
    pack: PACK_QUALITY_REVIEW,
    tags: ["checklist", "release"],
    riskLevel: "low",
    mode: "safe",
    persona: "reviewer"
  }),

  // --- debug-investigation pack ---
  debug: alias({
    name: "debug",
    description: "Debug workflow",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["debug"],
    riskLevel: "medium"
  }),
  trace: alias({
    name: "trace",
    description: "Tracing-focused debugging workflow",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["trace", "instrumentation"],
    riskLevel: "medium",
    mode: "deep",
    persona: "debugger"
  }),
  repro: alias({
    name: "repro",
    description: "Reproduction-first debugging workflow",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["repro", "stability"],
    riskLevel: "high",
    mode: "safe",
    persona: "debugger"
  }),
  rootcause: alias({
    name: "rootcause",
    description: "Root-cause analysis debugging workflow",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["root-cause", "analysis"],
    riskLevel: "high",
    mode: "deep",
    persona: "debugger"
  }),
  triage: alias({
    name: "triage",
    description: "Issue triage debugging workflow",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["triage", "prioritization"],
    riskLevel: "medium",
    mode: "balanced",
    persona: "debugger"
  }),
  fixplan: alias({
    name: "fixplan",
    description: "Fix planning workflow after debugging",
    target: "run.debug",
    pack: PACK_DEBUG_INVESTIGATION,
    tags: ["fix", "mitigation"],
    riskLevel: "high",
    mode: "safe",
    persona: "architect"
  }),

  // --- refactor-delivery pack ---
  refactor: alias({
    name: "refactor",
    description: "Refactor workflow",
    target: "run.refactor",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["refactor"],
    riskLevel: "medium"
  }),
  simplify: alias({
    name: "simplify",
    description: "Simplification-focused refactor workflow",
    target: "run.cleanup",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["simplify", "maintainability"],
    riskLevel: "low",
    mode: "balanced",
    persona: "refactorer"
  }),
  migrate: alias({
    name: "migrate",
    description: "Migration-focused refactor workflow",
    target: "run.refactor",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["migration", "compatibility"],
    riskLevel: "high",
    mode: "safe",
    persona: "architect"
  }),
  architect: alias({
    name: "architect",
    description: "Architecture-focused planning",
    target: "run.design",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["architecture", "design"],
    riskLevel: "medium",
    persona: "architect"
  }),
  doc: alias({
    name: "doc",
    description: "Documentation-oriented planning",
    target: "run.document",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["docs", "handoff"],
    riskLevel: "low",
    persona: "educator"
  }),
  ship: alias({
    name: "ship",
    description: "Shipping-oriented delivery workflow",
    target: "run.build",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["ship", "delivery"],
    riskLevel: "medium",
    mode: "fast",
    persona: "shipper"
  }),

  // --- command-workflows pack (new commands) ---
  analyze: alias({
    name: "analyze",
    description: "Code and architecture analysis",
    target: "run.analyze",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["analysis", "architecture"],
    riskLevel: "low",
    mode: "deep",
    persona: "architect"
  }),
  build: alias({
    name: "build",
    description: "Feature implementation from requirements",
    target: "run.build",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["build", "implement"],
    riskLevel: "medium",
    mode: "fast",
    persona: "shipper"
  }),
  "business-panel": alias({
    name: "business-panel",
    description: "Multi-expert business analysis panel",
    target: "run.business-panel",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["business", "panel"],
    riskLevel: "low",
    mode: "deep",
    persona: "architect"
  }),
  cleanup: alias({
    name: "cleanup",
    description: "Code cleanup and debt reduction",
    target: "run.cleanup",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["cleanup", "debt"],
    riskLevel: "low",
    mode: "balanced",
    persona: "refactorer"
  }),
  design: alias({
    name: "design",
    description: "System or feature design",
    target: "run.design",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["design", "architecture"],
    riskLevel: "medium",
    mode: "deep",
    persona: "architect"
  }),
  document: alias({
    name: "document",
    description: "Documentation generation",
    target: "run.document",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["docs", "writing"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),
  estimate: alias({
    name: "estimate",
    description: "Effort estimation with ranges",
    target: "run.estimate",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["estimate", "planning"],
    riskLevel: "low",
    mode: "deep",
    persona: "architect"
  }),
  explain: alias({
    name: "explain",
    description: "Code explanation and walkthrough",
    target: "run.explain",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["explain", "teaching"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),
  git: alias({
    name: "git",
    description: "Git operations workflow",
    target: "run.git",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["git", "vcs"],
    riskLevel: "medium",
    mode: "fast",
    persona: "shipper"
  }),
  help: alias({
    name: "help",
    description: "Framework help and guidance",
    target: "run.help",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["help", "docs"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),
  implement: alias({
    name: "implement",
    description: "Implementation from spec",
    target: "run.implement",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["implement", "code"],
    riskLevel: "medium",
    mode: "balanced",
    persona: "shipper"
  }),
  improve: alias({
    name: "improve",
    description: "Code improvement and optimization",
    target: "run.improve",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["improve", "optimize"],
    riskLevel: "medium",
    mode: "balanced",
    persona: "refactorer"
  }),
  index: alias({
    name: "index",
    description: "File and project indexing",
    target: "run.index",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["index", "map"],
    riskLevel: "low",
    mode: "deep",
    persona: "architect"
  }),
  "index-repo": alias({
    name: "index-repo",
    description: "Repository-level indexing",
    target: "run.index-repo",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["index", "repo"],
    riskLevel: "low",
    mode: "deep",
    persona: "architect"
  }),
  load: alias({
    name: "load",
    description: "Context loading and orientation",
    target: "run.load",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["context", "load"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  pm: alias({
    name: "pm",
    description: "Project management workflow",
    target: "run.pm",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["pm", "project"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  recommend: alias({
    name: "recommend",
    description: "Recommendation generation",
    target: "run.recommend",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["recommend", "advice"],
    riskLevel: "low",
    mode: "deep",
    persona: "reviewer"
  }),
  reflect: alias({
    name: "reflect",
    description: "Self-reflection and retrospective",
    target: "run.reflect",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["reflect", "retro"],
    riskLevel: "low",
    mode: "deep",
    persona: "reviewer"
  }),
  save: alias({
    name: "save",
    description: "Session and context saving",
    target: "run.save",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["save", "context"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  sc: alias({
    name: "sc",
    description: "SuperCodex meta help",
    target: "run.sc",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["help", "meta"],
    riskLevel: "low",
    mode: "balanced",
    persona: "educator"
  }),
  "select-tool": alias({
    name: "select-tool",
    description: "Tool selection guidance",
    target: "run.select-tool",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["tools", "mcp"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  spawn: alias({
    name: "spawn",
    description: "Sub-task decomposition and spawning",
    target: "run.spawn",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["spawn", "subtask"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  "spec-panel": alias({
    name: "spec-panel",
    description: "Multi-expert spec review panel",
    target: "run.spec-panel",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["spec", "panel"],
    riskLevel: "low",
    mode: "deep",
    persona: "reviewer"
  }),
  task: alias({
    name: "task",
    description: "Task management and breakdown",
    target: "run.task",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["task", "planning"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  }),
  troubleshoot: alias({
    name: "troubleshoot",
    description: "Problem troubleshooting",
    target: "run.troubleshoot",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["troubleshoot", "debug"],
    riskLevel: "medium",
    mode: "deep",
    persona: "debugger"
  }),
  workflow: alias({
    name: "workflow",
    description: "Workflow management and optimization",
    target: "run.workflow",
    pack: PACK_COMMAND_WORKFLOWS,
    tags: ["workflow", "process"],
    riskLevel: "low",
    mode: "balanced",
    persona: "architect"
  })
};

export interface NormalizedAliasToken {
  name: string;
  explicitPrefix: boolean;
}

export interface AliasListOptions {
  pack?: string;
}

export function normalizeAliasToken(token: string): NormalizedAliasToken | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/sc:")) {
    const name = trimmed.slice(4).trim().toLowerCase();
    return name ? { name, explicitPrefix: true } : null;
  }

  if (trimmed.startsWith("sc:")) {
    const name = trimmed.slice(3).trim().toLowerCase();
    return name ? { name, explicitPrefix: true } : null;
  }

  return {
    name: trimmed.toLowerCase(),
    explicitPrefix: false
  };
}

export function listAliases(
  registry: Pick<RegistryData, "aliases">,
  options: AliasListOptions = {}
): AliasDefinition[] {
  return Object.values(registry.aliases)
    .filter((entry) => !options.pack || entry.pack === options.pack)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchAliases(
  registry: Pick<RegistryData, "aliases">,
  query: string,
  options: AliasListOptions = {}
): AliasDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return listAliases(registry, options);
  }

  return listAliases(registry, options).filter((entry) => {
    const haystack = [
      entry.name,
      entry.description,
      entry.target,
      entry.pack ?? "",
      ...(entry.tags ?? [])
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function listAliasPacks(registry: Pick<RegistryData, "alias_packs">): AliasPackDefinition[] {
  return Object.values(registry.alias_packs).sort((a, b) => a.name.localeCompare(b.name));
}

export function isReservedTopLevelCommandName(name: string): boolean {
  return RESERVED_TOP_LEVEL_COMMAND_NAMES.has(name.toLowerCase());
}

interface AliasFactoryOptions {
  name: string;
  description: string;
  target: string;
  pack: string;
  tags: string[];
  riskLevel: "low" | "medium" | "high";
  mode?: string;
  persona?: string;
}

function alias(options: AliasFactoryOptions): AliasDefinition {
  return {
    name: options.name,
    description: options.description,
    target: options.target,
    pack: options.pack,
    tags: [...options.tags],
    risk_level: options.riskLevel,
    stability: "stable",
    forward_args: true,
    output: "normal",
    ...(options.mode ? { default_mode: options.mode } : {}),
    ...(options.persona ? { default_persona: options.persona } : {})
  };
}
