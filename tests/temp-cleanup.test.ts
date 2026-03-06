import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

describe("temp cleanup helper", () => {
  it("removes tracked temporary directories recursively", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-temp-cleanup-test-"));
    const nestedDir = path.join(root, "nested");
    await mkdir(nestedDir, { recursive: true });
    await writeFile(path.join(nestedDir, "file.txt"), "ok", "utf8");

    const tracked = [root];
    await cleanupTrackedTempDirs(tracked);

    expect(tracked).toHaveLength(0);
    await expect(stat(root)).rejects.toThrow();
  });

  it("swallows missing-path cleanup safely", async () => {
    const missing = path.join(os.tmpdir(), `supercodex-temp-cleanup-missing-${Date.now()}`);
    await cleanupTrackedTempDirs([missing]);
  });
});
