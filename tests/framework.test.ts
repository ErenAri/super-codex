import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";
import { applyDoctorFixes, runDoctorChecks } from "../src/doctor";
import { pathExists } from "../src/fs-utils";
import { installMcpFromCatalog, setDefaultMode, unsetDefaultMode } from "../src/operations";
import { getCodexPaths } from "../src/paths";
import { BUILTIN_CATALOG } from "../src/registry";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("framework expansion", () => {
  it("sets and unsets runtime default mode with backups", async () => {
    const codexHome = await createCodexHome();

    const setResult = await setDefaultMode("deep", {
      codexHome,
      now: new Date("2026-02-28T12:00:00.000Z")
    });
    expect(setResult.changed).toBe(true);
    expect(await pathExists(setResult.backup.backupDir)).toBe(true);

    const configAfterSet = await loadConfig(getCodexPaths(codexHome).configPath);
    expect(
      ((configAfterSet.supercodex as Record<string, unknown>).runtime as Record<string, unknown>).default_mode
    ).toBe("deep");

    const unsetResult = await unsetDefaultMode({
      codexHome,
      now: new Date("2026-02-28T12:00:01.000Z")
    });
    expect(unsetResult.changed).toBe(true);
    const configAfterUnset = await readFile(getCodexPaths(codexHome).configPath, "utf8");
    expect(configAfterUnset).not.toContain("default_mode");
  });

  it("installs MCP server from catalog and tracks installed id", async () => {
    const codexHome = await createCodexHome();
    const entry = BUILTIN_CATALOG.filesystem;

    const result = await installMcpFromCatalog(entry, {
      codexHome,
      now: new Date("2026-02-28T13:00:00.000Z")
    });
    expect(result.configChanged).toBe(true);

    const config = await loadConfig(getCodexPaths(codexHome).configPath);
    const servers = config.mcp_servers as Record<string, unknown>;
    expect(servers.filesystem).toBeTruthy();

    const supercodex = config.supercodex as Record<string, unknown>;
    const catalog = supercodex.catalog as Record<string, unknown>;
    expect(catalog.installed_ids).toContain("filesystem");
  });

  it("doctor finds missing install and applies safe fixes", async () => {
    const codexHome = await createCodexHome();

    const doctorBefore = await runDoctorChecks({
      codexHome
    });
    expect(doctorBefore.report.issues.some((issue) => issue.id === "config.missing")).toBe(true);

    const fixResult = await applyDoctorFixes(doctorBefore.report, {
      codexHome,
      now: new Date("2026-02-28T14:00:00.000Z")
    });
    expect(fixResult.applied).toContain("install.patch");

    const paths = getCodexPaths(codexHome);
    expect(await pathExists(paths.configPath)).toBe(true);
    expect(await pathExists(path.join(paths.promptPackDir, "plan.md"))).toBe(true);
  });
});

async function createCodexHome(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-framework-test-"));
  tmpDirs.push(root);
  return path.join(root, ".codex");
}
