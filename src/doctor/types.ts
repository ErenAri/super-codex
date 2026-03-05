export type DoctorLevel = "info" | "warn" | "error";

export interface DoctorIssue {
  id: string;
  level: DoctorLevel;
  message: string;
  fixable: boolean;
  path?: string;
}

export type McpHealthStatus = "healthy" | "degraded" | "failing";

export interface McpHealthServer {
  name: string;
  transport: "stdio" | "http" | "unknown";
  path: string;
  health_score: number;
  status: McpHealthStatus;
  failure_reason_code?: string;
  suggested_fix_steps: string[];
  test_messages: string[];
}

export interface McpHealthSummary {
  healthy: number;
  degraded: number;
  failing: number;
}

export interface McpHealthReport {
  summary: McpHealthSummary;
  servers: McpHealthServer[];
}

export interface DoctorSummary {
  errors: number;
  warnings: number;
  info: number;
  fixable: number;
}

export interface DoctorReport {
  ok: boolean;
  issues: DoctorIssue[];
  summary?: DoctorSummary;
  recommended_actions?: string[];
  mcp_health?: McpHealthReport;
}

export interface DoctorFixResult {
  applied: string[];
  skipped: string[];
}
