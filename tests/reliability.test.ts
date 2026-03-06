import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { checkLockStatus, writeLock } from "../src/services/lockfile";
import { evaluatePolicy } from "../src/services/policy";
import { runVerification } from "../src/services/verify";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const tmpDirs: string[] = [];

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describe("reliability services", () => {
  it("evaluates policy with passing status for repository baseline", async () => {
    const report = await evaluatePolicy({
      projectRoot: process.cwd()
    });

    expect(report.ok).toBe(true);
    expect(report.summary.fail).toBe(0);
    expect(report.score).toBeGreaterThan(0);
  });

  it("writes a lock and reports in-sync status", async () => {
    const lockPath = await createTempLockPath();

    const writeResult = await writeLock({
      projectRoot: process.cwd(),
      pathOverride: lockPath
    });
    expect(writeResult.path).toBe(lockPath);

    const status = await checkLockStatus({
      projectRoot: process.cwd(),
      pathOverride: lockPath
    });
    expect(status.exists).toBe(true);
    expect(status.inSync).toBe(true);
    expect(status.differences).toEqual([]);
  });

  it("verify is strict-pass after lock refresh", async () => {
    const lockPath = await createTempLockPath();

    await writeLock({
      projectRoot: process.cwd(),
      pathOverride: lockPath
    });

    const report = await runVerification({
      projectRoot: process.cwd(),
      pathOverride: lockPath,
      strict: true
    });
    expect(report.ok).toBe(true);
    expect(report.status).toBe("pass");
  });
});

async function createTempLockPath(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-reliability-lock-"));
  tmpDirs.push(root);
  return path.join(root, ".supercodex.lock.json");
}
