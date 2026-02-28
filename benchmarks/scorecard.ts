import path from "node:path";
import { writeFile } from "node:fs/promises";

import { ensureDir, readJsonFile, writeJsonStable } from "./io";
import type {
  BenchmarkMode,
  BenchmarkRunResult,
  Scorecard,
  ScorecardReport,
  TaskRunResult,
  BenchmarkThresholds
} from "./types";

interface ScorecardCliOptions {
  inputPath?: string;
  resultsDir?: string;
  thresholdsPath?: string;
  enforceThresholds: boolean;
}

export const DEFAULT_THRESHOLDS: BenchmarkThresholds = {
  success_rate_delta_min: 0.15,
  median_time_delta_pct_max: -25,
  regression_rate_max: 0.05
};

export function computeScorecard(
  runResult: BenchmarkRunResult,
  thresholds: BenchmarkThresholds = DEFAULT_THRESHOLDS
): Scorecard {
  const modeStats = collectModeStats(runResult.results);
  const successRate: Record<BenchmarkMode, number> = {
    codex_native: ratio(modeStats.codex_native.passed, modeStats.codex_native.total),
    supercodex: ratio(modeStats.supercodex.passed, modeStats.supercodex.total)
  };

  const medianDurationMs: Record<BenchmarkMode, number> = {
    codex_native: median(modeStats.codex_native.durations),
    supercodex: median(modeStats.supercodex.durations)
  };

  const paired = collectPairedResults(runResult.results);
  const regressionCount = paired.filter(
    (pair) => pair.codex_native.pass && !pair.supercodex.pass
  ).length;
  const pairedTasks = paired.length;

  const successRateDelta = successRate.supercodex - successRate.codex_native;
  const medianTimeDeltaPct =
    medianDurationMs.codex_native > 0
      ? ((medianDurationMs.supercodex - medianDurationMs.codex_native) / medianDurationMs.codex_native) * 100
      : 0;
  const regressionRate = pairedTasks > 0 ? regressionCount / pairedTasks : 0;

  const thresholdsMet = {
    success_rate_gain_15pct: successRateDelta >= thresholds.success_rate_delta_min,
    median_time_gain_25pct: medianTimeDeltaPct <= thresholds.median_time_delta_pct_max,
    regression_rate_max_5pct: regressionRate <= thresholds.regression_rate_max,
    overall: false
  };
  thresholdsMet.overall =
    thresholdsMet.success_rate_gain_15pct &&
    thresholdsMet.median_time_gain_25pct &&
    thresholdsMet.regression_rate_max_5pct;

  return {
    success_rate: successRate,
    success_rate_delta: successRateDelta,
    median_duration_ms: medianDurationMs,
    median_time_delta_pct: medianTimeDeltaPct,
    regression_rate: regressionRate,
    paired_tasks: pairedTasks,
    thresholds,
    thresholds_met: thresholdsMet
  };
}

function collectModeStats(results: TaskRunResult[]): Record<BenchmarkMode, {
  total: number;
  passed: number;
  durations: number[];
}> {
  const stats: Record<BenchmarkMode, { total: number; passed: number; durations: number[] }> = {
    codex_native: { total: 0, passed: 0, durations: [] },
    supercodex: { total: 0, passed: 0, durations: [] }
  };

  for (const result of results) {
    const bucket = stats[result.mode];
    bucket.total += 1;
    if (result.pass) {
      bucket.passed += 1;
    }
    bucket.durations.push(result.duration_ms);
  }

  return stats;
}

function collectPairedResults(results: TaskRunResult[]): Array<{
  codex_native: TaskRunResult;
  supercodex: TaskRunResult;
}> {
  const byTask = new Map<string, Partial<Record<BenchmarkMode, TaskRunResult>>>();
  for (const result of results) {
    const current = byTask.get(result.task_id) ?? {};
    current[result.mode] = result;
    byTask.set(result.task_id, current);
  }

  const paired: Array<{ codex_native: TaskRunResult; supercodex: TaskRunResult }> = [];
  for (const taskResult of byTask.values()) {
    if (taskResult.codex_native && taskResult.supercodex) {
      paired.push({
        codex_native: taskResult.codex_native,
        supercodex: taskResult.supercodex
      });
    }
  }

  return paired;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }
  return sorted[midpoint];
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function toSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatScorecardMarkdown(report: ScorecardReport): string {
  const score = report.scorecard;
  const successThreshold = toPercent(score.thresholds.success_rate_delta_min);
  const medianThreshold = `${score.thresholds.median_time_delta_pct_max.toFixed(2)}%`;
  const regressionThreshold = toPercent(score.thresholds.regression_rate_max);
  const preflightLines = report.preflight
    ? [
        "",
        `Preflight codex_cli: \`${report.preflight.codex_cli}\``,
        ...(report.preflight.warnings.length > 0
          ? report.preflight.warnings.map((warning) => `- Warning: ${warning}`)
          : [])
      ]
    : [];
  return [
    "# Benchmark Scorecard",
    "",
    `Run id: \`${report.run_id}\``,
    `Generated: ${report.created_at}`,
    "",
    "| Metric | Value | Threshold | Pass |",
    "|---|---:|---:|:---:|",
    `| Success rate (codex_native) | ${toPercent(score.success_rate.codex_native)} | - | - |`,
    `| Success rate (supercodex) | ${toPercent(score.success_rate.supercodex)} | - | - |`,
    `| Success rate delta | ${toPercent(score.success_rate_delta)} | >= ${successThreshold} | ${score.thresholds_met.success_rate_gain_15pct ? "yes" : "no"} |`,
    `| Median duration (codex_native) | ${score.median_duration_ms.codex_native.toFixed(0)} ms | - | - |`,
    `| Median duration (supercodex) | ${score.median_duration_ms.supercodex.toFixed(0)} ms | - | - |`,
    `| Median time delta | ${toSignedPercent(score.median_time_delta_pct)} | <= ${medianThreshold} | ${score.thresholds_met.median_time_gain_25pct ? "yes" : "no"} |`,
    `| Regression rate | ${toPercent(score.regression_rate)} | <= ${regressionThreshold} | ${score.thresholds_met.regression_rate_max_5pct ? "yes" : "no"} |`,
    `| Paired tasks | ${score.paired_tasks} | - | - |`,
    "",
    `Overall: **${score.thresholds_met.overall ? "PASS" : "FAIL"}**`,
    ...preflightLines,
    ""
  ].join("\n");
}

