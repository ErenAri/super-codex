import type { RmOptions } from "node:fs";
import { rm } from "node:fs/promises";

export interface RemovePathRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  rmOptions?: RmOptions;
  removeFn?: (targetPath: string, options: RmOptions) => Promise<void>;
  sleepFn?: (ms: number) => Promise<void>;
}

const TRANSIENT_FS_ERROR_CODES = new Set([
  "EBUSY",
  "ENOTEMPTY",
  "EPERM",
  "EACCES",
  "EMFILE",
  "ENFILE"
]);

export async function removePathWithRetry(
  targetPath: string,
  options: RemovePathRetryOptions = {}
): Promise<void> {
  const attempts = normalizeAttempts(options.attempts);
  const baseDelayMs = normalizeDelay(options.baseDelayMs);
  const rmOptions = options.rmOptions ?? { recursive: true, force: true };
  const removeFn = options.removeFn ?? rm;
  const sleepFn = options.sleepFn ?? defaultSleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await removeFn(targetPath, rmOptions);
      return;
    } catch (error) {
      if (!isTransientFsError(error) || attempt >= attempts) {
        throw error;
      }

      await sleepFn(baseDelayMs * attempt);
    }
  }
}

export function isTransientFsError(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return TRANSIENT_FS_ERROR_CODES.has(code);
}

function normalizeAttempts(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 6;
  }
  return Math.max(1, Math.trunc(value));
}

function normalizeDelay(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 30;
  }
  return Math.max(1, Math.trunc(value));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
