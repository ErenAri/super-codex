import path from "node:path";
import { readFile } from "node:fs/promises";

import { isPlainObject, pathExists } from "../fs-utils";
import { type MetricRecord, readMetricEvents } from "./metrics";

const INSTALL_EVENTS = new Set(["install_success", "install_cli_success"]);
const START_EVENTS = new Set(["start_invoked"]);
const FIRST_COMMAND_EVENTS = new Set(["first_command_success", "command_run_success", "alias_run_success"]);

export interface GrowthFunnelOptions {
  codexHome?: string;
  from?: string;
  to?: string;
  windowDays?: number;
  now?: Date;
}

export interface GrowthFunnelStep {
  step_id: "install" | "start" | "first_command" | "week1_retention";
  users: number;
  conversion_from_previous: number | null;
  conversion_from_install: number | null;
  notes?: string;
}

export interface GrowthFunnelReport {
  generated_at: string;
  window: {
    from: string;
    to: string;
    days: number;
  };
  events: {
    total: number;
    by_name: Record<string, number>;
  };
  actors: {
    install: number;
    start: number;
    first_command: number;
    week1_retained: number;
    week1_eligible_starts: number;
  };
  steps: GrowthFunnelStep[];
}

export type GrowthExperimentStatus = "planned" | "running" | "completed" | "won" | "lost";

export interface GrowthExperiment {
  id: string;
  title: string;
  status: GrowthExperimentStatus;
  hypothesis: string;
  primary_metric: string;
  start_date: string;
  end_date?: string;
  result_summary?: string;
}

export interface GrowthExperimentReport {
  source_path: string;
  total: number;
  running: number;
  completed: number;
  winners: number;
  experiments: GrowthExperiment[];
}

export type GrowthGateStatus = "pass" | "warn" | "fail";

export interface GrowthGateCheck {
  id: string;
  title: string;
  status: GrowthGateStatus;
  details: string[];
}

export interface GrowthGateOptions {
  projectRoot?: string;
  experimentsFile?: string;
  minExperiments?: number;
  strict?: boolean;
}

export interface GrowthGateReport {
  ok: boolean;
  strict: boolean;
  score: number;
  checks: GrowthGateCheck[];
  experiments: {
    source_path: string;
    total: number;
    running: number;
    completed: number;
    winners: number;
    active_cycle: number;
  };
}

export async function buildGrowthFunnelReport(options: GrowthFunnelOptions = {}): Promise<GrowthFunnelReport> {
  const window = resolveGrowthWindow(options);
  const events = await readMetricEvents({
    codexHome: options.codexHome,
    from: window.from,
    to: window.to
  });

  const byName: Record<string, number> = {};
  const byActor = new Map<string, {
    installAt: number | null;
    startAt: number | null;
    firstCommandAt: number | null;
    lastAt: number | null;
  }>();

  for (const event of events) {
    byName[event.event] = (byName[event.event] ?? 0) + 1;
    const timestamp = Date.parse(event.at);
    if (Number.isNaN(timestamp)) {
      continue;
    }

    const actorId = normalizeActorId(event);
    const actorState = byActor.get(actorId) ?? {
      installAt: null,
      startAt: null,
      firstCommandAt: null,
      lastAt: null
    };

    actorState.lastAt = actorState.lastAt === null
      ? timestamp
      : Math.max(actorState.lastAt, timestamp);

    if (INSTALL_EVENTS.has(event.event)) {
      actorState.installAt = actorState.installAt === null
        ? timestamp
        : Math.min(actorState.installAt, timestamp);
    }

    if (START_EVENTS.has(event.event)) {
      actorState.startAt = actorState.startAt === null
        ? timestamp
        : Math.min(actorState.startAt, timestamp);
    }

    if (FIRST_COMMAND_EVENTS.has(event.event)) {
      actorState.firstCommandAt = actorState.firstCommandAt === null
        ? timestamp
        : Math.min(actorState.firstCommandAt, timestamp);
    }

    byActor.set(actorId, actorState);
  }

  const installActors = new Set<string>();
  const startActors = new Set<string>();
  const firstCommandActors = new Set<string>();
  const eligibleWeek1Actors = new Set<string>();
  const retainedWeek1Actors = new Set<string>();
  const retentionCutoff = Date.parse(`${window.to}T23:59:59.999Z`);

  for (const [actorId, state] of byActor.entries()) {
    if (state.installAt !== null) {
      installActors.add(actorId);
    }
    if (state.startAt !== null) {
      startActors.add(actorId);
    }
    if (state.firstCommandAt !== null) {
      firstCommandActors.add(actorId);
    }

    if (state.startAt === null) {
      continue;
    }

    const week1Timestamp = state.startAt + 7 * 24 * 60 * 60 * 1000;
    if (week1Timestamp <= retentionCutoff) {
      eligibleWeek1Actors.add(actorId);
      if (state.lastAt !== null && state.lastAt >= week1Timestamp) {
        retainedWeek1Actors.add(actorId);
      }
    }
  }

  const installCount = installActors.size;
  const startCount = startActors.size;
  const firstCommandCount = firstCommandActors.size;
  const eligibleWeek1Count = eligibleWeek1Actors.size;
  const retainedWeek1Count = retainedWeek1Actors.size;

  return {
    generated_at: new Date().toISOString(),
    window,
    events: {
      total: events.length,
      by_name: Object.keys(byName)
        .sort((left, right) => left.localeCompare(right))
        .reduce<Record<string, number>>((acc, key) => {
          acc[key] = byName[key];
          return acc;
        }, {})
    },
    actors: {
      install: installCount,
      start: startCount,
      first_command: firstCommandCount,
      week1_retained: retainedWeek1Count,
      week1_eligible_starts: eligibleWeek1Count
    },
    steps: [
      {
        step_id: "install",
        users: installCount,
        conversion_from_previous: null,
        conversion_from_install: installCount > 0 ? 1 : null
      },
      {
        step_id: "start",
        users: startCount,
        conversion_from_previous: ratio(startCount, installCount),
        conversion_from_install: ratio(startCount, installCount)
      },
      {
        step_id: "first_command",
        users: firstCommandCount,
        conversion_from_previous: ratio(firstCommandCount, startCount),
        conversion_from_install: ratio(firstCommandCount, installCount)
      },
      {
        step_id: "week1_retention",
        users: retainedWeek1Count,
        conversion_from_previous: ratio(retainedWeek1Count, eligibleWeek1Count),
        conversion_from_install: ratio(retainedWeek1Count, installCount),
        notes: `Eligible starts: ${eligibleWeek1Count}`
      }
    ]
  };
}

