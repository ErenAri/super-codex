import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";

import { loadConfig, type TomlTable } from "../config";
import { isPlainObject } from "../fs-utils";
import { expandHomePath, getCodexPaths } from "../paths";

export interface MetricEventPayload {
  [key: string]: unknown;
}

export interface RecordMetricOptions {
  codexHome?: string;
  payload?: MetricEventPayload;
}

interface MetricsSettings {
  enabled: boolean;
  outputPath: string;
}

export async function recordMetricEvent(event: string, options: RecordMetricOptions = {}): Promise<boolean> {
  const paths = getCodexPaths(options.codexHome);
  const config = await loadConfig(paths.configPath);
  const settings = resolveMetricsSettings(config, paths.home);
  if (!settings.enabled) {
    return false;
  }

  await mkdir(path.dirname(settings.outputPath), { recursive: true });
  const record = {
    event,
    at: new Date().toISOString(),
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

function resolveMetricsSettings(config: TomlTable, codexHome: string): MetricsSettings {
  const defaultPath = path.join(codexHome, "supercodex", "metrics.jsonl");
  const supercodex = isPlainObject(config.supercodex) ? (config.supercodex as TomlTable) : null;
  const metrics = supercodex && isPlainObject(supercodex.metrics) ? (supercodex.metrics as TomlTable) : null;

  const enabled = typeof metrics?.enabled === "boolean" ? metrics.enabled : true;
  const configuredPath = typeof metrics?.path === "string" ? metrics.path.trim() : "";
  const outputPath = configuredPath.length > 0
    ? path.resolve(expandHomePath(configuredPath))
    : defaultPath;

  return {
    enabled,
    outputPath
  };
}
