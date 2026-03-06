import { rm } from "node:fs/promises";

interface CleanupOptions {
  attempts?: number;
  baseDelayMs?: number;
}

const TRANSIENT_CODES = new Set([
  "EBUSY",
  "ENOTEMPTY",
  "EPERM",
  "EACCES",
  "EMFILE",
  "ENFILE"
]);

export async function cleanupTrackedTempDirs(
  tmpDirs: string[],
  options: CleanupOptions = {}
): Promise<void> {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (!dir) {
      continue;
    }
    await removeWithRetry(dir, options);
  }
}

async function removeWithRetry(targetPath: string, options: CleanupOptions): Promise<void> {
  const attempts = normalizeAttempts(options.attempts);
  const baseDelayMs = normalizeDelay(options.baseDelayMs);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!isTransientFsError(error) || attempt >= attempts) {
        return;
      }
      await sleep(baseDelayMs * attempt);
    }
  }
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

function isTransientFsError(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return TRANSIENT_CODES.has(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
