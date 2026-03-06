import path from "node:path";
import { readdir, stat, writeFile } from "node:fs/promises";

import { ensureDir, readJsonFile, writeJsonStable } from "./io";
import type { ScorecardReport } from "./types";

export type DiffStatus = "insufficient_data" | "improved" | "regressed" | "mixed" | "stable";

export interface MetricDelta {
  metric: string;
  current: number;
  baseline: number;
  delta: number;
  direction: "higher_is_better" | "lower_is_better";
  verdict: "improved" | "regressed" | "unchanged";
}

export interface ScorecardDiffSummary {
  status: DiffStatus;
  improved: number;
  regressed: number;
  unchanged: number;
}

export interface ScorecardDiffReport {
  generated_at: string;
  current: {
    path: string;
    run_id: string;
    created_at: string;
  };
  baseline: {
    path: string;
    run_id: string;
    created_at: string;
  } | null;
  summary: ScorecardDiffSummary;
  metrics: MetricDelta[];
}

interface ScorecardDiffCliOptions {
  resultsDir?: string;
  currentPath?: string;
  baselinePath?: string;
  outputJsonPath?: string;
  outputMarkdownPath?: string;
  failOnRegression: boolean;
}

export function compareScorecards(current: ScorecardReport, baseline: ScorecardReport): MetricDelta[] {
  const metrics: MetricDelta[] = [
    buildMetricDelta(
      "success_rate_delta",
      current.scorecard.success_rate_delta,
      baseline.scorecard.success_rate_delta,
      "higher_is_better"
    ),
    buildMetricDelta(
      "median_time_delta_pct",
      current.scorecard.median_time_delta_pct,
      baseline.scorecard.median_time_delta_pct,
      "lower_is_better"
    ),
    buildMetricDelta(
      "regression_rate",
      current.scorecard.regression_rate,
      baseline.scorecard.regression_rate,
      "lower_is_better"
    )
  ];

  return metrics;
}

export function summarizeDiff(metrics: MetricDelta[]): ScorecardDiffSummary {
  const improved = metrics.filter((metric) => metric.verdict === "improved").length;
  const regressed = metrics.filter((metric) => metric.verdict === "regressed").length;
  const unchanged = metrics.filter((metric) => metric.verdict === "unchanged").length;

  if (metrics.length === 0) {
    return {
      status: "insufficient_data",
      improved,
      regressed,
      unchanged
    };
  }

  if (regressed > 0 && improved === 0) {
    return {
      status: "regressed",
      improved,
      regressed,
      unchanged
    };
  }
  if (improved > 0 && regressed === 0) {
    return {
      status: "improved",
      improved,
      regressed,
      unchanged
    };
  }
  if (improved > 0 && regressed > 0) {
    return {
      status: "mixed",
      improved,
      regressed,
      unchanged
    };
  }

  return {
    status: "stable",
    improved,
    regressed,
    unchanged
  };
}

