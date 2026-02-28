import type { AliasDefinition, AliasPackDefinition, RegistryData } from "./types";

const PACK_CORE_PLANNING = "core-planning";
const PACK_QUALITY_REVIEW = "quality-review";
const PACK_DEBUG_INVESTIGATION = "debug-investigation";
const PACK_REFACTOR_DELIVERY = "refactor-delivery";

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
  "shell"
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
  }
};

export const BUILTIN_ALIASES: Record<string, AliasDefinition> = {
  research: alias({
    name: "research",
    description: "Deep research workflow",
    target: "run.plan",
    pack: PACK_CORE_PLANNING,
    tags: ["research", "discovery"],
    riskLevel: "medium",
    mode: "deep",
    persona: "architect"
  }),
  brainstorming: alias({
    name: "brainstorming",
    description: "Idea generation workflow",
    target: "run.plan",
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
    description: "Safety-oriented review workflow",
    target: "run.review",
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
    target: "run.refactor",
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
    target: "run.plan",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["architecture", "design"],
    riskLevel: "medium",
    persona: "architect"
  }),
  doc: alias({
    name: "doc",
    description: "Documentation-oriented planning",
    target: "run.plan",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["docs", "handoff"],
    riskLevel: "low",
    persona: "educator"
  }),
  ship: alias({
    name: "ship",
    description: "Shipping-oriented refactor workflow",
    target: "run.refactor",
    pack: PACK_REFACTOR_DELIVERY,
    tags: ["ship", "delivery"],
    riskLevel: "medium",
    mode: "fast",
    persona: "shipper"
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
