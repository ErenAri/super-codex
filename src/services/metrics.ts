import path from "node:path";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject, pathExists } from "../fs-utils";
import { expandHomePath, getCodexPaths } from "../paths";

export interface MetricEventPayload {
  [key: string]: unknown;
}

export interface RecordMetricOptions {
  codexHome?: string;
  payload?: MetricEventPayload;
}

export interface ReadMetricOptions {
  codexHome?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface MetricRecord {
  schema_version: 1;
  event: string;
  at: string;
  actor_id: string;
  [key: string]: unknown;
}

export interface MetricsSettings {
  enabled: boolean;
  outputPath: string;
  actorId: string;
}

export async function recordMetricEvent(event: string, options: RecordMetricOptions = {}): Promise<boolean> {
  const settings = await loadMetricsSettings(options.codexHome);
  if (!settings.enabled) {
    return false;
  }

  await mkdir(path.dirname(settings.outputPath), { recursive: true });
  const record: MetricRecord = {
    schema_version: 1,
    event,
    at: new Date().toISOString(),
    actor_id: settings.actorId,
    ...(options.payload ?? {})
  };
  await appendFile(settings.outputPath, `${JSON.stringify(record)}\n`, "utf8");
  return true;
}

export async function tryRecordMetricEvent(event: string, options: RecordMetricOptions = {}): Promise<void> {
  try {
    await recordMetricEvent(event, options);
  } catch {
    // Metrics collection should never block command execution.
  }
}

export async function readMetricEvents(options: ReadMetricOptions = {}): Promise<MetricRecord[]> {
  const settings = await loadMetricsSettings(options.codexHome);
  if (!(await pathExists(settings.outputPath))) {
    return [];
  }

  const raw = await readFile(settings.outputPath, "utf8");
  if (!raw.trim()) {
    return [];
  }

  const from = parseMetricDateBoundary(options.from, "from");
  const to = parseMetricDateBoundary(options.to, "to");
  const records: MetricRecord[] = [];
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (!isPlainObject(parsed)) {
      continue;
    }

    const event = typeof parsed.event === "string" ? parsed.event.trim() : "";
    const at = typeof parsed.at === "string" ? parsed.at.trim() : "";
    if (!event || !at || Number.isNaN(Date.parse(at))) {
      continue;
    }

    const timestamp = Date.parse(at);
    if (from !== null && timestamp < from.getTime()) {
      continue;
    }
    if (to !== null && timestamp > to.getTime()) {
      continue;
    }

    records.push({
      ...parsed,
      schema_version: 1,
      event,
      at,
      actor_id: typeof parsed.actor_id === "string" && parsed.actor_id.trim().length > 0
        ? parsed.actor_id
        : settings.actorId
    });
  }

  records.sort((left, right) => {
    const byTime = Date.parse(left.at) - Date.parse(right.at);
    if (byTime !== 0) {
      return byTime;
    }
    return left.event.localeCompare(right.event);
  });

  const limit = normalizeLimit(options.limit);
  if (limit !== null && records.length > limit) {
    return records.slice(records.length - limit);
  }

  return records;
}

export async function loadMetricsSettings(codexHome?: string): Promise<MetricsSettings> {
  const paths = getCodexPaths(codexHome);
  const config = await loadConfig(paths.configPath);
  return resolveMetricsSettings(config, paths.home);
}

export function resolveMetricsSettings(config: TomlTable, codexHome: string): MetricsSettings {
  const defaultPath = path.join(codexHome, "supercodex", "metrics.jsonl");
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const metrics = supercodex && isPlainObject(supercodex.metrics) ? (supercodex.metrics as TomlTable) : null;

  const enabled = typeof metrics?.enabled === "boolean" ? metrics.enabled : false;
  const configuredPath = typeof metrics?.path === "string" ? metrics.path.trim() : "";
  const outputPath = configuredPath.length > 0
    ? path.resolve(expandHomePath(configuredPath))
    : defaultPath;

  return {
    enabled,
    outputPath,
    actorId: createStableActorId(codexHome)
  };
}

function createStableActorId(codexHome: string): string {
  return createHash("sha256")
    .update(codexHome, "utf8")
    .digest("hex")
    .slice(0, 16);
}

function parseMetricDateBoundary(value: string | undefined, label: "from" | "to"): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid --${label} value "${value}". Expected YYYY-MM-DD.`);
  }

  const normalized = label === "from"
    ? `${trimmed}T00:00:00.000Z`
    : `${trimmed}T23:59:59.999Z`;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid --${label} value "${value}". Expected YYYY-MM-DD.`);
  }
  return new Date(timestamp);
}

function normalizeLimit(limit: number | undefined): number | null {
  if (typeof limit !== "number" || Number.isNaN(limit) || !Number.isFinite(limit)) {
    return null;
  }
  const value = Math.trunc(limit);
  if (value <= 0) {
    return null;
  }
  return value;
}