export function formatScorecardDiffMarkdown(report: ScorecardDiffReport): string {
  const lines: string[] = [];
  lines.push("# Benchmark Scorecard Diff");
  lines.push("");
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Current run: \`${report.current.run_id}\``);

  if (report.baseline) {
    lines.push(`Baseline run: \`${report.baseline.run_id}\``);
    lines.push("");
    lines.push("| Metric | Current | Baseline | Delta | Verdict |");
    lines.push("| --- | ---: | ---: | ---: | --- |");
    for (const metric of report.metrics) {
      lines.push(
        `| ${metric.metric} | ${formatMetricValue(metric.metric, metric.current)} | ` +
          `${formatMetricValue(metric.metric, metric.baseline)} | ` +
          `${formatSigned(metric.metric, metric.delta)} | ${metric.verdict} |`
      );
    }
  } else {
    lines.push("Baseline run: _not available_");
    lines.push("");
    lines.push("No baseline scorecard was found. This artifact is still emitted for traceability.");
  }

  lines.push("");
  lines.push(`Summary status: **${report.summary.status.toUpperCase()}**`);
  lines.push(
    `Improved: ${report.summary.improved}, Regressed: ${report.summary.regressed}, ` +
      `Unchanged: ${report.summary.unchanged}`
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function buildMetricDelta(
  metric: string,
  current: number,
  baseline: number,
  direction: "higher_is_better" | "lower_is_better"
): MetricDelta {
  const delta = current - baseline;
  const epsilon = 1e-9;
  let verdict: MetricDelta["verdict"] = "unchanged";

  if (Math.abs(delta) > epsilon) {
    if (direction === "higher_is_better") {
      verdict = delta > 0 ? "improved" : "regressed";
    } else {
      verdict = delta < 0 ? "improved" : "regressed";
    }
  }

  return {
    metric,
    current,
    baseline,
    delta,
    direction,
    verdict
  };
}

function parseCliArgs(argv: string[]): ScorecardDiffCliOptions {
  const options: ScorecardDiffCliOptions = {
    failOnRegression: false
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
    if (current === "--current") {
      options.currentPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--current=")) {
      options.currentPath = current.slice("--current=".length);
      continue;
    }
    if (current === "--baseline") {
      options.baselinePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--baseline=")) {
      options.baselinePath = current.slice("--baseline=".length);
      continue;
    }
    if (current === "--output-json") {
      options.outputJsonPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--output-json=")) {
      options.outputJsonPath = current.slice("--output-json=".length);
      continue;
    }
    if (current === "--output-md") {
      options.outputMarkdownPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--output-md=")) {
      options.outputMarkdownPath = current.slice("--output-md=".length);
      continue;
    }
    if (current === "--fail-on-regression") {
      options.failOnRegression = true;
      continue;
    }
  }

  return options;
}

async function runCli(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const resultsDir = path.resolve(rootDir, options.resultsDir ?? path.join("benchmarks", "results"));
  const currentPath = path.resolve(resultsDir, options.currentPath ?? "latest-scorecard.json");
  const outputJsonPath = path.resolve(resultsDir, options.outputJsonPath ?? "latest-diff.json");
  const outputMarkdownPath = path.resolve(resultsDir, options.outputMarkdownPath ?? "latest-diff.md");

  const current = await readJsonFile<ScorecardReport>(currentPath);
  const baselineResolvedPath = options.baselinePath
    ? path.resolve(rootDir, options.baselinePath)
    : await resolvePreviousScorecardPath(resultsDir, current.run_id);
  const baseline = baselineResolvedPath
    ? await readJsonFile<ScorecardReport>(baselineResolvedPath)
    : null;

  const metrics = baseline ? compareScorecards(current, baseline) : [];
  const summary = baseline
    ? summarizeDiff(metrics)
    : {
        status: "insufficient_data" as const,
        improved: 0,
        regressed: 0,
        unchanged: 0
      };

  const report: ScorecardDiffReport = {
    generated_at: new Date().toISOString(),
    current: {
      path: currentPath,
      run_id: current.run_id,
      created_at: current.created_at
    },
    baseline: baseline
      ? {
          path: baselineResolvedPath as string,
          run_id: baseline.run_id,
          created_at: baseline.created_at
        }
      : null,
    summary,
    metrics
  };

  await writeJsonStable(outputJsonPath, report);
  const markdown = formatScorecardDiffMarkdown(report);
  await ensureDir(path.dirname(outputMarkdownPath));
  await writeFile(outputMarkdownPath, markdown, "utf8");

  console.log(`Current run: ${current.run_id}`);
  console.log(`Baseline run: ${baseline?.run_id ?? "none"}`);
  console.log(`Diff status: ${report.summary.status}`);
  console.log(`Diff JSON: ${outputJsonPath}`);
  console.log(`Diff Markdown: ${outputMarkdownPath}`);

  if (options.failOnRegression && report.summary.status === "regressed") {
    process.exitCode = 1;
  }
}

async function resolvePreviousScorecardPath(resultsDir: string, currentRunId: string): Promise<string | null> {
  const entries = await readdir(resultsDir, { withFileTypes: true });
  const candidates: Array<{ path: string; mtimeMs: number; runId: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const scorecardPath = path.join(resultsDir, entry.name, "scorecard.json");
    try {
      const fileStats = await stat(scorecardPath);
      const report = await readJsonFile<ScorecardReport>(scorecardPath);
      if (report.run_id === currentRunId) {
        continue;
      }
      candidates.push({
        path: scorecardPath,
        mtimeMs: fileStats.mtimeMs,
        runId: report.run_id
      });
    } catch {
      continue;
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || b.runId.localeCompare(a.runId));
  return candidates[0].path;
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === "median_time_delta_pct") {
    return `${value.toFixed(2)}%`;
  }
  if (metric === "regression_rate" || metric === "success_rate_delta") {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(4);
}

function formatSigned(metric: string, value: number): string {
  const prefix = value > 0 ? "+" : "";
  if (metric === "median_time_delta_pct") {
    return `${prefix}${value.toFixed(2)}%`;
  }
  if (metric === "regression_rate" || metric === "success_rate_delta") {
    return `${prefix}${(value * 100).toFixed(2)}%`;
  }
  return `${prefix}${value.toFixed(4)}`;
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
