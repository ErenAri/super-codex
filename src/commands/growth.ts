import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Command } from "commander";

import { loadConfig } from "../config";
import { isPlainObject } from "../fs-utils";
import { setTelemetrySettings } from "../operations";
import { getCodexPaths } from "../paths";
import {
  buildGrowthFunnelReport,
  loadGrowthExperiments,
  renderGrowthDashboardMarkdown
} from "../services/growth";
import { loadMetricsSettings, readMetricEvents } from "../services/metrics";
import { runCommand } from "./utils";

export function registerGrowthCommands(program: Command): void {
  const growth = program.command("growth").description("Analyze growth funnel metrics and conversion experiments");

  growth
    .command("funnel")
    .description("Show install -> start -> first command -> week1 retention funnel")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--from <YYYY-MM-DD>", "Window start date (default: derived from --window-days)")
    .option("--to <YYYY-MM-DD>", "Window end date (default: today)")
    .option("--window-days <number>", "Rolling window days when --from is not provided", "28")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const report = await buildGrowthFunnelReport({
          codexHome: options.codexHome as string | undefined,
          from: options.from as string | undefined,
          to: options.to as string | undefined,
          windowDays: parsePositiveIntOption(options.windowDays, "--window-days")
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        console.log(`Growth window: ${report.window.from} -> ${report.window.to} (${report.window.days} days)`);
        console.log(`Events: ${report.events.total}`);
        for (const step of report.steps) {
          const prev = step.conversion_from_previous === null ? "-" : `${(step.conversion_from_previous * 100).toFixed(1)}%`;
          const start = step.conversion_from_install === null ? "-" : `${(step.conversion_from_install * 100).toFixed(1)}%`;
          console.log(`- ${step.step_id}: ${step.users} users (prev=${prev}, from install=${start})`);
          if (step.notes) {
            console.log(`  ${step.notes}`);
          }
        }
      })
    );

  growth
    .command("events")
    .description("Inspect recorded growth/telemetry events")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--from <YYYY-MM-DD>", "Filter by start date")
    .option("--to <YYYY-MM-DD>", "Filter by end date")
    .option("--limit <number>", "Limit returned events", "50")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const limit = parsePositiveIntOption(options.limit, "--limit");
        const events = await readMetricEvents({
          codexHome: options.codexHome as string | undefined,
          from: options.from as string | undefined,
          to: options.to as string | undefined,
          limit
        });

        if (Boolean(options.json)) {
          console.log(JSON.stringify(events, null, 2));
          return;
        }

        console.log(`Events: ${events.length}`);
        for (const event of events) {
          console.log(`- ${event.at} ${event.event} actor=${event.actor_id}`);
        }
      })
    );

  growth
    .command("export")
    .description("Export growth/telemetry events to a local JSON file for inspection")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--from <YYYY-MM-DD>", "Filter by start date")
    .option("--to <YYYY-MM-DD>", "Filter by end date")
    .option("--limit <number>", "Limit returned events", "500")
    .option("--output <path>", "Output file path", "growth/telemetry-events.json")
    .option("--json", "Output JSON summary")
    .action((options) =>
      runCommand(async () => {
        const limit = parsePositiveIntOption(options.limit, "--limit");
        const events = await readMetricEvents({
          codexHome: options.codexHome as string | undefined,
          from: options.from as string | undefined,
          to: options.to as string | undefined,
          limit
        });

        const outputPath = path.resolve(process.cwd(), options.output as string);
        await mkdir(path.dirname(outputPath), { recursive: true });
        const payload = {
          schema_version: 1,
          generated_at: new Date().toISOString(),
          from: (options.from as string | undefined) ?? null,
          to: (options.to as string | undefined) ?? null,
          limit: limit ?? null,
          total_events: events.length,
          events
        };
        await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

        if (Boolean(options.json)) {
          console.log(JSON.stringify({
            output: outputPath,
            total_events: events.length
          }, null, 2));
          return;
        }

        console.log(`Telemetry export written: ${outputPath}`);
        console.log(`Events exported: ${events.length}`);
      })
    );

  const telemetry = growth.command("telemetry").description("Manage telemetry opt-in settings");

  telemetry
    .command("status")
    .description("Show telemetry opt-in status and local metrics path")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const status = await resolveTelemetryStatus(options.codexHome as string | undefined);
        if (Boolean(options.json)) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        console.log(`Telemetry enabled: ${status.enabled ? "yes" : "no"}`);
        console.log(`Metrics path: ${status.path}`);
        console.log(`Config explicit: ${status.config_explicit ? "yes" : "no"}`);
        if (!status.enabled) {
          console.log("Enable with: supercodex growth telemetry enable");
        }
      })
    );

  telemetry
    .command("enable")
    .description("Enable telemetry collection (explicit opt-in)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--path <path>", "Metrics output path override")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await setTelemetrySettings(true, {
          codexHome: options.codexHome as string | undefined,
          path: options.path as string | undefined
        });
        if (Boolean(options.json)) {
          console.log(JSON.stringify({
            enabled: result.enabled,
            changed: result.changed,
            path: result.path,
            config_path: result.paths.configPath,
            backup: result.backup.backupDir
          }, null, 2));
          return;
        }

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(`Telemetry ${result.changed ? "enabled" : "already enabled"} at ${result.path}`);
      })
    );

  telemetry
    .command("disable")
    .description("Disable telemetry collection")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const result = await setTelemetrySettings(false, {
          codexHome: options.codexHome as string | undefined
        });
        if (Boolean(options.json)) {
          console.log(JSON.stringify({
            enabled: result.enabled,
            changed: result.changed,
            path: result.path,
            config_path: result.paths.configPath,
            backup: result.backup.backupDir
          }, null, 2));
          return;
        }

        console.log(`Backup: ${result.backup.backupDir}`);
        console.log(`Telemetry ${result.changed ? "disabled" : "already disabled"} at ${result.path}`);
      })
    );

  growth
    .command("experiments")
    .description("Show conversion experiments status")
    .option("--file <path>", "Experiments file path (default: growth/experiments.json)")
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const report = await loadGrowthExperiments(process.cwd(), options.file as string | undefined);
        if (Boolean(options.json)) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        console.log(`Experiments file: ${report.source_path}`);
        console.log(`Total: ${report.total}`);
        console.log(`Running: ${report.running}`);
        console.log(`Completed: ${report.completed}`);
        console.log(`Winners: ${report.winners}`);
        for (const experiment of report.experiments) {
          console.log(`- ${experiment.id} (${experiment.status}) ${experiment.title}`);
          console.log(`  metric=${experiment.primary_metric}, start=${experiment.start_date}, end=${experiment.end_date ?? "-"}`);
          if (experiment.result_summary) {
            console.log(`  result=${experiment.result_summary}`);
          }
        }
      })
    );

  growth
    .command("dashboard")
    .description("Generate growth dashboard markdown from funnel metrics and experiments")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--from <YYYY-MM-DD>", "Window start date")
    .option("--to <YYYY-MM-DD>", "Window end date")
    .option("--window-days <number>", "Rolling window days when --from is not provided", "28")
    .option("--experiments-file <path>", "Experiments file path (default: growth/experiments.json)")
    .option("--output <path>", "Output markdown file", "docs/GROWTH_DASHBOARD.md")
    .option("--print", "Print dashboard markdown to stdout instead of writing file")
    .option("--json", "Output JSON summary")
    .action((options) =>
      runCommand(async () => {
        const funnel = await buildGrowthFunnelReport({
          codexHome: options.codexHome as string | undefined,
          from: options.from as string | undefined,
          to: options.to as string | undefined,
          windowDays: parsePositiveIntOption(options.windowDays, "--window-days")
        });
        const experiments = await loadGrowthExperiments(process.cwd(), options.experimentsFile as string | undefined);
        const markdown = renderGrowthDashboardMarkdown(funnel, experiments);
        const outputPath = path.resolve(process.cwd(), options.output as string);

        if (Boolean(options.print)) {
          console.log(markdown);
        } else {
          await mkdir(path.dirname(outputPath), { recursive: true });
          await writeFile(outputPath, markdown, "utf8");
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify({
            output: outputPath,
            printed: Boolean(options.print),
            funnel,
            experiments: {
              source_path: experiments.source_path,
              total: experiments.total,
              running: experiments.running,
              completed: experiments.completed,
              winners: experiments.winners
            }
          }, null, 2));
          return;
        }

        if (!Boolean(options.print)) {
          console.log(`Growth dashboard updated: ${outputPath}`);
        }
      })
    );
}

async function resolveTelemetryStatus(codexHome?: string): Promise<{
  enabled: boolean;
  path: string;
  config_explicit: boolean;
}> {
  const settings = await loadMetricsSettings(codexHome);
  const paths = getCodexPaths(codexHome);
  const config = await loadConfig(paths.configPath);
  const supercodex = isPlainObject(config.supercodex) ? config.supercodex : null;
  const metrics = supercodex && isPlainObject((supercodex as Record<string, unknown>).metrics)
    ? (supercodex as Record<string, unknown>).metrics as Record<string, unknown>
    : null;

  return {
    enabled: settings.enabled,
    path: settings.outputPath,
    config_explicit: typeof metrics?.enabled === "boolean"
  };
}

function parsePositiveIntOption(value: unknown, optionName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = typeof value === "string" ? value.trim() : String(value);
  if (!normalized) {
    return undefined;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${optionName} value "${normalized}". Expected positive integer.`);
  }
  return parsed;
}
