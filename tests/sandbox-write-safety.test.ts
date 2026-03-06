import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const tmpDirs: string[] = [];
const hasGit = isGitAvailable();
const describeIfGit = hasGit ? describe : describe.skip;

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describeIfGit("sandbox write safety integration", { timeout: 120000 }, () => {
  it("blocks safe-mode write workflows before applying changes in a git workspace", async () => {
    const repoRoot = await createTempGitRepo();
    const codexHome = await createCodexHome();

    const blocked = await runCapturedCli(
      ["run", "implement", "--mode", "safe", "--codex-home", codexHome],
      repoRoot
    );

    expect(blocked.code).toBe(1);
    expect(blocked.stderr).toContain("Safe mode requires --dry-run");
    expect(blocked.stderr).toContain("Safe mode requires --explain");
    expect(readGitStatus(repoRoot)).toBe("");
  });

  it("init preset only touches .codex files in a temp git repo", async () => {
    const repoRoot = await createTempGitRepo();

    const result = await runCapturedCli(
      ["init", "--dir", repoRoot, "--preset", "library", "--json"],
      repoRoot
    );

    expect(result.code).toBe(0);

    const statusLines = readGitStatus(repoRoot)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/\\/g, "/"));

    expect(statusLines.some((line) => line.includes(".codex"))).toBe(true);
    const nonCodexChanges = statusLines.filter((line) => !line.includes(".codex"));
    expect(nonCodexChanges).toHaveLength(0);
    expect(statusLines.some((line) => line.includes("tracked.txt"))).toBe(false);
  });
});

function isGitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function createTempGitRepo(): Promise<string> {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "supercodex-git-sandbox-"));
  tmpDirs.push(repoRoot);

  runGit(repoRoot, ["init"]);
  runGit(repoRoot, ["config", "user.email", "ci@example.com"]);
  runGit(repoRoot, ["config", "user.name", "CI"]);

  await writeFile(path.join(repoRoot, "tracked.txt"), "tracked\n", "utf8");
  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "initial"]);

  return repoRoot;
}

async function createCodexHome(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-codex-home-"));
  tmpDirs.push(root);
  return path.join(root, ".codex");
}

function runGit(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function readGitStatus(repoRoot: string): string {
  return runGit(repoRoot, ["status", "--porcelain"]).trim();
}

async function runCapturedCli(args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  const logs: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalCwd = process.cwd();

  console.log = (...parts: unknown[]) => {
    logs.push(parts.map((part) => String(part)).join(" "));
  };
  console.error = (...parts: unknown[]) => {
    errors.push(parts.map((part) => String(part)).join(" "));
  };
  console.warn = (...parts: unknown[]) => {
    errors.push(parts.map((part) => String(part)).join(" "));
  };

  if (cwd) {
    process.chdir(cwd);
  }

  try {
    const code = await runCli(args);
    return {
      code,
      stdout: logs.join("\n"),
      stderr: errors.join("\n")
    };
  } finally {
    process.chdir(originalCwd);
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    process.exitCode = 0;
  }
}
