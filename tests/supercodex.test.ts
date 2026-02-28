import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";
import { pathExists } from "../src/fs-utils";
import { installSupercodex, uninstallSupercodex } from "../src/operations";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("supercodex install/uninstall", () => {
  it("creates a timestamped backup before writing config", async () => {
    const root = await createTempDir();
    const codexHome = path.join(root, ".codex");
    const configPath = path.join(codexHome, "config.toml");

    await mkdir(codexHome, { recursive: true });
    await writeFile(configPath, "existing_key = \"keep\"\n", "utf8");

    const now = new Date("2026-02-28T12:34:56.000Z");
    const result = await installSupercodex({ codexHome, now });

    expect(result.backup.backupDir).toContain(path.join(".codex", "backups"));
    expect(result.backup.backupFile).not.toBeNull();

    const backupContent = await readFile(result.backup.backupFile as string, "utf8");
    expect(backupContent).toContain("existing_key = \"keep\"");
  });

  it("is idempotent across repeated install runs", async () => {
    const root = await createTempDir();
    const codexHome = path.join(root, ".codex");
    const topLevelPrompt = path.join(codexHome, "prompts", "sc-research.md");

    const first = await installSupercodex({
      codexHome,
      now: new Date("2026-02-28T08:00:00.000Z")
    });
    const afterFirst = await readFile(first.paths.configPath, "utf8");

    const second = await installSupercodex({
      codexHome,
      now: new Date("2026-02-28T08:00:01.000Z")
    });
    const afterSecond = await readFile(second.paths.configPath, "utf8");

    expect(first.configChanged).toBe(true);
    expect(second.configChanged).toBe(false);
    expect(second.promptChanged).toBe(false);
    expect(afterFirst).toBe(afterSecond);
    expect(await pathExists(topLevelPrompt)).toBe(true);
  });

  it("preserves existing conflicting values and records overrides", async () => {
    const root = await createTempDir();
    const codexHome = path.join(root, ".codex");
    const configPath = path.join(codexHome, "config.toml");

    await mkdir(codexHome, { recursive: true });
    await writeFile(
      configPath,
      [
        "[agents.supercodex_planner]",
        "description = \"Custom planner\"",
        "prompt = \"custom/plan.md\"",
        "",
        "[unrelated]",
        "keep = true",
        ""
      ].join("\n"),
      "utf8"
    );

    await installSupercodex({
      codexHome,
      now: new Date("2026-02-28T09:00:00.000Z")
    });

    const config = await loadConfig(configPath);
    const agents = config.agents as Record<string, unknown>;
    const planner = agents.supercodex_planner as Record<string, unknown>;
    const supercodex = config.supercodex as Record<string, unknown>;
    const overrides = supercodex.overrides as Record<string, unknown>;

    expect(planner.prompt).toBe("custom/plan.md");
    expect(overrides["agents.supercodex_planner"]).toBeTruthy();
    expect((config.unrelated as Record<string, unknown>).keep).toBe(true);
  });

  it("uninstall removes only managed sections and prompt directory", async () => {
    const root = await createTempDir();
    const codexHome = path.join(root, ".codex");
    const configPath = path.join(codexHome, "config.toml");
    const promptDir = path.join(codexHome, "prompts", "supercodex");
    const promptsRoot = path.join(codexHome, "prompts");
    const managedInteractivePrompt = path.join(promptsRoot, "sc-research.md");
    const customPrompt = path.join(promptsRoot, "custom.md");

    await mkdir(promptDir, { recursive: true });
    await writeFile(path.join(promptDir, "plan.md"), "test", "utf8");
    await writeFile(managedInteractivePrompt, "<!-- supercodex:managed-prompt-wrapper -->\n", "utf8");
    await writeFile(customPrompt, "# custom\n", "utf8");

    await mkdir(codexHome, { recursive: true });
    await writeFile(
      configPath,
      [
        "[supercodex]",
        "enabled = true",
        "",
        "[supercodex.managed]",
        "agents = [\"supercodex_planner\"]",
        "mcp_servers = [\"localfs\"]",
        "",
        "[agents.supercodex_planner]",
        "prompt = \"supercodex/plan.md\"",
        "",
        "[agents.keep_me]",
        "prompt = \"keep.md\"",
        "",
        "[mcp_servers.localfs]",
        "transport = \"stdio\"",
        "command = \"node\"",
        "",
        "[mcp_servers.keep]",
        "transport = \"http\"",
        "url = \"http://localhost:3333/mcp\"",
        ""
      ].join("\n"),
      "utf8"
    );

    const result = await uninstallSupercodex({
      codexHome,
      now: new Date("2026-02-28T10:00:00.000Z")
    });

    const config = await loadConfig(configPath);
    const agents = config.agents as Record<string, unknown>;
    const servers = config.mcp_servers as Record<string, unknown>;

    expect(result.removedAgents).toEqual(["supercodex_planner"]);
    expect(result.removedMcpServers).toEqual(["localfs"]);
    expect(config.supercodex).toBeUndefined();
    expect(agents.supercodex_planner).toBeUndefined();
    expect(agents.keep_me).toBeTruthy();
    expect(servers.localfs).toBeUndefined();
    expect(servers.keep).toBeTruthy();
    expect(await pathExists(promptDir)).toBe(false);
    expect(await pathExists(managedInteractivePrompt)).toBe(false);
    expect(await pathExists(customPrompt)).toBe(true);
  });
});

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-test-"));
  tmpDirs.push(root);
  return root;
}
