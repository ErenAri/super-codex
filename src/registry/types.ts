import type { TomlTable } from "../config";

export type ModeName = string;
export type PersonaName = string;
export type CommandId = string;
export type McpTransport = "stdio" | "http";
export type AliasOutputMode = "normal" | "json";
export type AliasRiskLevel = "low" | "medium" | "high";
export type AliasStability = "stable" | "experimental";

export interface ModeDefinition {
  name: ModeName;
  description: string;
  prompt_overlay?: string;
  temperature?: number;
  reasoning_budget?: "low" | "medium" | "high";
}

export interface PersonaDefinition {
  name: PersonaName;
  description: string;
  system_prompt?: string;
  policy_tags?: string[];
}

export interface CommandDefinition {
  id: CommandId;
  description: string;
  enabled: boolean;
  mode_compatible: ModeName[];
  persona_compatible: PersonaName[];
}

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  tags?: string[];
}

export interface AliasDefinition {
  name: string;
  description: string;
  target: string;
  pack?: string;
  tags?: string[];
  risk_level?: AliasRiskLevel;
  stability?: AliasStability;
  default_mode?: string;
  default_persona?: string;
  forward_args?: boolean;
  output?: AliasOutputMode;
}

export interface AliasPackDefinition {
  name: string;
  description: string;
  default_enabled: boolean;
  aliases: string[];
}

export interface RegistryData {
  modes: Record<string, ModeDefinition>;
  personas: Record<string, PersonaDefinition>;
  commands: Record<string, CommandDefinition>;
  catalog: Record<string, CatalogEntry>;
  aliases: Record<string, AliasDefinition>;
  alias_packs: Record<string, AliasPackDefinition>;
}

export interface RegistryValidationIssue {
  level: "warn" | "error";
  path: string;
  message: string;
}

export interface RegistryOverlayFile {
  modes?: Record<string, TomlTable>;
  personas?: Record<string, TomlTable>;
  commands?: Record<string, TomlTable>;
  catalog?: Record<string, TomlTable>;
  aliases?: Record<string, TomlTable>;
  alias_packs?: Record<string, TomlTable>;
}
