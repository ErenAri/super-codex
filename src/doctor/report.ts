import type { DoctorReport } from "./types";

export function formatDoctorReport(report: DoctorReport): string {
  if (report.issues.length === 0) {
    return "Doctor: no issues found.";
  }

  const lines: string[] = [];
  lines.push(`Doctor: ${report.ok ? "ok" : "issues detected"}`);
  for (const issue of report.issues) {
    const pathPart = issue.path ? ` (${issue.path})` : "";
    const fixablePart = issue.fixable ? " [fixable]" : "";
    lines.push(`- [${issue.level}] ${issue.message}${pathPart}${fixablePart}`);
  }
  return lines.join("\n");
}

export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}
