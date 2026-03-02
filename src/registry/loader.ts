import path from "node:path";

import { loadConfig } from "../config";
import { deepClone, deepEqual, isPlainObject, pathExists } from "../fs-utils";
import { getCodexPaths } from "../paths";
import {
  BUILTIN_ALIASES,
  BUILTIN_ALIAS_PACKS,
  isReservedTopLevelCommandName,
  normalizeAliasToken
} from "./aliases";
import {
  BUILTIN_AGENT_DEFINITIONS,
  BUILTIN_CATALOG,
  BUILTIN_COMMANDS,
  BUILTIN_FLAGS,
  BUILTIN_MODES,
  BUILTIN_PERSONAS,
  BUILTIN_SKILLS
} from "./builtins";
import type {
  AgentDefinition,
  AliasDefinition,
  AliasPackDefinition,
  CatalogEntry,
  CommandDefinition,
  FlagDefinition,
  ModeDefinition,
  PersonaDefinition,
  RegistryData,
  RegistryOverlayFile,
  RegistryValidationIssue,
  SkillDefinition
} from "./types";

export interface RegistryLoadOptions {
  codexHome?: string;
  projectRoot?: string;
}

export interface RegistryLoadResult {
  registry: RegistryData;
  issues: RegistryValidationIssue[];
  userOverlayPath: string;
  projectOverlayPath: string;
}

export async function loadRegistry(options: RegistryLoadOptions = {}): Promise<RegistryLoadResult> {
  const codexPaths = getCodexPaths(options.codexHome);
  const projectRoot = options.projectRoot ?? process.cwd();
  const userOverlayPath = path.join(codexPaths.home, "supercodex", "registry.toml");
  const projectOverlayPath = path.join(projectRoot, ".codex", "supercodex", "registry.toml");

  const registry: RegistryData = {
    modes: deepClone(BUILTIN_MODES),
    personas: deepClone(BUILTIN_PERSONAS),
    commands: deepClone(BUILTIN_COMMANDS),
    catalog: deepClone(BUILTIN_CATALOG),
    aliases: deepClone(BUILTIN_ALIASES),
    alias_packs: deepClone(BUILTIN_ALIAS_PACKS),
    agent_definitions: deepClone(BUILTIN_AGENT_DEFINITIONS),
    skills: deepClone(BUILTIN_SKILLS),
    flags: deepClone(BUILTIN_FLAGS)
  };
  const issues: RegistryValidationIssue[] = [];

  if (await pathExists(userOverlayPath)) {
    const overlay = await readOverlayFile(userOverlayPath, issues);
    if (overlay) {
      applyOverlay(registry, overlay, userOverlayPath, issues);
    }
  }

  if (await pathExists(projectOverlayPath)) {
    const overlay = await readOverlayFile(projectOverlayPath, issues);
    if (overlay) {
      applyOverlay(registry, overlay, projectOverlayPath, issues);
    }
  }

  return {
    registry,
    issues,
    userOverlayPath,
    projectOverlayPath
  };
}

