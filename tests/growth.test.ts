import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildGrowthFunnelReport,
  evaluateGrowthGate,
  loadGrowthExperiments,
  renderGrowthDashboardMarkdown
} from "../src/services/growth";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const tmpDirs: string[] = [];

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describe("growth services", () => {
  it("builds funnel report with week1 retention from metrics events", async () => {
    const root = await createTempDir();
    const codexHome = path.join(root, ".codex");
    const metricsDir = path.join(codexHome, "supercodex");
    const metricsPath = path.join(metricsDir, "metrics.jsonl");
    await mkdir(metricsDir, { recursive: true });

    const records = [
      metric("install_cli_success", "2026-03-01T10:00:00.000Z", "actor-a"),
      metric("start_invoked", "2026-03-01T10:01:00.000Z", "actor-a"),
      metric("command_run_success", "2026-03-01T10:05:00.000Z", "actor-a"),
      metric("command_run_success", "2026-03-10T10:05:00.000Z", "actor-a"),
      metric("install_cli_success", "2026-03-02T08:00:00.000Z", "actor-b"),
      metric("start_invoked", "2026-03-02T08:01:00.000Z", "actor-b"),
      metric("command_run_success", "2026-03-02T08:05:00.000Z", "actor-b")
    ];
    await writeFile(metricsPath, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");

    const report = await buildGrowthFunnelReport({
      codexHome,
      from: "2026-03-01",
      to: "2026-03-20"
    });

    expect(report.actors.install).toBe(2);
    expect(report.actors.start).toBe(2);
    expect(report.actors.first_command).toBe(2);
    expect(report.actors.week1_eligible_starts).toBe(2);
    expect(report.actors.week1_retained).toBe(1);
    expect(report.steps.find((step) => step.step_id === "week1_retention")?.conversion_from_previous).toBe(0.5);
  });

  it("loads experiments and computes summary counts", async () => {
    const root = await createTempDir();
    const experimentsPath = path.join(root, "experiments.json");
    await writeFile(
      experimentsPath,
      JSON.stringify({
        experiments: [
          {
            id: "exp-a",
            title: "A",
            status: "running",
            hypothesis: "h",
            primary_metric: "m",
            start_date: "2026-03-01"
          },
          {
            id: "exp-b",
            title: "B",
            status: "won",
            hypothesis: "h",
            primary_metric: "m",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
            result_summary: "positive"
          }
        ]
      }, null, 2),
      "utf8"
    );

    const report = await loadGrowthExperiments(root, experimentsPath);
    expect(report.total).toBe(2);
    expect(report.running).toBe(1);
    expect(report.completed).toBe(1);
    expect(report.winners).toBe(1);
    expect(report.experiments[0].id).toBe("exp-a");
  });

  it("evaluates growth gate readiness from experiments file", async () => {
    const root = await createTempDir();
    const experimentsPath = path.join(root, "experiments.json");
    await writeFile(
      experimentsPath,
      JSON.stringify({
        experiments: [
          {
            id: "exp-a",
            title: "A",
            status: "running",
            hypothesis: "h",
            primary_metric: "m",
            start_date: "2026-03-01"
          },
          {
            id: "exp-b",
            title: "B",
            status: "completed",
            hypothesis: "h",
            primary_metric: "m",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
            result_summary: "neutral"
          },
          {
            id: "exp-c",
            title: "C",
            status: "won",
            hypothesis: "h",
            primary_metric: "m",
            start_date: "2026-02-15",
            end_date: "2026-02-25",
            result_summary: "positive"
          }
        ]
      }, null, 2),
      "utf8"
    );

    const report = await evaluateGrowthGate({
      projectRoot: root,
      experimentsFile: experimentsPath,
      strict: true
    });

    expect(report.ok).toBe(true);
    expect(report.experiments.total).toBe(3);
    expect(report.experiments.winners).toBe(1);
    expect(report.experiments.active_cycle).toBe(3);
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("renders dashboard markdown with funnel and experiment sections", () => {
    const markdown = renderGrowthDashboardMarkdown(
      {
        generated_at: "2026-03-06T10:00:00.000Z",
        window: {
          from: "2026-02-08",
          to: "2026-03-06",
          days: 28
        },
        events: {
          total: 12,
          by_name: {
            start_invoked: 4
          }
        },
        actors: {
          install: 4,
          start: 3,
          first_command: 2,
          week1_retained: 1,
          week1_eligible_starts: 2
        },
        steps: [
          {
            step_id: "install",
            users: 4,
            conversion_from_previous: null,
            conversion_from_install: 1
          },
          {
            step_id: "start",
            users: 3,
            conversion_from_previous: 0.75,
            conversion_from_install: 0.75
          },
          {
            step_id: "first_command",
            users: 2,
            conversion_from_previous: 2 / 3,
            conversion_from_install: 0.5
          },
          {
            step_id: "week1_retention",
            users: 1,
            conversion_from_previous: 0.5,
            conversion_from_install: 0.25,
            notes: "Eligible starts: 2"
          }
        ]
      },
      {
        source_path: "growth/experiments.json",
        total: 3,
        running: 1,
        completed: 2,
        winners: 1,
        experiments: [
          {
            id: "exp-a",
            title: "Quickstart",
            status: "won",
            hypothesis: "h",
            primary_metric: "install_to_start_rate",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
            result_summary: "improved"
          }
        ]
      }
    );

    expect(markdown).toContain("# Growth Dashboard");
    expect(markdown).toContain("Funnel Conversion");
    expect(markdown).toContain("Experiment Tracker");
    expect(markdown).toContain("exp-a - Quickstart");
  });
});

function metric(event: string, at: string, actorId: string): Record<string, unknown> {
  return {
    schema_version: 1,
    event,
    at,
    actor_id: actorId
  };
}

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-growth-test-"));
  tmpDirs.push(root);
  return root;
}
