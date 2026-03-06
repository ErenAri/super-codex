import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadSessionCheckpoints,
  reflectSession,
  saveSessionCheckpoint
} from "../src/services/session-memory";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const tmpDirs: string[] = [];

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describe("session memory service", () => {
  it("saves and loads session checkpoints for the current project", async () => {
    const codexHome = await createCodexHome();
    const projectRoot = path.join(path.dirname(codexHome), "project-a");
    await mkdir(projectRoot, { recursive: true });

    const saveResult = await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Implemented auth middleware",
      decisions: ["Use JWT access tokens"],
      nextSteps: ["Add refresh token rotation"],
      tags: ["auth", "api"],
      mode: "deep",
      persona: "architect"
    });

    expect(saveResult.saved).toBe(true);
    expect(saveResult.record).toBeTruthy();

    const loadResult = await loadSessionCheckpoints({
      codexHome,
      projectRoot,
      recent: 5
    });
    expect(loadResult.totalRecords).toBe(1);
    expect(loadResult.records.length).toBe(1);
    expect(loadResult.records[0].summary).toContain("auth middleware");
    expect(loadResult.records[0].mode).toBe("deep");
  });

  it("honors memory max_entries trimming", async () => {
    const codexHome = await createCodexHome();
    const projectRoot = path.join(path.dirname(codexHome), "project-b");
    await mkdir(projectRoot, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      path.join(codexHome, "config.toml"),
      [
        "[supercodex.memory]",
        "enabled = true",
        "max_entries = 2",
        ""
      ].join("\n"),
      "utf8"
    );

    await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Checkpoint 1",
      decisions: [],
      nextSteps: [],
      tags: []
    });
    await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Checkpoint 2",
      decisions: [],
      nextSteps: [],
      tags: []
    });
    await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Checkpoint 3",
      decisions: [],
      nextSteps: [],
      tags: []
    });

    const loadResult = await loadSessionCheckpoints({
      codexHome,
      projectRoot,
      recent: 10
    });

    expect(loadResult.totalRecords).toBe(2);
    const summaries = loadResult.records.map((record) => record.summary);
    expect(summaries).toContain("Checkpoint 3");
    expect(summaries).toContain("Checkpoint 2");
    expect(summaries).not.toContain("Checkpoint 1");
  });

  it("reflects key decisions and next steps from recent checkpoints", async () => {
    const codexHome = await createCodexHome();
    const projectRoot = path.join(path.dirname(codexHome), "project-c");
    await mkdir(projectRoot, { recursive: true });

    await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Design complete",
      decisions: ["Use event-driven notifications"],
      nextSteps: ["Implement notification publisher"],
      tags: ["design"],
      mode: "deep"
    });
    await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Publisher implemented",
      decisions: ["Use event-driven notifications", "Use retry queue"],
      nextSteps: ["Implement notification consumer"],
      tags: ["implementation"],
      mode: "fast",
      persona: "shipper"
    });

    const reflection = await reflectSession({
      codexHome,
      projectRoot,
      recent: 5
    });

    expect(reflection.reflection).toBeTruthy();
    expect(reflection.reflection?.latest.summary).toContain("Publisher implemented");
    expect(reflection.reflection?.decisions).toContain("Use retry queue");
    expect(reflection.reflection?.pending_next_steps).toContain("Implement notification consumer");
    expect(reflection.reflection?.recommended_command).toContain("--mode fast");
    expect(reflection.reflection?.recommended_command).toContain("--persona shipper");
  });

  it("does not persist checkpoints when memory is disabled", async () => {
    const codexHome = await createCodexHome();
    const projectRoot = path.join(path.dirname(codexHome), "project-d");
    await mkdir(projectRoot, { recursive: true });
    await mkdir(codexHome, { recursive: true });
    await writeFile(
      path.join(codexHome, "config.toml"),
      [
        "[supercodex.memory]",
        "enabled = false",
        ""
      ].join("\n"),
      "utf8"
    );

    const saveResult = await saveSessionCheckpoint({
      codexHome,
      projectRoot,
      summary: "Should not persist",
      decisions: [],
      nextSteps: [],
      tags: []
    });
    expect(saveResult.saved).toBe(false);
    expect(saveResult.record).toBeNull();

    const loadResult = await loadSessionCheckpoints({
      codexHome,
      projectRoot,
      recent: 5
    });
    expect(loadResult.totalRecords).toBe(0);
    expect(loadResult.records).toEqual([]);
  });
});

async function createCodexHome(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-session-test-"));
  tmpDirs.push(root);
  return path.join(root, ".codex");
}
