export type BenchmarkMode = "codex_native" | "supercodex";

export type BenchmarkCategory =
  | "bugfix"
  | "feature"
  | "refactor"
  | "migration"
  | "review"
  | "debug";

export type VerifyType = "tests" | "command" | "file_assert";
export type ErrorClass = "timeout" | "cli_error" | "verify_fail" | "infra_error";

export interface VerifySpec {
  type: VerifyType;
  target: string | string[];
}

export interface BenchmarkTask {
  id: string;
  title: string;
  category: BenchmarkCategory;
  repo_fixture: string;
  prompt: string;
  setup_cmds?: string[][];
  run_cmd?: string[];
  mode_cmds?: Partial<Record<BenchmarkMode, string[]>>;
  verify: VerifySpec;
  timeout_seconds: number;
  tags?: string[];
  risk_level?: "low" | "medium" | "high";
}

export interface BenchmarkRunConfig {
  seed: string;
  max_parallel: number;
  modes: BenchmarkMode[];
  task_glob: string;
  output_dir: string;
  fail_fast: boolean;
}

export interface ProcessExecutionOptions {
  command: string[];
  cwd: string;
  timeoutSeconds: number;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessExecutionResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  errorMessage?: string;
  command: string[];
}

export interface VerificationResult {
  pass: boolean;
  messages: string[];
}

export interface TaskRunResult {
  task_id: string;
  mode: BenchmarkMode;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  exit_code: number | null;
  pass: boolean;
  verification_pass: boolean;
  artifacts: {
    logs_path: string;
    transcript_path?: string;
    patch_summary_path?: string;
  };
  error_class?: ErrorClass;
  command: string[];
}

export interface BenchmarkRunSummary {
  total: number;
  passed: number;
  failed: number;
  by_mode: Record<BenchmarkMode, { total: number; passed: number; failed: number }>;
}

export interface BenchmarkPreflight {
  codex_cli: "available" | "missing" | "not_required";
  warnings: string[];
}

export interface BenchmarkRunResult {
  run_id: string;
  seed: string;
  started_at: string;
  ended_at: string;
  preflight: BenchmarkPreflight;
  results: TaskRunResult[];
  summary: BenchmarkRunSummary;
}

export interface BenchmarkThresholds {
  success_rate_delta_min: number;
  median_time_delta_pct_max: number;
  regression_rate_max: number;
}

export interface Scorecard {
  success_rate: Record<BenchmarkMode, number>;
  success_rate_delta: number;
  median_duration_ms: Record<BenchmarkMode, number>;
  median_time_delta_pct: number;
  regression_rate: number;
  paired_tasks: number;
  thresholds: BenchmarkThresholds;
  thresholds_met: {
    success_rate_gain_15pct: boolean;
    median_time_gain_25pct: boolean;
    regression_rate_max_5pct: boolean;
    overall: boolean;
  };
}

export interface ScorecardReport {
  run_id: string;
  created_at: string;
  preflight?: BenchmarkPreflight;
  scorecard: Scorecard;
}