function parseCliArgs(argv: string[]): ScorecardCliOptions {
  const options: ScorecardCliOptions = {
    enforceThresholds: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--input") {
      options.inputPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--input=")) {
      options.inputPath = current.slice("--input=".length);
      continue;
    }
    if (current === "--results-dir") {
      options.resultsDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--results-dir=")) {
      options.resultsDir = current.slice("--results-dir=".length);
      continue;
    }
    if (current === "--enforce-thresholds") {
      options.enforceThresholds = true;
      continue;
    }
    if (current === "--thresholds") {
      options.thresholdsPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--thresholds=")) {
      options.thresholdsPath = current.slice("--thresholds=".length);
    }
  }

  return options;
}

async function resolveResultsPath(options: ScorecardCliOptions, rootDir: string): Promise<string> {
  if (options.inputPath) {
    return path.resolve(rootDir, options.inputPath);
  }

  const resultsDir = path.resolve(rootDir, options.resultsDir ?? path.join("benchmarks", "results"));
  const latestRunPath = path.join(resultsDir, "latest-run.json");
  const latest = await readJsonFile<{ results_path?: string }>(latestRunPath);
  if (!latest.results_path || typeof latest.results_path !== "string") {
    throw new Error(`Invalid latest-run metadata at ${latestRunPath}.`);
  }

  return path.resolve(latest.results_path);
}

async function runCli(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const resultsPath = await resolveResultsPath(options, rootDir);
  const runResult = await readJsonFile<BenchmarkRunResult>(resultsPath);
  const thresholds = await resolveThresholds(options, rootDir);
  const report: ScorecardReport = {
    run_id: runResult.run_id,
    created_at: new Date().toISOString(),
    preflight: runResult.preflight,
    scorecard: computeScorecard(runResult, thresholds)
  };

  const runDir = path.dirname(resultsPath);
  const resultsDir = path.dirname(runDir);
  await ensureDir(resultsDir);
  await writeJsonStable(path.join(runDir, "scorecard.json"), report);
  await writeJsonStable(path.join(resultsDir, "latest-scorecard.json"), report);
  const markdown = formatScorecardMarkdown(report);
  await writeFile(path.join(resultsDir, "latest.md"), markdown, "utf8");

  console.log(`Run id: ${report.run_id}`);
  console.log(`Success delta: ${toPercent(report.scorecard.success_rate_delta)}`);
  console.log(`Median time delta: ${toSignedPercent(report.scorecard.median_time_delta_pct)}`);
  console.log(`Regression rate: ${toPercent(report.scorecard.regression_rate)}`);
  console.log(`Overall thresholds: ${report.scorecard.thresholds_met.overall ? "pass" : "fail"}`);

  if (options.enforceThresholds && !report.scorecard.thresholds_met.overall) {
    process.exitCode = 1;
  }
}

async function resolveThresholds(
  options: ScorecardCliOptions,
  rootDir: string
): Promise<BenchmarkThresholds> {
  const thresholdPath = path.resolve(
    rootDir,
    options.thresholdsPath ?? path.join("benchmarks", "thresholds.json")
  );

  try {
    const raw = await readJsonFile<unknown>(thresholdPath);
    const validation = validateThresholds(raw);
    if (!validation.valid || !validation.thresholds) {
      throw new Error(validation.errors.join(" "));
    }
    return validation.thresholds;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load thresholds from ${thresholdPath}: ${message}`);
  }
}

export function validateThresholds(value: unknown): {
  valid: boolean;
  errors: string[];
  thresholds?: BenchmarkThresholds;
} {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      valid: false,
      errors: ["Thresholds must be an object."]
    };
  }

  const record = value as Record<string, unknown>;
  const success = asNumber(record.success_rate_delta_min, "success_rate_delta_min", errors);
  const median = asNumber(record.median_time_delta_pct_max, "median_time_delta_pct_max", errors);
  const regression = asNumber(record.regression_rate_max, "regression_rate_max", errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors,
    thresholds: {
      success_rate_delta_min: success as number,
      median_time_delta_pct_max: median as number,
      regression_rate_max: regression as number
    }
  };
}

function asNumber(value: unknown, fieldName: string, errors: string[]): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${fieldName} must be a finite number.`);
    return undefined;
  }
  return value;
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
