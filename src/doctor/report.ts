import type { DoctorReport } from "./types";

export function formatDoctorReport(report: DoctorReport): string {
  if (report.issues.length === 0) {
    const mcpSummary = report.mcp_health
      ? `\nMCP health: healthy=${report.mcp_health.summary.healthy}, ` +
        `degraded=${report.mcp_health.summary.degraded}, failing=${report.mcp_health.summary.failing}`
      : "";
    return `Doctor: no issues found.${mcpSummary}`;
  }

  const lines: string[] = [];
  lines.push(`Doctor: ${report.ok ? "ok" : "issues detected"}`);
  for (const issue of report.issues) {
    const pathPart = issue.path ? ` (${issue.path})` : "";
    const fixablePart = issue.fixable ? " [fixable]" : "";
    lines.push(`- [${issue.level}] ${issue.message}${pathPart}${fixablePart}`);
  }
  if (report.mcp_health) {
    lines.push(
      `MCP health: healthy=${report.mcp_health.summary.healthy}, ` +
        `degraded=${report.mcp_health.summary.degraded}, failing=${report.mcp_health.summary.failing}`
    );
  }
  return lines.join("\n");
}

export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}