export function validateRegistry(registry: RegistryData): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = [];

  for (const [name, mode] of Object.entries(registry.modes)) {
    if (!mode.description || !mode.description.trim()) {
      issues.push({
        level: "error",
        path: `modes.${name}`,
        message: "Mode description is required."
      });
    }
  }

  for (const [name, persona] of Object.entries(registry.personas)) {
    if (!persona.description || !persona.description.trim()) {
      issues.push({
        level: "error",
        path: `personas.${name}`,
        message: "Persona description is required."
      });
    }
  }

  for (const [id, command] of Object.entries(registry.commands)) {
    if (!command.description || !command.description.trim()) {
      issues.push({
        level: "error",
        path: `commands.${id}`,
        message: "Command description is required."
      });
    }
  }

  for (const [id, entry] of Object.entries(registry.catalog)) {
    if (entry.transport !== "stdio" && entry.transport !== "http") {
      issues.push({
        level: "error",
        path: `catalog.${id}.transport`,
        message: `Unsupported transport "${String(entry.transport)}".`
      });
      continue;
    }

    if (entry.transport === "stdio" && (!entry.command || !entry.command.trim())) {
      issues.push({
        level: "error",
        path: `catalog.${id}.command`,
        message: "STDIO catalog entry requires command."
      });
    }

    if (entry.transport === "http") {
      if (!entry.url || !entry.url.trim()) {
        issues.push({
          level: "error",
          path: `catalog.${id}.url`,
          message: "HTTP catalog entry requires url."
        });
      } else {
        try {
          // Validate URL shape
          // eslint-disable-next-line no-new
          new URL(entry.url);
        } catch {
          issues.push({
            level: "error",
            path: `catalog.${id}.url`,
            message: `Invalid URL "${entry.url}".`
          });
        }
      }
    }
  }

  for (const [aliasName, aliasDefinition] of Object.entries(registry.aliases)) {
    if (!aliasDefinition.description || !aliasDefinition.description.trim()) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}`,
        message: "Alias description is required."
      });
    }

    if (!aliasDefinition.target || !aliasDefinition.target.trim()) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}.target`,
        message: "Alias target is required."
      });
    } else if (!isValidCommandId(aliasDefinition.target)) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}.target`,
        message: `Alias target "${aliasDefinition.target}" has invalid format.`
      });
    } else if (!Object.hasOwn(registry.commands, aliasDefinition.target)) {
      issues.push({
        level: "warn",
        path: `aliases.${aliasName}.target`,
        message: `Alias target "${aliasDefinition.target}" is not a known command id.`
      });
    } else {
      const command = registry.commands[aliasDefinition.target];
      if (aliasDefinition.default_mode && !isCompatibleMode(command, aliasDefinition.default_mode)) {
        issues.push({
          level: "warn",
          path: `aliases.${aliasName}.default_mode`,
          message:
            `Mode "${aliasDefinition.default_mode}" is not compatible with target ` +
            `"${aliasDefinition.target}".`
        });
      }

      if (aliasDefinition.default_persona && !isCompatiblePersona(command, aliasDefinition.default_persona)) {
        issues.push({
          level: "warn",
          path: `aliases.${aliasName}.default_persona`,
          message:
            `Persona "${aliasDefinition.default_persona}" is not compatible with target ` +
            `"${aliasDefinition.target}".`
        });
      }
    }

    if (aliasDefinition.default_mode && !Object.hasOwn(registry.modes, aliasDefinition.default_mode)) {
      issues.push({
        level: "warn",
        path: `aliases.${aliasName}.default_mode`,
        message: `Unknown mode "${aliasDefinition.default_mode}" in alias default.`
      });
    }

    if (aliasDefinition.default_persona && !Object.hasOwn(registry.personas, aliasDefinition.default_persona)) {
      issues.push({
        level: "warn",
        path: `aliases.${aliasName}.default_persona`,
        message: `Unknown persona "${aliasDefinition.default_persona}" in alias default.`
      });
    }

    if (
      aliasDefinition.output &&
      aliasDefinition.output !== "normal" &&
      aliasDefinition.output !== "json"
    ) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}.output`,
        message: `Unsupported alias output mode "${aliasDefinition.output}".`
      });
    }

    if (
      aliasDefinition.risk_level &&
      aliasDefinition.risk_level !== "low" &&
      aliasDefinition.risk_level !== "medium" &&
      aliasDefinition.risk_level !== "high"
    ) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}.risk_level`,
        message: `Unsupported alias risk level "${aliasDefinition.risk_level}".`
      });
    }

    if (
      aliasDefinition.stability &&
      aliasDefinition.stability !== "stable" &&
      aliasDefinition.stability !== "experimental"
    ) {
      issues.push({
        level: "error",
        path: `aliases.${aliasName}.stability`,
        message: `Unsupported alias stability "${aliasDefinition.stability}".`
      });
    }

    if (aliasDefinition.pack) {
      const aliasPack = registry.alias_packs[aliasDefinition.pack];
      if (!aliasPack) {
        issues.push({
          level: "warn",
          path: `aliases.${aliasName}.pack`,
          message: `Alias references unknown pack "${aliasDefinition.pack}".`
        });
      } else if (!aliasPack.aliases.includes(aliasName)) {
        issues.push({
          level: "warn",
          path: `aliases.${aliasName}.pack`,
          message: `Alias "${aliasName}" is not listed in pack "${aliasDefinition.pack}".`
        });
      }
    }

    if (isReservedTopLevelCommandName(aliasName)) {
      issues.push({
        level: "warn",
        path: `aliases.${aliasName}`,
        message:
          `Alias "${aliasName}" collides with a top-level command name. ` +
          `Plain form "supercodex ${aliasName}" will execute the command; use "/sc:${aliasName}" explicitly.`
      });
    }
  }

  for (const [packName, packDefinition] of Object.entries(registry.alias_packs)) {
    if (!packDefinition.description || !packDefinition.description.trim()) {
      issues.push({
        level: "error",
        path: `alias_packs.${packName}.description`,
        message: "Alias pack description is required."
      });
    }

    if (packDefinition.aliases.length === 0) {
      issues.push({
        level: "warn",
        path: `alias_packs.${packName}.aliases`,
        message: "Alias pack does not contain any aliases."
      });
    }

    const seenAliases = new Set<string>();
    for (const aliasName of packDefinition.aliases) {
      if (seenAliases.has(aliasName)) {
        issues.push({
          level: "warn",
          path: `alias_packs.${packName}.aliases`,
          message: `Alias "${aliasName}" is duplicated in pack "${packName}".`
        });
        continue;
      }

      seenAliases.add(aliasName);
      if (!Object.hasOwn(registry.aliases, aliasName)) {
        issues.push({
          level: "warn",
          path: `alias_packs.${packName}.aliases`,
          message: `Alias "${aliasName}" in pack "${packName}" is not defined.`
        });
        continue;
      }

      const alias = registry.aliases[aliasName];
      if (alias.pack && alias.pack !== packName) {
        issues.push({
          level: "warn",
          path: `alias_packs.${packName}.aliases`,
          message:
            `Alias "${aliasName}" belongs to "${alias.pack}" but is also listed in "${packName}".`
        });
      }
    }
  }

  return issues;
}

export function listCatalogEntries(registry: RegistryData): CatalogEntry[] {
  return Object.values(registry.catalog).sort((a, b) => a.id.localeCompare(b.id));
}

export function searchCatalogEntries(registry: RegistryData, query: string): CatalogEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return listCatalogEntries(registry);
  }

  return listCatalogEntries(registry).filter((entry) => {
    const haystack = [
      entry.id,
      entry.name,
      entry.description,
      ...(entry.tags ?? []),
      entry.command ?? "",
      entry.url ?? ""
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function getCatalogEntry(registry: RegistryData, id: string): CatalogEntry | null {
  return registry.catalog[id] ?? null;
}

async function readOverlayFile(
  overlayPath: string,
  issues: RegistryValidationIssue[]
): Promise<RegistryOverlayFile | null> {
  try {
    const parsed = await loadConfig(overlayPath);
    return isPlainObject(parsed) ? (parsed as RegistryOverlayFile) : null;
  } catch (error) {
    issues.push({
      level: "error",
      path: overlayPath,
      message: `Failed to parse overlay file: ${error instanceof Error ? error.message : String(error)}`
    });
    return null;
  }
}

function applyOverlay(
  registry: RegistryData,
  overlay: RegistryOverlayFile,
  sourcePath: string,
  issues: RegistryValidationIssue[]
): void {
  if (isPlainObject(overlay.modes)) {
    for (const [name, raw] of Object.entries(overlay.modes)) {
      const normalized = normalizeMode(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:modes.${name}`,
          message: "Skipped invalid mode entry."
        });
        continue;
      }
      registry.modes[name] = normalized;
    }
  }

  if (isPlainObject(overlay.personas)) {
    for (const [name, raw] of Object.entries(overlay.personas)) {
      const normalized = normalizePersona(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:personas.${name}`,
          message: "Skipped invalid persona entry."
        });
        continue;
      }
      registry.personas[name] = normalized;
    }
  }

  if (isPlainObject(overlay.commands)) {
    for (const [id, raw] of Object.entries(overlay.commands)) {
      const normalized = normalizeCommand(id, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:commands.${id}`,
          message: "Skipped invalid command entry."
        });
        continue;
      }
      registry.commands[id] = normalized;
    }
  }

  if (isPlainObject(overlay.catalog)) {
    for (const [id, raw] of Object.entries(overlay.catalog)) {
      const normalized = normalizeCatalogEntry(id, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:catalog.${id}`,
          message: "Skipped invalid catalog entry."
        });
        continue;
      }
      registry.catalog[id] = normalized;
    }
  }

  if (isPlainObject(overlay.aliases)) {
    for (const [name, raw] of Object.entries(overlay.aliases)) {
      const normalized = normalizeAlias(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:aliases.${name}`,
          message: "Skipped invalid alias entry."
        });
        continue;
      }
      if (Object.hasOwn(registry.aliases, normalized.name)) {
        const existing = registry.aliases[normalized.name];
        if (!areAliasesEquivalent(existing, normalized)) {
          issues.push({
            level: "warn",
            path: `${sourcePath}:aliases.${normalized.name}`,
            message: `Alias "${normalized.name}" overrides an existing alias definition.`
          });
        }
      }
      registry.aliases[normalized.name] = normalized;
    }
  }

  if (isPlainObject(overlay.alias_packs)) {
    for (const [name, raw] of Object.entries(overlay.alias_packs)) {
      const normalized = normalizeAliasPack(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:alias_packs.${name}`,
          message: "Skipped invalid alias pack entry."
        });
        continue;
      }
      if (Object.hasOwn(registry.alias_packs, name)) {
        const existing = registry.alias_packs[name];
        if (!areAliasPacksEquivalent(existing, normalized)) {
          issues.push({
            level: "warn",
            path: `${sourcePath}:alias_packs.${name}`,
            message: `Alias pack "${name}" overrides an existing pack definition.`
          });
        }
      }
      registry.alias_packs[name] = normalized;
    }
  }

  if (isPlainObject(overlay.agent_definitions)) {
    for (const [name, raw] of Object.entries(overlay.agent_definitions)) {
      const normalized = normalizeAgentDefinition(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:agent_definitions.${name}`,
          message: "Skipped invalid agent definition entry."
        });
        continue;
      }
      registry.agent_definitions[name] = normalized;
    }
  }

  if (isPlainObject(overlay.skills)) {
    for (const [id, raw] of Object.entries(overlay.skills)) {
      const normalized = normalizeSkillDefinition(id, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:skills.${id}`,
          message: "Skipped invalid skill definition entry."
        });
        continue;
      }
      registry.skills[id] = normalized;
    }
  }

  if (isPlainObject(overlay.flags)) {
    for (const [name, raw] of Object.entries(overlay.flags)) {
      const normalized = normalizeFlagDefinition(name, raw);
      if (!normalized) {
        issues.push({
          level: "warn",
          path: `${sourcePath}:flags.${name}`,
          message: "Skipped invalid flag definition entry."
        });
        continue;
      }
      registry.flags[name] = normalized;
    }
  }
}

function normalizeMode(name: string, raw: unknown): ModeDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  if (!description) {
    return null;
  }

  const mode: ModeDefinition = {
    name,
    description
  };

  const promptOverlay = asString(raw.prompt_overlay);
  if (promptOverlay) {
    mode.prompt_overlay = promptOverlay;
  }

  const temperature = asNumber(raw.temperature);
  if (typeof temperature === "number") {
    mode.temperature = temperature;
  }

  const reasoningBudget = asString(raw.reasoning_budget);
  if (reasoningBudget === "low" || reasoningBudget === "medium" || reasoningBudget === "high") {
    mode.reasoning_budget = reasoningBudget;
  }

  return mode;
}

function normalizePersona(name: string, raw: unknown): PersonaDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  if (!description) {
    return null;
  }

  const persona: PersonaDefinition = {
    name,
    description
  };

  const systemPrompt = asString(raw.system_prompt);
  if (systemPrompt) {
    persona.system_prompt = systemPrompt;
  }

  const tags = asStringArray(raw.policy_tags);
  if (tags.length > 0) {
    persona.policy_tags = tags;
  }

  return persona;
}

function normalizeCommand(id: string, raw: unknown): CommandDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  if (!description) {
    return null;
  }

  return {
    id,
    description,
    enabled: raw.enabled !== false,
    mode_compatible: asStringArray(raw.mode_compatible),
    persona_compatible: asStringArray(raw.persona_compatible)
  };
}

function normalizeCatalogEntry(id: string, raw: unknown): CatalogEntry | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const transport = asString(raw.transport);
  if (transport !== "stdio" && transport !== "http") {
    return null;
  }

  const description = asString(raw.description) ?? `Catalog entry ${id}`;
  const name = asString(raw.name) ?? id;
  const entry: CatalogEntry = {
    id,
    name,
    description,
    transport
  };

  const command = asString(raw.command);
  const args = asStringArray(raw.args);
  const url = asString(raw.url);
  const tags = asStringArray(raw.tags);

  if (transport === "stdio") {
    if (!command) {
      return null;
    }
    entry.command = command;
    if (args.length > 0) {
      entry.args = args;
    }
  }

  if (transport === "http") {
    if (!url) {
      return null;
    }
    entry.url = url;
  }

  const env = asStringMap(raw.env);
  if (Object.keys(env).length > 0) {
    entry.env = env;
  }

  if (tags.length > 0) {
    entry.tags = tags;
  }

  return entry;
}

function normalizeAlias(name: string, raw: unknown): AliasDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  const target = asString(raw.target);
  if (!description || !target) {
    return null;
  }

  const parsedName = normalizeAliasToken(name);
  const aliasName = (parsedName ? parsedName.name : name).toLowerCase();
  if (!aliasName) {
    return null;
  }

  const alias: AliasDefinition = {
    name: aliasName,
    description,
    target
  };

  const pack = asString(raw.pack);
  if (pack) {
    alias.pack = pack;
  }

  const tags = asStringArray(raw.tags);
  if (tags.length > 0) {
    alias.tags = dedupeStrings(tags);
  }

  const riskLevel = asString(raw.risk_level);
  if (riskLevel === "low" || riskLevel === "medium" || riskLevel === "high") {
    alias.risk_level = riskLevel;
  }

  const stability = asString(raw.stability);
  if (stability === "stable" || stability === "experimental") {
    alias.stability = stability;
  }

  const defaultMode = asString(raw.default_mode);
  if (defaultMode) {
    alias.default_mode = defaultMode;
  }

  const defaultPersona = asString(raw.default_persona);
  if (defaultPersona) {
    alias.default_persona = defaultPersona;
  }

  const forwardArgs = asBoolean(raw.forward_args);
  if (typeof forwardArgs === "boolean") {
    alias.forward_args = forwardArgs;
  }

  const output = asString(raw.output);
  if (output === "normal" || output === "json") {
    alias.output = output;
  }

  return alias;
}

function normalizeAliasPack(name: string, raw: unknown): AliasPackDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  if (!description) {
    return null;
  }

  const aliases = dedupeStrings(asStringArray(raw.aliases).map((entry) => entry.toLowerCase()));
  const defaultEnabled = asBoolean(raw.default_enabled);

  return {
    name,
    description,
    default_enabled: defaultEnabled ?? true,
    aliases
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asStringMap(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) {
    return {};
  }

  const env: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      env[key] = raw;
    }
  }
  return env;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isValidCommandId(value: string): boolean {
  return /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(value);
}

function isCompatibleMode(command: CommandDefinition, modeName: string): boolean {
  if (command.mode_compatible.length === 0) {
    return true;
  }
  return command.mode_compatible.includes(modeName);
}

function isCompatiblePersona(command: CommandDefinition, personaName: string): boolean {
  if (command.persona_compatible.length === 0) {
    return true;
  }
  return command.persona_compatible.includes(personaName);
}

function areAliasesEquivalent(a: AliasDefinition, b: AliasDefinition): boolean {
  return deepEqual(a, b);
}

function areAliasPacksEquivalent(a: AliasPackDefinition, b: AliasPackDefinition): boolean {
  return deepEqual(a, b);
}

function normalizeAgentDefinition(name: string, raw: unknown): AgentDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const description = asString(raw.description);
  if (!description) {
    return null;
  }

  const agent: AgentDefinition = {
    name,
    description
  };

  const triggers = asStringArray(raw.triggers);
  if (triggers.length > 0) {
    agent.triggers = triggers;
  }

  const primaryPersona = asString(raw.primary_persona);
  if (primaryPersona) {
    agent.primary_persona = primaryPersona;
  }

  const primaryMode = asString(raw.primary_mode);
  if (primaryMode) {
    agent.primary_mode = primaryMode;
  }

  const contentFile = asString(raw.content_file);
  if (contentFile) {
    agent.content_file = contentFile;
  }

  const capabilities = asStringArray(raw.capabilities);
  if (capabilities.length > 0) {
    agent.capabilities = capabilities;
  }

  return agent;
}

function normalizeSkillDefinition(id: string, raw: unknown): SkillDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const name = asString(raw.name);
  const description = asString(raw.description);
  const version = asString(raw.version) ?? "1.0.0";
  const contentFile = asString(raw.content_file);
  if (!name || !description || !contentFile) {
    return null;
  }

  const skill: SkillDefinition = {
    id,
    name,
    description,
    version,
    content_file: contentFile,
    enabled: raw.enabled !== false
  };

  const triggers = asStringArray(raw.triggers);
  if (triggers.length > 0) {
    skill.triggers = triggers;
  }

  const requiredConfidence = asNumber(raw.required_confidence);
  if (typeof requiredConfidence === "number") {
    skill.required_confidence = requiredConfidence;
  }

  return skill;
}

function normalizeFlagDefinition(name: string, raw: unknown): FlagDefinition | null {
  if (!isPlainObject(raw)) {
    return null;
  }

  const flag = asString(raw.flag);
  const description = asString(raw.description);
  const category = asString(raw.category);
  if (!flag || !description || !category) {
    return null;
  }

  if (category !== "mode" && category !== "mcp" && category !== "depth" && category !== "output") {
    return null;
  }

  const flagDef: FlagDefinition = {
    name,
    flag,
    category,
    description
  };

  const activatesMode = asString(raw.activates_mode);
  if (activatesMode) {
    flagDef.activates_mode = activatesMode;
  }

  const activatesMcp = asStringArray(raw.activates_mcp);
  if (activatesMcp.length > 0) {
    flagDef.activates_mcp = activatesMcp;
  }

  const reasoningBudget = asString(raw.reasoning_budget);
  if (reasoningBudget) {
    flagDef.reasoning_budget = reasoningBudget;
  }

  const conflictsWith = asStringArray(raw.conflicts_with);
  if (conflictsWith.length > 0) {
    flagDef.conflicts_with = conflictsWith;
  }

  return flagDef;
}
