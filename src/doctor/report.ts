import type { DoctorReport } from "./types";
import { line, type OutputStyle } from "../commands/presenter";

export function formatDoctorReport(report: DoctorReport, style: OutputStyle = "plain"): string {
  if (report.issues.length === 0) {
    const mcpSummary = report.mcp_health
      ? `\nMCP health: healthy=${report.mcp_health.summary.healthy}, ` +
        `degraded=${report.mcp_health.summary.degraded}, failing=${report.mcp_health.summary.failing}`
      : "";
    const actions = report.next_commands?.length
      ? `\n${line("next", `Next: ${report.next_commands.join(" | ")}`, style)}`
      : "";
    const details = `${line("ok", "Doctor: no issues found.", style)}${mcpSummary}${actions}`;
    if (report.fix_plan && report.fix_plan.length > 0) {
      return `${details}\n${formatDoctorFixPlan(report, style)}`;
    }
    return details;
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
    if (report.best_next_command) {
      lines.push(line("next", `Best next command: ${report.best_next_command}`, style));
    }
    const actions = report.quick_actions?.length
      ? report.quick_actions.map((entry) => `${entry.label}: ${entry.command}`)
      : report.recommended_actions;
    for (const action of actions) {
      lines.push(line("next", action, style));
    }
  }
  if (report.fix_plan && report.fix_plan.length > 0) {
    lines.push(line("info", "Fix plan:", style));
    lines.push(...formatDoctorFixPlanLines(report.fix_plan, style));
  }
  if (report.fix_result) {
    lines.push(line("info", "Fix result:", style));
    if (report.fix_result.applied.length > 0) {
      lines.push(line("ok", `Applied: ${report.fix_result.applied.join(", ")}`, style));
    } else {
      lines.push(line("info", "Applied: none", style));
    }
    if (report.fix_result.skipped.length > 0) {
      lines.push(line("warn", `Skipped: ${report.fix_result.skipped.join(" | ")}`, style));
    }
  }
  return lines.join("\n");
}

export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}

function formatDoctorFixPlan(report: DoctorReport, style: OutputStyle): string {
  if (!report.fix_plan || report.fix_plan.length === 0) {
    return "";
  }
  return [line("info", "Fix plan:", style), ...formatDoctorFixPlanLines(report.fix_plan, style)].join("\n");
}

function formatDoctorFixPlanLines(plan: DoctorReport["fix_plan"], style: OutputStyle): string[] {
  if (!plan) {
    return [];
  }
  const lines: string[] = [];
  for (const step of plan) {
    lines.push(line("next", `${step.id} - ${step.title}`, style));
    lines.push(line("info", `  applies_to: ${step.applies_to.join(", ")}`, style));
    lines.push(line("info", `  preview: ${step.command_preview}`, style));
    lines.push(line("info", `  before: ${step.before}`, style));
    lines.push(line("info", `  after: ${step.after}`, style));
    lines.push(line("warn", `  rollback: ${step.rollback_hint}`, style));
  }
  return lines;
}
