import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { expandHomePath, getCodexPaths } from "../paths";

const DEFAULT_MAX_ENTRIES = 5000;
const DEFAULT_RECENT_LIMIT = 10;

export interface SessionRecord {
  id: string;
  timestamp: string;
  project_root: string;
  summary: string;
  decisions: string[];
  next_steps: string[];
  tags: string[];
  mode?: string;
  persona?: string;
}

export interface SessionMemorySettings {
  enabled: boolean;
  path: string;
  maxEntries: number;
}

export interface SaveSessionOptions {
  codexHome?: string;
  projectRoot: string;
  summary: string;
  decisions: string[];
  nextSteps: string[];
  tags: string[];
  mode?: string;
  persona?: string;
  now?: Date;
}

export interface SaveSessionResult {
  settings: SessionMemorySettings;
  record: SessionRecord | null;
  saved: boolean;
}

export interface LoadSessionOptions {
  codexHome?: string;
  projectRoot?: string;
  recent?: number;
}

export interface LoadSessionResult {
  settings: SessionMemorySettings;
  records: SessionRecord[];
  totalRecords: number;
}

export interface ReflectSessionOptions {
  codexHome?: string;
  projectRoot?: string;
  recent?: number;
}

export interface SessionReflection {
  latest: SessionRecord;
  decisions: string[];
  pending_next_steps: string[];
  recommended_command: string;
  covered_checkpoints: number;
}

export interface ReflectSessionResult {
  settings: SessionMemorySettings;
  reflection: SessionReflection | null;
  totalRecords: number;
}

export async function getSessionMemorySettings(codexHome?: string): Promise<SessionMemorySettings> {
  const paths = getCodexPaths(codexHome);
  const config = await loadConfig(paths.configPath);
  return resolveMemorySettings(config, paths.home);
}

export async function saveSessionCheckpoint(options: SaveSessionOptions): Promise<SaveSessionResult> {
  const settings = await getSessionMemorySettings(options.codexHome);
  if (!settings.enabled) {
    return { settings, record: null, saved: false };
  }

  const normalizedSummary = options.summary.trim();
  if (normalizedSummary.length === 0) {
    throw new Error("Session summary cannot be empty.");
  }

  const projectRoot = path.resolve(options.projectRoot);
  const records = await readSessionRecords(settings.path);
  const record: SessionRecord = {
    id: randomUUID(),
    timestamp: (options.now ?? new Date()).toISOString(),
    project_root: projectRoot,
    summary: normalizedSummary,
    decisions: dedupeStrings(options.decisions),
    next_steps: dedupeStrings(options.nextSteps),
    tags: dedupeStrings(options.tags),
    ...(options.mode ? { mode: options.mode } : {}),
    ...(options.persona ? { persona: options.persona } : {})
  };

  records.push(record);
  const maxEntries = Math.max(1, settings.maxEntries);
  const trimmed = records.slice(-maxEntries);
  await writeSessionRecords(settings.path, trimmed);

  return {
    settings,
    record,
    saved: true
  };
}

export async function loadSessionCheckpoints(options: LoadSessionOptions = {}): Promise<LoadSessionResult> {
  const settings = await getSessionMemorySettings(options.codexHome);
  const allRecords = settings.enabled ? await readSessionRecords(settings.path) : [];
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : null;
  const filtered = projectRoot
    ? allRecords.filter((record) => path.resolve(record.project_root) === projectRoot)
    : allRecords;
  const recent = clampRecent(options.recent);
  const records = filtered.slice(-recent).reverse();

  return {
    settings,
    records,
    totalRecords: filtered.length
  };
}

