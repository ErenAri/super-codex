import path from "node:path";
import os from "node:os";
import { cp, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";

import { runProcessCommand } from "./executor";
import { ensureDir, readJsonFile, writeJsonStable } from "./io";
import type {
  BenchmarkPreflight,
  BenchmarkMode,
  BenchmarkRunConfig,
  BenchmarkRunResult,
  BenchmarkRunSummary,
  BenchmarkTask,
  ProcessExecutionOptions,
  ProcessExecutionResult,
  TaskRunResult
} from "./types";
import { validateRunConfig, validateTask } from "./validate";
import { verifyTask } from "./verify";

export interface HarnessCliOptions {
  configPath?: string;
  rootDir?: string;
  runId?: string;
}

export interface HarnessRunOptions {
  configPath?: string;
  rootDir?: string;
  runId?: string;
  now?: () => Date;
  executor?: (options: ProcessExecutionOptions) => Promise<ProcessExecutionResult>;
}

interface TaskJob {
  task: BenchmarkTask;
  mode: BenchmarkMode;
}

export async function runBenchmarkHarness(options: HarnessRunOptions = {}): Promise<BenchmarkRunResult> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const configPath = path.resolve(options.configPath ?? path.join(rootDir, "benchmarks", "run-config.json"));
  const now = options.now ?? (() => new Date());
  const executor = options.executor ?? runProcessCommand;

  const configRaw = await readJsonFile<unknown>(configPath);
  const configValidation = validateRunConfig(configRaw);
  if (!configValidation.valid || !configValidation.config) {
    throw new Error(`Invalid run config at ${configPath}: ${configValidation.errors.join(" ")}`);
  }
  const config = configValidation.config;

  const tasks = await loadTasks(config.task_glob, rootDir);
  const preflight = await runPreflightChecks({
    tasks,
    config,
    rootDir,
    executor
  });
  const runId = options.runId ?? createRunId(config.seed, now());
  const outputRoot = path.resolve(rootDir, config.output_dir);
  const runDir = path.join(outputRoot, runId);
  const artifactsDir = path.join(runDir, "artifacts");
  const workspacesRoot = path.join(runDir, "workspaces");

  await ensureDir(artifactsDir);
  await ensureDir(workspacesRoot);

  const startedAt = now();
  const jobs = buildJobs(tasks, config);
  const results = await executeJobs({
    jobs,
    config,
    rootDir,
    runDir,
    artifactsDir,
    workspacesRoot,
    now,
    executor
  });
  const sortedResults = sortResults(results);
  const endedAt = now();
  const summary = buildSummary(sortedResults);

  const result: BenchmarkRunResult = {
    run_id: runId,
    seed: config.seed,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    preflight,
    results: sortedResults,
    summary
  };

  const resultsPath = path.join(runDir, "results.json");
  await writeJsonStable(path.join(runDir, "preflight.json"), preflight);
  await writeJsonStable(resultsPath, result);
  await writeJsonStable(path.join(outputRoot, "latest-run.json"), {
    run_id: runId,
    results_path: resultsPath,
    updated_at: endedAt.toISOString()
  });

  return result;
}

async function runPreflightChecks(options: {
  tasks: BenchmarkTask[];
  config: BenchmarkRunConfig;
  rootDir: string;
  executor: (options: ProcessExecutionOptions) => Promise<ProcessExecutionResult>;
}): Promise<BenchmarkPreflight> {
  const warnings: string[] = [];
  const needsCodex =
    options.config.modes.includes("codex_native") &&
    options.tasks.some((task) => taskInvokesCodex(task, "codex_native"));

  if (!needsCodex) {
    return {
      codex_cli: "not_required",
      warnings
    };
  }

  const availability = await options.executor({
    command: ["codex", "--version"],
    cwd: options.rootDir,
    timeoutSeconds: 15
  });

  if (availability.ok) {
    return {
      codex_cli: "available",
      warnings
    };
  }

  warnings.push(
    "Codex CLI was not available during preflight for codex_native mode. " +
      "Baseline task runs may report infra_error."
  );
  console.warn(`[bench preflight] ${warnings[0]}`);

  return {
    codex_cli: "missing",
    warnings
  };
}

function taskInvokesCodex(task: BenchmarkTask, mode: BenchmarkMode): boolean {
  const command = resolveModeCommand(task, mode);
  if (!command || command.length === 0) {
    return false;
  }

  return command[0].trim().toLowerCase() === "codex";
}

