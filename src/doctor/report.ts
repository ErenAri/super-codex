import type { DoctorReport } from "./types";
import { line, type OutputStyle } from "../commands/presenter";

export function formatDoctorReport(report: DoctorReport, style: OutputStyle = "plain"): string {
  if (report.issues.length === 0) {
    const mcpSummary = report.mcp_health
      ? `\nMCP health: healthy=${report.mcp_health.summary.healthy}, ` +
        `degraded=${report.mcp_health.summary.degraded}, failing=${report.mcp_health.summary.failing}`
      : "";
    const actions = report.recommended_actions?.length
      ? `\n${line("next", `Next: ${report.recommended_actions.join(" | ")}`, style)}`
      : "";
    return `${line("ok", "Doctor: no issues found.", style)}${mcpSummary}${actions}`;
  }

  const lines: string[] = [];
  lines.push(line(report.ok ? "ok" : "warn", `Doctor: ${report.ok ? "ok" : "issues detected"}`, style));
  if (report.summary) {
    lines.push(
      line(
        "info",
        `Summary: errors=${report.summary.errors}, warnings=${report.summary.warnings}, ` +
          `info=${report.summary.info}, fixable=${report.summary.fixable}`,
        style
      )
    );
  }
  for (const issue of report.issues) {
    const pathPart = issue.path ? ` (${issue.path})` : "";
    const fixablePart = issue.fixable ? " [fixable]" : "";
    const kind = issue.level === "error" ? "error" : issue.level === "warn" ? "warn" : "info";
    lines.push(line(kind, `[${issue.level}] ${issue.message}${pathPart}${fixablePart}`, style));
  }
  if (report.mcp_health) {
    lines.push(
      line(
        "info",
        `MCP health: healthy=${report.mcp_health.summary.healthy}, ` +
          `degraded=${report.mcp_health.summary.degraded}, failing=${report.mcp_health.summary.failing}`,
        style
      )
    );
  }
  if (report.recommended_actions && report.recommended_actions.length > 0) {
    lines.push(line("next", "Recommended actions:", style));
    for (const action of report.recommended_actions) {
      lines.push(line("next", action, style));
    }
  }
  return lines.join("\n");
}

export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}