export async function loadGrowthExperiments(
  projectRoot = process.cwd(),
  filePath?: string
): Promise<GrowthExperimentReport> {
  const sourcePath = filePath
    ? path.resolve(projectRoot, filePath)
    : path.resolve(projectRoot, "growth", "experiments.json");

  if (!(await pathExists(sourcePath))) {
    return {
      source_path: sourcePath,
      total: 0,
      running: 0,
      completed: 0,
      winners: 0,
      experiments: []
    };
  }

  const raw = await readFile(sourcePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to parse growth experiments file ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const rows = parseExperimentsPayload(parsed, sourcePath);
  const experiments = rows
    .map((row, index) => parseExperimentRow(row, sourcePath, index))
    .sort((left, right) => right.start_date.localeCompare(left.start_date));

  const running = experiments.filter((experiment) => experiment.status === "running").length;
  const completed = experiments.filter((experiment) =>
    experiment.status === "completed" || experiment.status === "won" || experiment.status === "lost"
  ).length;
  const winners = experiments.filter((experiment) => experiment.status === "won").length;

  return {
    source_path: sourcePath,
    total: experiments.length,
    running,
    completed,
    winners,
    experiments
  };
}

export async function evaluateGrowthGate(options: GrowthGateOptions = {}): Promise<GrowthGateReport> {
  const strict = Boolean(options.strict);
  const minExperiments = normalizeMinimum(options.minExperiments);
  const experiments = await loadGrowthExperiments(
    options.projectRoot ?? process.cwd(),
    options.experimentsFile
  );
  const activeCycle = experiments.experiments.filter((entry) => entry.status !== "planned").length;

  const checks: GrowthGateCheck[] = [];

  checks.push({
    id: "experiments.minimum",
    title: "Minimum experiment count",
    status: experiments.total >= minExperiments ? "pass" : "fail",
    details: [
      `required_minimum=${minExperiments}`,
      `actual_total=${experiments.total}`,
      experiments.total >= minExperiments
        ? "Experiment count satisfies growth gate."
        : "Add more conversion experiments before stable release."
    ]
  });

  checks.push({
    id: "experiments.active_cycle",
    title: "Experiments run during v2 cycle",
    status: activeCycle >= minExperiments ? "pass" : "warn",
    details: [
      `required_active=${minExperiments}`,
      `active_cycle=${activeCycle}`,
      activeCycle >= minExperiments
        ? "Sufficient non-planned experiments are active/completed."
        : "Mark additional experiments as running/completed/won/lost."
    ]
  });

  checks.push({
    id: "experiments.winner",
    title: "Winning experiment merged",
    status: experiments.winners >= 1 ? "pass" : "fail",
    details: [
      `winners=${experiments.winners}`,
      experiments.winners >= 1
        ? "At least one winning experiment is recorded."
        : "Record and merge at least one winning experiment before release."
    ]
  });

  const winnerWithoutSummary = experiments.experiments.filter(
    (entry) => entry.status === "won" && !entry.result_summary
  );
  checks.push({
    id: "experiments.winner_summary",
    title: "Winning experiment documentation",
    status: winnerWithoutSummary.length === 0 ? "pass" : "warn",
    details: winnerWithoutSummary.length === 0
      ? ["All winning experiments include result summaries."]
      : winnerWithoutSummary.map((entry) => `${entry.id}: missing result_summary`)
  });

  const hasFail = checks.some((check) => check.status === "fail");
  const hasWarn = checks.some((check) => check.status === "warn");
  const ok = !hasFail && (!strict || !hasWarn);

  return {
    ok,
    strict,
    score: computeGrowthGateScore(checks),
    checks,
    experiments: {
      source_path: experiments.source_path,
      total: experiments.total,
      running: experiments.running,
      completed: experiments.completed,
      winners: experiments.winners,
      active_cycle: activeCycle
    }
  };
}

export function renderGrowthDashboardMarkdown(
  funnel: GrowthFunnelReport,
  experiments: GrowthExperimentReport
): string {
  const weekLabel = funnel.window.to;
  const startStep = funnel.steps.find((step) => step.step_id === "start");
  const firstCommandStep = funnel.steps.find((step) => step.step_id === "first_command");
  const retentionStep = funnel.steps.find((step) => step.step_id === "week1_retention");

  const lines: string[] = [];
  lines.push("# Growth Dashboard");
  lines.push("");
  lines.push("Track this once per week.");
  lines.push("");
  lines.push("## Weekly Snapshot");
  lines.push("");
  lines.push("| Week | Installs | Starts | First command | Week-1 retained | Week-1 retention rate | Top funnel issue |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | --- |");
  lines.push(
    `| ${weekLabel} | ${funnel.actors.install} | ${funnel.actors.start} | ${funnel.actors.first_command} | ` +
      `${funnel.actors.week1_retained} | ${formatPercent(retentionStep?.conversion_from_previous ?? null)} | ` +
      `${resolveTopFunnelIssue(funnel)} |`
  );
  lines.push("");
  lines.push("## Funnel Conversion");
  lines.push("");
  lines.push("| Step | Users | Conversion from previous | Conversion from install |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const step of funnel.steps) {
    lines.push(
      `| ${step.step_id} | ${step.users} | ${formatPercent(step.conversion_from_previous)} | ` +
      `${formatPercent(step.conversion_from_install)} |`
    );
  }
  lines.push("");
  lines.push("## Experiment Tracker");
  lines.push("");
  lines.push(`Source: \`${experiments.source_path}\``);
  lines.push("");
  lines.push("| Experiment | Status | Primary metric | Start | End | Result summary |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  if (experiments.experiments.length === 0) {
    lines.push("| (none) | - | - | - | - | - |");
  } else {
    for (const experiment of experiments.experiments) {
      lines.push(
        `| ${experiment.id} - ${experiment.title} | ${experiment.status} | ${experiment.primary_metric} | ` +
          `${experiment.start_date} | ${experiment.end_date ?? ""} | ${experiment.result_summary ?? ""} |`
      );
    }
  }
  lines.push("");
  lines.push("## Funnel Health");
  lines.push("");
  lines.push(`- Start conversion: ${formatPercent(startStep?.conversion_from_previous ?? null)}`);
  lines.push(`- First-command conversion: ${formatPercent(firstCommandStep?.conversion_from_previous ?? null)}`);
  lines.push(`- Week-1 retention (eligible starts): ${formatPercent(retentionStep?.conversion_from_previous ?? null)}`);
  lines.push("");
  lines.push("## Next Actions");
  lines.push("");
  lines.push("1. Address the largest conversion drop shown in Funnel Conversion.");
  lines.push("2. Keep at least 3 growth experiments active or completed in current cycle.");
  lines.push("3. Promote winning experiments into README/onboarding flow before stable release.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function resolveGrowthWindow(options: GrowthFunnelOptions): { from: string; to: string; days: number } {
  const now = options.now ?? new Date();
  const normalizedDays = normalizeWindowDays(options.windowDays);
  const to = normalizeDateLabel(options.to) ?? toDateLabel(now);
  const from = normalizeDateLabel(options.from) ?? toDateLabel(
    new Date(Date.parse(`${to}T00:00:00.000Z`) - (normalizedDays - 1) * 24 * 60 * 60 * 1000)
  );

  if (Date.parse(`${from}T00:00:00.000Z`) > Date.parse(`${to}T23:59:59.999Z`)) {
    throw new Error(`Invalid growth window: from (${from}) is after to (${to}).`);
  }

  const days = Math.max(1, Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / (24 * 60 * 60 * 1000)
  ) + 1);

  return { from, to, days };
}

function normalizeMinimum(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return 3;
  }
  const normalized = Math.trunc(value);
  if (normalized < 1) {
    throw new Error("min_experiments must be >= 1.");
  }
  return normalized;
}

