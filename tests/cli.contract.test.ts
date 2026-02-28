import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("cli contract", () => {
  it("validate --json returns valid payload and zero exit code", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["validate", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.valid).toBe(true);
    expect(payload.command_count).toBeGreaterThanOrEqual(26);
  });

  it("validate --strict fails on alias warnings from overlays", async () => {
    const codexHome = await createCodexHome();
    await writeRegistryOverlay(
      codexHome,
      [
        "[aliases.experimental]",
        "description = \"Overlay alias with unsupported mode\"",
        "target = \"run.plan\"",
        "default_mode = \"unknown_mode\"",
        ""
      ].join("\n")
    );

    const normal = await runCapturedCli(["validate", "--json", "--codex-home", codexHome]);
    expect(normal.code).toBe(0);
    const normalPayload = JSON.parse(normal.stdout);
    expect(normalPayload.valid).toBe(true);
    expect(normalPayload.issues.some((issue: { level: string }) => issue.level === "warn")).toBe(true);

    const strict = await runCapturedCli(["validate", "--json", "--strict", "--codex-home", codexHome]);
    expect(strict.code).toBe(1);
    const strictPayload = JSON.parse(strict.stdout);
    expect(strictPayload.valid).toBe(false);
    expect(strictPayload.strict).toBe(true);
  });

  it("doctor --json is report-only zero exit and strict mode fails on warnings", async () => {
    const codexHome = await createCodexHome();

    const normal = await runCapturedCli(["doctor", "--json", "--codex-home", codexHome]);
    expect(normal.code).toBe(0);
    const normalPayload = JSON.parse(normal.stdout);
    expect(Array.isArray(normalPayload.issues)).toBe(true);
    expect(normalPayload.issues.some((issue: { level: string }) => issue.level === "warn")).toBe(true);

    const strict = await runCapturedCli(["doctor", "--json", "--strict", "--codex-home", codexHome]);
    expect(strict.code).toBe(1);
  });

  it("catalog show --json returns entry payload", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["catalog", "show", "filesystem", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.id).toBe("filesystem");
    expect(payload.transport).toBe("stdio");
  });

  it("run plan --json resolves workflow context", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["run", "plan", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("plan");
    expect(typeof payload.mode).toBe("string");
    expect(typeof payload.persona).toBe("string");
  });

  it("supports /sc:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/sc:research", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("plan");
    expect(payload.mode).toBe("deep");
    expect(payload.persona).toBe("architect");
  });

  it("supports sc:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["sc:brainstorming", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("plan");
    expect(payload.mode).toBe("balanced");
    expect(payload.persona).toBe("educator");
  });

  it("supports plain alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["research", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("plan");
  });

  it("returns friendly error for unknown /sc alias", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/sc:researh", "--codex-home", codexHome]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown slash alias");
  });

  it("aliases list and show return expected payloads", async () => {
    const codexHome = await createCodexHome();
    const listResult = await runCapturedCli(["aliases", "list", "--json", "--codex-home", codexHome]);
    expect(listResult.code).toBe(0);
    const listPayload = JSON.parse(listResult.stdout);
    expect(Array.isArray(listPayload)).toBe(true);
    expect(listPayload.some((entry: { name: string }) => entry.name === "research")).toBe(true);

    const showResult = await runCapturedCli(["aliases", "show", "research", "--json", "--codex-home", codexHome]);
    expect(showResult.code).toBe(0);
    const showPayload = JSON.parse(showResult.stdout);
    expect(showPayload.name).toBe("research");
    expect(showPayload.target).toBe("run.plan");
    expect(showPayload.pack).toBe("core-planning");
    expect(showPayload.risk_level).toBe("medium");
  });

  it("aliases packs and search return expected payloads", async () => {
    const codexHome = await createCodexHome();

    const packsResult = await runCapturedCli(["aliases", "packs", "--json", "--codex-home", codexHome]);
    expect(packsResult.code).toBe(0);
    const packsPayload = JSON.parse(packsResult.stdout);
    expect(Array.isArray(packsPayload)).toBe(true);
    expect(
      packsPayload.some((entry: { name: string; aliases: string[] }) => entry.name === "core-planning" && entry.aliases.includes("research"))
    ).toBe(true);

    const searchResult = await runCapturedCli(["aliases", "search", "security", "--json", "--codex-home", codexHome]);
    expect(searchResult.code).toBe(0);
    const searchPayload = JSON.parse(searchResult.stdout);
    expect(Array.isArray(searchPayload)).toBe(true);
    expect(searchPayload.some((entry: { name: string }) => entry.name === "security")).toBe(true);

    const packFiltered = await runCapturedCli([
      "aliases",
      "list",
      "--pack",
      "quality-review",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(packFiltered.code).toBe(0);
    const filteredPayload = JSON.parse(packFiltered.stdout);
    expect(filteredPayload.every((entry: { pack?: string }) => entry.pack === "quality-review")).toBe(true);
  });

  it("fails fast when alias points to unknown command target", async () => {
    const codexHome = await createCodexHome();
    await writeRegistryOverlay(
      codexHome,
      [
        "[aliases.badtarget]",
        "description = \"Broken target\"",
        "target = \"run.unknown\"",
        ""
      ].join("\n")
    );

    const result = await runCapturedCli(["/sc:badtarget", "--codex-home", codexHome]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("points to unknown command target");
  });

  it("mcp doctor handles missing config and mcp test missing server fails", async () => {
    const codexHome = await createCodexHome();

    const doctor = await runCapturedCli(["mcp", "doctor", "--json", "--codex-home", codexHome]);
    expect(doctor.code).toBe(0);
    const doctorPayload = JSON.parse(doctor.stdout);
    expect(doctorPayload.ok).toBe(true);

    const missingTest = await runCapturedCli(["mcp", "test", "missing", "--codex-home", codexHome]);
    expect(missingTest.code).toBe(1);
    expect(missingTest.stderr).toContain("MCP server \"missing\" not found");
  });
});

async function runCapturedCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const logs: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...parts: unknown[]) => {
    logs.push(parts.map((part) => String(part)).join(" "));
  };
  console.error = (...parts: unknown[]) => {
    errors.push(parts.map((part) => String(part)).join(" "));
  };
  console.warn = (...parts: unknown[]) => {
    errors.push(parts.map((part) => String(part)).join(" "));
  };

  try {
    const code = await runCli(args);
    return {
      code,
      stdout: logs.join("\n"),
      stderr: errors.join("\n")
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    process.exitCode = 0;
  }
}

async function createCodexHome(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-cli-test-"));
  tmpDirs.push(root);
  return path.join(root, ".codex");
}

async function writeRegistryOverlay(codexHome: string, content: string): Promise<void> {
  const overlayDir = path.join(codexHome, "supercodex");
  await mkdir(overlayDir, { recursive: true });
  await writeFile(path.join(overlayDir, "registry.toml"), content, "utf8");
}
