export type DoctorLevel = "info" | "warn" | "error";

export interface DoctorIssue {
  id: string;
  level: DoctorLevel;
  message: string;
  fixable: boolean;
  path?: string;
}

export interface DoctorReport {
  ok: boolean;
  issues: DoctorIssue[];
}

export interface DoctorFixResult {
  applied: string[];
  skipped: string[];
}