function computeGrowthGateScore(checks: GrowthGateCheck[]): number {
  let score = 100;
  for (const check of checks) {
    if (check.status === "fail") {
      score -= 25;
      continue;
    }
    if (check.status === "warn") {
      score -= 8;
    }
  }
  return Math.max(0, score);
}

function normalizeWindowDays(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return 28;
  }
  const normalized = Math.trunc(value);
  if (normalized < 1) {
    throw new Error("window_days must be >= 1.");
  }
  return normalized;
}

function normalizeDateLabel(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date value "${value}". Expected YYYY-MM-DD.`);
  }
  return trimmed;
}

function toDateLabel(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeActorId(record: MetricRecord): string {
  return typeof record.actor_id === "string" && record.actor_id.trim().length > 0
    ? record.actor_id
    : "unknown";
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function resolveTopFunnelIssue(funnel: GrowthFunnelReport): string {
  const ranked = [
    {
      id: "install_to_start",
      drop: 1 - (funnel.steps.find((step) => step.step_id === "start")?.conversion_from_previous ?? 0)
    },
    {
      id: "start_to_first_command",
      drop: 1 - (funnel.steps.find((step) => step.step_id === "first_command")?.conversion_from_previous ?? 0)
    },
    {
      id: "week1_retention",
      drop: 1 - (funnel.steps.find((step) => step.step_id === "week1_retention")?.conversion_from_previous ?? 0)
    }
  ].sort((left, right) => right.drop - left.drop);

  const top = ranked[0];
  if (!top || top.drop <= 0) {
    return "no major drop detected";
  }
  return top.id.replace(/_/g, " ");
}

function parseExperimentsPayload(value: unknown, sourcePath: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isPlainObject(value) && Array.isArray(value.experiments)) {
    return value.experiments as unknown[];
  }
  throw new Error(`Growth experiments file ${sourcePath} must be a JSON array or { experiments: [] } object.`);
}

function parseExperimentRow(value: unknown, sourcePath: string, index: number): GrowthExperiment {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid experiment row at ${sourcePath}[${index}]. Expected object.`);
  }

  const id = asNonEmptyString(value.id, "id", sourcePath, index);
  const title = asNonEmptyString(value.title, "title", sourcePath, index);
  const status = asExperimentStatus(value.status, sourcePath, index);
  const hypothesis = asNonEmptyString(value.hypothesis, "hypothesis", sourcePath, index);
  const primaryMetric = asNonEmptyString(value.primary_metric, "primary_metric", sourcePath, index);
  const startDate = asDateString(value.start_date, "start_date", sourcePath, index);
  const endDate = value.end_date === undefined || value.end_date === null
    ? undefined
    : asDateString(value.end_date, "end_date", sourcePath, index);
  const resultSummary = value.result_summary === undefined || value.result_summary === null
    ? undefined
    : asNonEmptyString(value.result_summary, "result_summary", sourcePath, index);

  return {
    id,
    title,
    status,
    hypothesis,
    primary_metric: primaryMetric,
    start_date: startDate,
    end_date: endDate,
    result_summary: resultSummary
  };
}

function asNonEmptyString(
  value: unknown,
  fieldName: string,
  sourcePath: string,
  index: number
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName} at ${sourcePath}[${index}]. Expected non-empty string.`);
  }
  return value.trim();
}

function asDateString(value: unknown, fieldName: string, sourcePath: string, index: number): string {
  const normalized = asNonEmptyString(value, fieldName, sourcePath, index);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Invalid ${fieldName} at ${sourcePath}[${index}]. Expected YYYY-MM-DD.`);
  }
  return normalized;
}

function asExperimentStatus(value: unknown, sourcePath: string, index: number): GrowthExperimentStatus {
  const normalized = asNonEmptyString(value, "status", sourcePath, index).toLowerCase();
  if (
    normalized === "planned" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "won" ||
    normalized === "lost"
  ) {
    return normalized;
  }
  throw new Error(
    `Invalid status at ${sourcePath}[${index}]. Expected planned|running|completed|won|lost.`
  );
}
