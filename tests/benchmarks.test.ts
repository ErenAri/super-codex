import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { runBenchmarkHarness } from "../benchmarks/harness";
import { computeScorecard, validateThresholds } from "../benchmarks/scorecard";
import { tuneThresholds } from "../benchmarks/tune-thresholds";
import type { BenchmarkRunResult } from "../benchmarks/types";
import { validateRunConfig, validateTask } from "../benchmarks/validate";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("benchmark modules", () => {
  it("ships at least 50 starter benchmark tasks", async () => {
    const taskDir = path.resolve(process.cwd(), "benchmarks", "tasks");
    const entries = await readdir(taskDir);
    const taskFiles = entries.filter((entry) => entry.endsWith(".json"));
    expect(taskFiles.length).toBeGreaterThanOrEqual(50);
  });

  it("validates run config and rejects unsupported mode", () => {
    const valid = validateRunConfig({
      seed: "abc",
      max_parallel: 2,
      modes: ["codex_native", "supercodex"],
      task_glob: "benchmarks/tasks/*.json",
      output_dir: "benchmarks/results",
      fail_fast: false
    });
    expect(valid.valid).toBe(true);
    expect(valid.config?.modes).toEqual(["codex_native", "supercodex"]);

    const invalid = validateRunConfig({
      seed: "abc",
      max_parallel: 2,
      modes: ["unknown_mode"],
      task_glob: "benchmarks/tasks/*.json",
      output_dir: "benchmarks/results",
      fail_fast: false
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.join(" ")).toContain("Unsupported mode");
  });

  it("validates task schema with mode commands and verify fields", () => {
    const valid = validateTask({
      id: "sample-task",
      title: "Sample task",
      category: "bugfix",
      repo_fixture: "fixtures/minimal",
      prompt: "Do work",
      mode_cmds: {
        codex_native: ["codex", "--version"],
        supercodex: ["node", "-e", "process.exit(0)"]
      },
      verify: {
        type: "command",
        target: ["node", "-e", "process.exit(0)"]
      },
      timeout_seconds: 30
    });
    expect(valid.valid).toBe(true);

    const invalid = validateTask({
      id: "sample-task-2",
      title: "Sample task 2",
      category: "feature",
      repo_fixture: "fixtures/minimal",
      prompt: "Do work",
      verify: {
        type: "command",
        target: []
      },
      timeout_seconds: 30
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.join(" ")).toContain("verify.target");
  });

  it("runs harness and returns deterministically sorted results", async () => {
    const root = await createTempDir();
    const fixtureDir = path.join(root, "fixture");
    const tasksDir = path.join(root, "tasks");
    const outputDir = path.join(root, "results");

    await mkdir(path.join(fixtureDir, "src"), { recursive: true });
    await writeFile(path.join(fixtureDir, "README.md"), "fixture", "utf8");
    await writeFile(path.join(fixtureDir, "src", "app.ts"), "export const ok = true;\n", "utf8");
    await mkdir(tasksDir, { recursive: true });

    const taskA = {
      id: "task-b",
      title: "Task B",
      category: "bugfix",
      repo_fixture: "fixture",
      prompt: "Task B",
      mode_cmds: {
        codex_native: ["{NODE_PATH}", "-e", "process.exit(0)"],
        supercodex: ["{NODE_PATH}", "-e", "process.exit(0)"]
      },
      verify: {
        type: "file_assert",
        target: ["README.md", "src/app.ts"]
      },
      timeout_seconds: 20
    };
    const taskB = {
      id: "task-a",
      title: "Task A",
      category: "feature",
      repo_fixture: "fixture",
      prompt: "Task A",
      mode_cmds: {
        codex_native: ["{NODE_PATH}", "-e", "process.exit(0)"],
        supercodex: ["{NODE_PATH}", "-e", "process.exit(0)"]
      },
      verify: {
        type: "command",
        target: ["{NODE_PATH}", "-e", "process.exit(0)"]
      },
      timeout_seconds: 20
    };

    await writeFile(path.join(tasksDir, "task-b.json"), `${JSON.stringify(taskA, null, 2)}\n`, "utf8");
    await writeFile(path.join(tasksDir, "task-a.json"), `${JSON.stringify(taskB, null, 2)}\n`, "utf8");

    const configPath = path.join(root, "run-config.json");
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          seed: "deterministic",
          max_parallel: 2,
          modes: ["codex_native", "supercodex"],
          task_glob: "tasks/*.json",
          output_dir: "results",
          fail_fast: false
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    let tick = 0;
    const result = await runBenchmarkHarness({
      rootDir: root,
      configPath,
      runId: "run-001",
      now: () => new Date(1700000000000 + tick++ * 1000)
    });

    expect(result.summary.total).toBe(4);
    expect(result.preflight.codex_cli).toBe("not_required");
    expect(result.results.map((entry) => `${entry.task_id}:${entry.mode}`)).toEqual([
      "task-a:codex_native",
      "task-a:supercodex",
      "task-b:codex_native",
      "task-b:supercodex"
    ]);

    const written = JSON.parse(
      await readFile(path.join(outputDir, "run-001", "results.json"), "utf8")
    ) as BenchmarkRunResult;
    expect(written.run_id).toBe("run-001");
    expect(written.summary.total).toBe(4);
  });

  it("marks missing executable as infra_error without crashing run", async () => {
    const root = await createTempDir();
    const fixtureDir = path.join(root, "fixture");
    const tasksDir = path.join(root, "tasks");
    await mkdir(path.join(fixtureDir, "src"), { recursive: true });
    await writeFile(path.join(fixtureDir, "README.md"), "fixture", "utf8");
    await writeFile(path.join(fixtureDir, "src", "app.ts"), "export const ok = true;\n", "utf8");
    await mkdir(tasksDir, { recursive: true });

    const task = {
      id: "task-missing-cmd",
      title: "Missing executable",
      category: "debug",
      repo_fixture: "fixture",
      prompt: "Missing command test",
      mode_cmds: {
        codex_native: ["does-not-exist-benchmark-cmd", "--version"]
      },
      verify: {
        type: "command",
        target: ["{NODE_PATH}", "-e", "process.exit(0)"]
      },
      timeout_seconds: 10
    };
    await writeFile(path.join(tasksDir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");

    const configPath = path.join(root, "run-config.json");
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          seed: "infra-test",
          max_parallel: 1,
          modes: ["codex_native"],
          task_glob: "tasks/*.json",
          output_dir: "results",
          fail_fast: false
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await runBenchmarkHarness({
      rootDir: root,
      configPath,
      runId: "run-infra"
    });

    expect(result.summary.total).toBe(1);
    expect(result.preflight.codex_cli).toBe("not_required");
    expect(result.results[0].pass).toBe(false);
    expect(result.results[0].error_class).toBe("infra_error");
  });

  it("reports missing codex preflight when codex executable is unavailable", async () => {
    const root = await createTempDir();
    const fixtureDir = path.join(root, "fixture");
    const tasksDir = path.join(root, "tasks");
    await mkdir(path.join(fixtureDir, "src"), { recursive: true });
    await writeFile(path.join(fixtureDir, "README.md"), "fixture", "utf8");
    await writeFile(path.join(fixtureDir, "src", "app.ts"), "export const ok = true;\n", "utf8");
    await mkdir(tasksDir, { recursive: true });

    const task = {
      id: "task-codex-preflight",
      title: "Codex preflight task",
      category: "review",
      repo_fixture: "fixture",
      prompt: "Codex preflight",
      mode_cmds: {
        codex_native: ["codex", "--version"]
      },
      verify: {
        type: "command",
        target: ["{NODE_PATH}", "-e", "process.exit(0)"]
      },
      timeout_seconds: 10
    };
    await writeFile(path.join(tasksDir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");

    const configPath = path.join(root, "run-config.json");
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          seed: "preflight-test",
          max_parallel: 1,
          modes: ["codex_native"],
          task_glob: "tasks/*.json",
          output_dir: "results",
          fail_fast: false
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await runBenchmarkHarness({
      rootDir: root,
      configPath,
      runId: "run-preflight",
      executor: async ({ command }) => {
        if (command[0] === "codex") {
          return {
            ok: false,
            exitCode: null,
            stdout: "",
            stderr: "",
            timedOut: false,
            durationMs: 1,
            errorMessage: "spawn codex ENOENT",
            command
          };
        }

        return {
          ok: true,
          exitCode: 0,
          stdout: "",
          stderr: "",
          timedOut: false,
          durationMs: 1,
          command
        };
      }
    });

    expect(result.preflight.codex_cli).toBe("missing");
    expect(result.preflight.warnings.length).toBeGreaterThan(0);
  });

  it("validates threshold configuration", () => {
    const valid = validateThresholds({
      success_rate_delta_min: 0.2,
      median_time_delta_pct_max: -15,
      regression_rate_max: 0.1
    });
    expect(valid.valid).toBe(true);

    const invalid = validateThresholds({
      success_rate_delta_min: "x",
      median_time_delta_pct_max: -15,
      regression_rate_max: 0.1
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.join(" ")).toContain("success_rate_delta_min");
  });

  it("keeps current thresholds when historical runs are low-confidence", async () => {
    const root = await createTempDir();
    const resultsRoot = path.join(root, "benchmarks", "results");
    const runDir = path.join(resultsRoot, "run-001");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "scorecard.json"),
      `${JSON.stringify(
        {
          run_id: "run-001",
          created_at: "2026-01-01T00:00:00.000Z",
          scorecard: {
            success_rate: { codex_native: 0.4, supercodex: 0.9 },
            success_rate_delta: 0.5,
            median_duration_ms: { codex_native: 1000, supercodex: 1200 },
            median_time_delta_pct: 20,
            regression_rate: 0.02,
            paired_tasks: 10,
            thresholds: {
              success_rate_delta_min: 0.15,
              median_time_delta_pct_max: -25,
              regression_rate_max: 0.05
            },
            thresholds_met: {
              success_rate_gain_15pct: true,
              median_time_gain_25pct: false,
              regression_rate_max_5pct: true,
              overall: false
            }
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const thresholdsPath = path.join(root, "benchmarks", "thresholds.json");
    await mkdir(path.dirname(thresholdsPath), { recursive: true });
    await writeFile(
      thresholdsPath,
      `${JSON.stringify(
        {
          success_rate_delta_min: 0.15,
          median_time_delta_pct_max: -25,
          regression_rate_max: 0.05
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const tuned = await tuneThresholds({
      rootDir: root,
      resultsDir: "benchmarks/results",
      thresholdsPath: "benchmarks/thresholds.json",
      write: false,
      allowLoosen: false
    });

    expect(tuned.basedOnRuns).toBe(1);
    expect(tuned.warnings.length).toBeGreaterThan(0);
    expect(tuned.recommended).toEqual(tuned.current);
  });

  it("computes scorecard metrics from paired results", () => {
    const runResult: BenchmarkRunResult = {
      run_id: "run-score",
      seed: "seed",
      started_at: "2026-01-01T00:00:00.000Z",
      ended_at: "2026-01-01T00:10:00.000Z",
      preflight: {
        codex_cli: "available",
        warnings: []
      },
      summary: {
        total: 4,
        passed: 3,
        failed: 1,
        by_mode: {
          codex_native: { total: 2, passed: 2, failed: 0 },
          supercodex: { total: 2, passed: 1, failed: 1 }
        }
      },
      results: [
        {
          task_id: "task-1",
          mode: "codex_native",
          started_at: "2026-01-01T00:00:00.000Z",
          ended_at: "2026-01-01T00:00:01.000Z",
          duration_ms: 1000,
          exit_code: 0,
          pass: true,
          verification_pass: true,
          artifacts: { logs_path: "a" },
          command: ["codex", "--version"]
        },
        {
          task_id: "task-1",
          mode: "supercodex",
          started_at: "2026-01-01T00:00:00.000Z",
          ended_at: "2026-01-01T00:00:01.000Z",
          duration_ms: 700,
          exit_code: 0,
          pass: true,
          verification_pass: true,
          artifacts: { logs_path: "b" },
          command: ["supercodex", "status", "--json"]
        },
        {
          task_id: "task-2",
          mode: "codex_native",
          started_at: "2026-01-01T00:00:00.000Z",
          ended_at: "2026-01-01T00:00:01.000Z",
          duration_ms: 1000,
          exit_code: 0,
          pass: true,
          verification_pass: true,
          artifacts: { logs_path: "c" },
          command: ["codex", "--version"]
        },
        {
          task_id: "task-2",
          mode: "supercodex",
          started_at: "2026-01-01T00:00:00.000Z",
          ended_at: "2026-01-01T00:00:01.000Z",
          duration_ms: 1300,
          exit_code: 1,
          pass: false,
          verification_pass: false,
          artifacts: { logs_path: "d" },
          error_class: "verify_fail",
          command: ["supercodex", "status", "--json"]
        }
      ]
    };

    const score = computeScorecard(runResult);
    expect(score.success_rate.codex_native).toBe(1);
    expect(score.success_rate.supercodex).toBe(0.5);
    expect(score.success_rate_delta).toBe(-0.5);
    expect(score.regression_rate).toBe(0.5);
    expect(score.thresholds.success_rate_delta_min).toBe(0.15);
    expect(score.thresholds_met.overall).toBe(false);
  });
});

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-bench-test-"));
  tmpDirs.push(root);
  return root;
}
