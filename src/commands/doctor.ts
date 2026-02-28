import type { Command } from "commander";

import { applyDoctorFixes, formatDoctorReport, formatDoctorReportJson, runDoctorChecks, runMcpDoctorChecks } from "../doctor";
import { loadConfig } from "../config";
import { updateDoctorState } from "../operations";
import { getCodexPaths } from "../paths";
import { pathExists } from "../fs-utils";
import { runCommand } from "./utils";

export function registerDoctorCommands(program: Command): void {
  program
    .command("doctor")
    .description("Run diagnostics (report-only by default)")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--strict", "Fail on warnings too")
    .option("--fix", "Apply safe deterministic fixes")
    .option("--mcp-connectivity", "Probe MCP command/url connectivity checks")
    .action((options) =>
      runCommand(async () => {
        const result = await runDoctorChecks({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd(),
          mcpConnectivity: Boolean(options.mcpConnectivity)
        });

        if (Boolean(options.fix)) {
          await applyDoctorFixes(result.report, {
            codexHome: options.codexHome as string | undefined,
            doctorStatus: result.report.ok ? "ok" : "issues"
          });
        } else {
          await updateDoctorState(result.report.ok ? "ok" : "issues", {
            codexHome: options.codexHome as string | undefined
          });
        }

        if (Boolean(options.json)) {
          console.log(formatDoctorReportJson(result.report));
        } else {
          console.log(formatDoctorReport(result.report));
        }

        const hasErrors = result.report.issues.some((issue) => issue.level === "error");
        const hasWarnings = result.report.issues.some((issue) => issue.level === "warn");
        if (hasErrors || (Boolean(options.strict) && hasWarnings)) {
          process.exitCode = 1;
        }
      })
    );
}

export function registerMcpDoctorCommand(parent: Command): void {
  parent
    .command("doctor")
    .description("Run MCP-only diagnostics")
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--json", "Output JSON")
    .option("--connectivity", "Probe command/url reachability")
    .action((options) =>
      runCommand(async () => {
        const paths = getCodexPaths(options.codexHome as string | undefined);
        const config = (await pathExists(paths.configPath)) ? await loadConfig(paths.configPath) : {};
        const report = await runMcpDoctorChecks(config, Boolean(options.connectivity));

        if (Boolean(options.json)) {
          console.log(formatDoctorReportJson(report));
        } else {
          console.log(formatDoctorReport(report));
        }

        if (!report.ok) {
          process.exitCode = 1;
        }
      })
    );
}