export async function loadTasks(taskGlob: string, rootDir: string): Promise<BenchmarkTask[]> {
  const taskPaths = await resolveTaskPaths(taskGlob, rootDir);
  if (taskPaths.length === 0) {
    throw new Error(`No benchmark task files matched "${taskGlob}".`);
  }

  const tasks: BenchmarkTask[] = [];
  const seen = new Set<string>();
  for (const taskPath of taskPaths) {
    const rawTask = await readJsonFile<unknown>(taskPath);
    const taskValidation = validateTask(rawTask);
    if (!taskValidation.valid || !taskValidation.task) {
      throw new Error(`Invalid task file "${taskPath}": ${taskValidation.errors.join(" ")}`);
    }

    if (seen.has(taskValidation.task.id)) {
      throw new Error(`Duplicate benchmark task id "${taskValidation.task.id}" in "${taskPath}".`);
    }
    seen.add(taskValidation.task.id);
    tasks.push(taskValidation.task);
  }

  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

function buildJobs(tasks: BenchmarkTask[], config: BenchmarkRunConfig): TaskJob[] {
  const jobs: TaskJob[] = [];
  for (const task of tasks) {
    for (const mode of config.modes) {
      jobs.push({ task, mode });
    }
  }
  return jobs;
}

async function executeJobs(options: {
  jobs: TaskJob[];
  config: BenchmarkRunConfig;
  rootDir: string;
  runDir: string;
  artifactsDir: string;
  workspacesRoot: string;
  now: () => Date;
  executor: (options: ProcessExecutionOptions) => Promise<ProcessExecutionResult>;
}): Promise<TaskRunResult[]> {
  const results: TaskRunResult[] = [];
  let cursor = 0;
  let shouldStop = false;

  const worker = async () => {
    while (true) {
      if (shouldStop && options.config.fail_fast) {
        return;
      }
      const index = cursor;
      cursor += 1;
      if (index >= options.jobs.length) {
        return;
      }

      const job = options.jobs[index];
      const result = await runSingleJob({
        ...options,
        task: job.task,
        mode: job.mode
      });
      results.push(result);
      if (!result.pass && options.config.fail_fast) {
        shouldStop = true;
      }
    }
  };

  const workerCount = Math.max(1, options.config.max_parallel);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function runSingleJob(options: {
  task: BenchmarkTask;
  mode: BenchmarkMode;
  rootDir: string;
  runDir: string;
  artifactsDir: string;
  workspacesRoot: string;
  now: () => Date;
  executor: (options: ProcessExecutionOptions) => Promise<ProcessExecutionResult>;
}): Promise<TaskRunResult> {
  const startedAt = options.now();
  const safeTaskId = sanitizeName(options.task.id);
  const jobArtifactDir = path.join(options.artifactsDir, safeTaskId, options.mode);
  await ensureDir(jobArtifactDir);
  const logPath = path.join(jobArtifactDir, "run.log");
  const taskResultPath = path.join(jobArtifactDir, "result.json");

  const workspaceResult = await prepareWorkspace({
    fixturePath: path.resolve(options.rootDir, options.task.repo_fixture),
    workspacesRoot: options.workspacesRoot,
    taskId: safeTaskId,
    mode: options.mode
  });

  if (!workspaceResult.ok || !workspaceResult.workspacePath) {
    const endedAt = options.now();
    const result: TaskRunResult = {
      task_id: options.task.id,
      mode: options.mode,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      exit_code: null,
      pass: false,
      verification_pass: false,
      artifacts: { logs_path: logPath },
      error_class: "infra_error",
      command: [],
    };
    await writeFile(logPath, `${workspaceResult.error}\n`, "utf8");
    await writeJsonStable(taskResultPath, result);
    return result;
  }

  const workspace = workspaceResult.workspacePath;
  const expandToken = (value: string): string =>
    value
      .replaceAll("{REPO_ROOT}", options.rootDir)
      .replaceAll("{WORKSPACE}", workspace)
      .replaceAll("{TASK_PROMPT}", options.task.prompt)
      .replaceAll("{NODE_PATH}", process.execPath);

  const logs: string[] = [];
  logs.push(`Task: ${options.task.id}`);
  logs.push(`Mode: ${options.mode}`);
  logs.push(`Workspace: ${workspace}`);

  for (const setupCommand of options.task.setup_cmds ?? []) {
    const expandedSetup = setupCommand.map(expandToken);
    logs.push(`Setup: ${expandedSetup.join(" ")}`);
    const setupResult = await options.executor({
      command: expandedSetup,
      cwd: workspace,
      timeoutSeconds: options.task.timeout_seconds
    });
    logs.push(setupResult.stdout);
    logs.push(setupResult.stderr);

    if (!setupResult.ok) {
      const endedAt = options.now();
      const errorClass = setupResult.timedOut
        ? "timeout"
        : setupResult.errorMessage
          ? "infra_error"
          : "cli_error";
      const result: TaskRunResult = {
        task_id: options.task.id,
        mode: options.mode,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_ms: endedAt.getTime() - startedAt.getTime(),
        exit_code: setupResult.exitCode,
        pass: false,
        verification_pass: false,
        artifacts: { logs_path: logPath },
        error_class: errorClass,
        command: expandedSetup
      };
      await writeFile(logPath, logs.filter((item) => item.trim().length > 0).join("\n"), "utf8");
      await writeJsonStable(taskResultPath, result);
      await safeCleanupWorkspace(workspace);
      return result;
    }
  }

  const command = resolveModeCommand(options.task, options.mode);
  if (!command) {
    const endedAt = options.now();
    const result: TaskRunResult = {
      task_id: options.task.id,
      mode: options.mode,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      exit_code: null,
      pass: false,
      verification_pass: false,
      artifacts: { logs_path: logPath },
      error_class: "infra_error",
      command: []
    };
    logs.push("No run command configured for mode.");
    await writeFile(logPath, logs.join("\n"), "utf8");
    await writeJsonStable(taskResultPath, result);
    await safeCleanupWorkspace(workspace);
    return result;
  }

  const expandedCommand = command.map(expandToken);
  logs.push(`Run: ${expandedCommand.join(" ")}`);
  const commandResult = await options.executor({
    command: expandedCommand,
    cwd: workspace,
    timeoutSeconds: options.task.timeout_seconds
  });
  logs.push(commandResult.stdout);
  logs.push(commandResult.stderr);

  if (!commandResult.ok) {
    const endedAt = options.now();
    const errorClass = commandResult.timedOut
      ? "timeout"
      : commandResult.errorMessage
        ? "infra_error"
        : "cli_error";
    const result: TaskRunResult = {
      task_id: options.task.id,
      mode: options.mode,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      exit_code: commandResult.exitCode,
      pass: false,
      verification_pass: false,
      artifacts: { logs_path: logPath },
      error_class: errorClass,
      command: expandedCommand
    };
    await writeFile(logPath, logs.filter((item) => item.trim().length > 0).join("\n"), "utf8");
    await writeJsonStable(taskResultPath, result);
    await safeCleanupWorkspace(workspace);
    return result;
  }

  const verification = await verifyTask({
    task: options.task,
    workspace,
    timeoutSeconds: options.task.timeout_seconds,
    expandTokens: expandToken,
    executeCommand: options.executor
  });
  logs.push(`Verification: ${verification.pass ? "pass" : "fail"}`);
  for (const message of verification.messages) {
    logs.push(message);
  }

  const endedAt = options.now();
  const success = verification.pass;
  const finalResult: TaskRunResult = {
    task_id: options.task.id,
    mode: options.mode,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    exit_code: commandResult.exitCode,
    pass: success,
    verification_pass: verification.pass,
    artifacts: { logs_path: logPath },
    ...(success ? {} : { error_class: "verify_fail" as const }),
    command: expandedCommand
  };

  await writeFile(logPath, logs.filter((item) => item.trim().length > 0).join("\n"), "utf8");
  await writeJsonStable(taskResultPath, finalResult);
  await safeCleanupWorkspace(workspace);
  return finalResult;
}

function resolveModeCommand(task: BenchmarkTask, mode: BenchmarkMode): string[] | null {
  if (task.mode_cmds?.[mode] && task.mode_cmds[mode]!.length > 0) {
    return task.mode_cmds[mode] as string[];
  }
  if (task.run_cmd && task.run_cmd.length > 0) {
    return task.run_cmd;
  }
  return null;
}

async function prepareWorkspace(options: {
  fixturePath: string;
  workspacesRoot: string;
  taskId: string;
  mode: BenchmarkMode;
}): Promise<{ ok: true; workspacePath: string } | { ok: false; error: string }> {
  const fixtureExists = await pathExists(options.fixturePath);
  if (!fixtureExists) {
    return {
      ok: false,
      error: `Fixture path not found: ${options.fixturePath}`
    };
  }

  const fixtureStats = await stat(options.fixturePath);
  if (!fixtureStats.isDirectory()) {
    return {
      ok: false,
      error: `Fixture path must be a directory: ${options.fixturePath}`
    };
  }

  const tempRoot = await mkdtemp(path.join(options.workspacesRoot, `${options.taskId}-${options.mode}-`));
  await cp(options.fixturePath, tempRoot, {
    recursive: true,
    force: true
  });

  return {
    ok: true,
    workspacePath: tempRoot
  };
}

function buildSummary(results: TaskRunResult[]): BenchmarkRunSummary {
  const byMode: BenchmarkRunSummary["by_mode"] = {
    codex_native: { total: 0, passed: 0, failed: 0 },
    supercodex: { total: 0, passed: 0, failed: 0 }
  };

  for (const result of results) {
    const modeSummary = byMode[result.mode];
    modeSummary.total += 1;
    if (result.pass) {
      modeSummary.passed += 1;
    } else {
      modeSummary.failed += 1;
    }
  }

  const total = results.length;
  const passed = results.filter((entry) => entry.pass).length;
  const failed = total - passed;

  return {
    total,
    passed,
    failed,
    by_mode: byMode
  };
}

function sortResults(results: TaskRunResult[]): TaskRunResult[] {
  return [...results].sort((a, b) => {
    const taskOrder = a.task_id.localeCompare(b.task_id);
    if (taskOrder !== 0) {
      return taskOrder;
    }
    return a.mode.localeCompare(b.mode);
  });
}

async function resolveTaskPaths(taskGlob: string, rootDir: string): Promise<string[]> {
  const normalized = taskGlob.replaceAll("\\", "/");
  const absolutePattern = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(rootDir, normalized);

  if (!absolutePattern.includes("*")) {
    if (await isDirectory(absolutePattern)) {
      const files = await readdir(absolutePattern);
      return files
        .filter((name) => name.endsWith(".json"))
        .map((name) => path.join(absolutePattern, name))
        .sort();
    }
    return [absolutePattern];
  }

  if (absolutePattern.includes("**")) {
    const [basePart] = absolutePattern.split("**");
    const baseDir = basePart.endsWith(path.sep) ? basePart.slice(0, -1) : basePart;
    const allFiles = await walkFiles(baseDir || rootDir);
    return allFiles.filter((filePath) => filePath.endsWith(".json")).sort();
  }

  const directory = path.dirname(absolutePattern);
  const patternName = path.basename(absolutePattern);
  const regex = wildcardToRegExp(patternName);
  const files = await readdir(directory);
  return files
    .filter((fileName) => regex.test(fileName))
    .map((fileName) => path.join(directory, fileName))
    .sort();
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const withWildcard = escaped.replaceAll("*", ".*");
  return new RegExp(`^${withWildcard}$`);
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const fileStats = await stat(targetPath);
    return fileStats.isDirectory();
  } catch {
    return false;
  }
}

function createRunId(seed: string, now: Date): string {
  const timestamp = now.toISOString().replaceAll(":", "").replaceAll("-", "").replaceAll(".", "");
  const safeSeed = sanitizeName(seed);
  return `${timestamp}-${safeSeed}`;
}

function sanitizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function safeCleanupWorkspace(workspacePath: string): Promise<void> {
  if (workspacePath.startsWith(path.join(os.tmpdir(), "")) || workspacePath.includes(`${path.sep}workspaces${path.sep}`)) {
    await rm(workspacePath, { recursive: true, force: true });
  }
}

function parseCliArgs(argv: string[]): HarnessCliOptions {
  const options: HarnessCliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--config") {
      options.configPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--config=")) {
      options.configPath = current.slice("--config=".length);
      continue;
    }
    if (current === "--root") {
      options.rootDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--root=")) {
      options.rootDir = current.slice("--root=".length);
      continue;
    }
    if (current === "--run-id") {
      options.runId = argv[index + 1];
      index += 1;
      continue;
    }
    if (current.startsWith("--run-id=")) {
      options.runId = current.slice("--run-id=".length);
    }
  }

  return options;
}

async function runCli(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const result = await runBenchmarkHarness(options);
  console.log(`Run id: ${result.run_id}`);
  console.log(`Total: ${result.summary.total}`);
  console.log(`Passed: ${result.summary.passed}`);
  console.log(`Failed: ${result.summary.failed}`);
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