export async function reflectSession(options: ReflectSessionOptions = {}): Promise<ReflectSessionResult> {
  const settings = await getSessionMemorySettings(options.codexHome);
  const allRecords = settings.enabled ? await readSessionRecords(settings.path) : [];
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : null;
  const filtered = projectRoot
    ? allRecords.filter((record) => path.resolve(record.project_root) === projectRoot)
    : allRecords;
  const recent = clampRecent(options.recent);
  const slice = filtered.slice(-recent);

  if (slice.length === 0) {
    return {
      settings,
      reflection: null,
      totalRecords: 0
    };
  }

  const latest = slice[slice.length - 1];
  const decisions = collectUniqueFromLatest(slice.map((record) => record.decisions));
  const pendingNextSteps = collectUniqueFromLatest(slice.map((record) => record.next_steps));
  const recommendedMode = latest.mode ? ` --mode ${latest.mode}` : "";
  const recommendedPersona = latest.persona ? ` --persona ${latest.persona}` : "";
  const recommendedCommand = `supercodex run plan${recommendedMode}${recommendedPersona}`;

  return {
    settings,
    reflection: {
      latest,
      decisions,
      pending_next_steps: pendingNextSteps,
      recommended_command: recommendedCommand,
      covered_checkpoints: slice.length
    },
    totalRecords: filtered.length
  };
}

function resolveMemorySettings(config: TomlTable, codexHome: string): SessionMemorySettings {
  const defaultPath = path.join(codexHome, "supercodex", "memory", "sessions.jsonl");
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const memory = supercodex && isPlainObject(supercodex.memory) ? (supercodex.memory as TomlTable) : null;

  const enabled = typeof memory?.enabled === "boolean" ? memory.enabled : true;
  const configuredPath = typeof memory?.path === "string" ? memory.path.trim() : "";
  const maxEntriesRaw = typeof memory?.max_entries === "number" ? memory.max_entries : DEFAULT_MAX_ENTRIES;
  const maxEntries = Number.isFinite(maxEntriesRaw) && maxEntriesRaw > 0
    ? Math.trunc(maxEntriesRaw)
    : DEFAULT_MAX_ENTRIES;

  return {
    enabled,
    path: configuredPath.length > 0 ? path.resolve(expandHomePath(configuredPath)) : defaultPath,
    maxEntries
  };
}

async function readSessionRecords(filePath: string): Promise<SessionRecord[]> {
  if (!(await pathExists(filePath))) {
    return [];
  }

  const raw = await readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const records: SessionRecord[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      const normalized = normalizeSessionRecord(parsed);
      if (normalized) {
        records.push(normalized);
      }
    } catch {
      // Ignore malformed lines to keep memory operations resilient.
    }
  }

  return records;
}

async function writeSessionRecords(filePath: string, records: SessionRecord[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const lines = records.map((record) => JSON.stringify(record)).join("\n");
  const payload = lines.length > 0 ? `${lines}\n` : "";
  await writeFile(filePath, payload, "utf8");
}

function normalizeSessionRecord(value: unknown): SessionRecord | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const id = asNonEmptyString(value.id);
  const timestamp = asNonEmptyString(value.timestamp);
  const projectRoot = asNonEmptyString(value.project_root);
  const summary = asNonEmptyString(value.summary);
  if (!id || !timestamp || !projectRoot || !summary) {
    return null;
  }

  return {
    id,
    timestamp,
    project_root: projectRoot,
    summary,
    decisions: dedupeStrings(asStringList(value.decisions)),
    next_steps: dedupeStrings(asStringList(value.next_steps)),
    tags: dedupeStrings(asStringList(value.tags)),
    ...(asNonEmptyString(value.mode) ? { mode: asNonEmptyString(value.mode) as string } : {}),
    ...(asNonEmptyString(value.persona) ? { persona: asNonEmptyString(value.persona) as string } : {})
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0);
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function clampRecent(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RECENT_LIMIT;
  }
  return Math.min(100, Math.max(1, Math.trunc(value)));
}

function collectUniqueFromLatest(values: string[][]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (let index = values.length - 1; index >= 0; index -= 1) {
    for (const item of values[index]) {
      if (seen.has(item)) {
        continue;
      }
      seen.add(item);
      ordered.push(item);
    }
  }

  return ordered;
}
