import { removePathWithRetry } from "../../src/fs-retry";

interface CleanupOptions {
  attempts?: number;
  baseDelayMs?: number;
}

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
  try {
    await removePathWithRetry(targetPath, {
      attempts: options.attempts,
      baseDelayMs: options.baseDelayMs,
      rmOptions: {
        recursive: true,
        force: true
      }
    });
  } catch {
    // Cleanup helper should never fail tests on teardown.
  }
}
