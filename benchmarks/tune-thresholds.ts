import path from "node:path";
import { readdir } from "node:fs/promises";

import { readJsonFile, writeJsonStable } from "./io";
import type { BenchmarkThresholds, ScorecardReport } from "./types";

interface TuneCliOptions {
  rootDir?: string;
  resultsDir?: string;
  thresholdsPath?: string;
  write: boolean;
  allowLoosen: boolean;
  last?: number;
}

interface ObservedMetrics {
  successRateDelta: number;
  medianTimeDeltaPct: number;
  regressionRate: number;
}

export async function tuneThresholds(options: TuneCliOptions = {}): Promise<{
  recommended: BenchmarkThresholds;
  basedOnRuns: number;
  current: BenchmarkThresholds;
  warnings: string[];
}> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const resultsDir = path.resolve(rootDir, options.resultsDir ?? path.join("benchmarks", "results"));
  const thresholdsPath = path.resolve(
    rootDir,
    options.thresholdsPath ?? path.join("benchmarks", "thresholds.json")
  );
  const current = await readJsonFile<BenchmarkThresholds>(thresholdsPath);

  const reports = await loadScorecardReports(resultsDir);
  if (reports.length === 0) {
    throw new Error(`Need at least 1 benchmark scorecard to tune thresholds (found 0).`);
  }
  const warnings: string[] = [];
  let lowConfidence = false;
  if (reports.length < 3) {
    lowConfidence = true;
    warnings.push(
      `Only ${reports.length} scorecard run(s) found. ` +
        "Threshold recommendations are low-confidence until at least 3 runs exist."
    );
  }

  const limited = typeof options.last === "number" && options.last > 0
    ? reports.slice(-options.last)
    : reports;

  const observed = limited.map((report) => ({
    successRateDelta: report.scorecard.success_rate_delta,
    medianTimeDeltaPct: report.scorecard.median_time_delta_pct,
    regressionRate: report.scorecard.regression_rate
  }));

  const recommendedRaw: BenchmarkThresholds = lowConfidence
    ? { ...current }
    : {
        success_rate_delta_min: round(quantile(observed.map((item) => item.successRateDelta), 0.25), 4),
        median_time_delta_pct_max: round(quantile(observed.map((item) => item.medianTimeDeltaPct), 0.75), 2),
        regression_rate_max: round(quantile(observed.map((item) => item.regressionRate), 0.75), 4)
      };

  const recommended = options.allowLoosen
    ? recommendedRaw
    : clampAgainstCurrent(current, recommendedRaw);

  if (options.write) {
    await writeJsonStable(thresholdsPath, recommended);
  }

  return {
    recommended,
    basedOnRuns: limited.length,
    current,
    warnings
  };
}

function clampAgainstCurrent(
  current: BenchmarkThresholds,
  proposed: BenchmarkThresholds
): BenchmarkThresholds {
  return {
    success_rate_delta_min: Math.max(current.success_rate_delta_min, proposed.success_rate_delta_min),
    median_time_delta_pct_max: Math.min(current.median_time_delta_pct_max, proposed.median_time_delta_pct_max),
    regression_rate_max: Math.min(current.regression_rate_max, proposed.regression_rate_max)
  };
}

async function loadScorecardReports(resultsDir: string): Promise<ScorecardReport[]> {
  const entries = await readdir(resultsDir, { withFileTypes: true });
  const runDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resultsDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const reports: ScorecardReport[] = [];
  for (const runDir of runDirs) {
    const scorePath = path.join(runDir, "scorecard.json");
    try {
      const report = await readJsonFile<ScorecardReport>(scorePath);
      reports.push(report);
    } catch {
      // Skip run directories without scorecard output.
    }
  }

  return reports;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseCliArgs(argv: string[]): TuneCliOptions {
  const options: TuneCliOptions = {
    write: false,
    allowLoosen: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--results-dir") {
      options.resultsDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--results-dir=")) {
      options.resultsDir = current.slice("--results-dir=".length);
      continue;
    }
    if (current === "--thresholds") {
      options.thresholdsPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--thresholds=")) {
      options.thresholdsPath = current.slice("--thresholds=".length);
      continue;
    }
    if (current === "--last") {
      options.last = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (current.startsWith("--last=")) {
      options.last = Number(current.slice("--last=".length));
      continue;
    }
    if (current === "--write") {
      options.write = true;
      continue;
    }
    if (current === "--allow-loosen") {
      options.allowLoosen = true;
    }
  }

  return options;
}

async function runCli(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const tuned = await tuneThresholds(options);

  console.log(`Runs analyzed: ${tuned.basedOnRuns}`);
  for (const warning of tuned.warnings) {
    console.warn(`Warning: ${warning}`);
  }
  console.log(`Current success_rate_delta_min: ${tuned.current.success_rate_delta_min}`);
  console.log(`Current median_time_delta_pct_max: ${tuned.current.median_time_delta_pct_max}`);
  console.log(`Current regression_rate_max: ${tuned.current.regression_rate_max}`);
  console.log(`Recommended success_rate_delta_min: ${tuned.recommended.success_rate_delta_min}`);
  console.log(`Recommended median_time_delta_pct_max: ${tuned.recommended.median_time_delta_pct_max}`);
  console.log(`Recommended regression_rate_max: ${tuned.recommended.regression_rate_max}`);
  if (options.write) {
    console.log("Thresholds updated.");
  } else {
    console.log("Dry run only. Use --write to persist.");
  }
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
