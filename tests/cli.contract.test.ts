import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli";
import { BUILTIN_MODES } from "../src/registry/builtins";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("cli contract", { timeout: 120000 }, () => {
  it("validate --json returns valid payload and zero exit code", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["validate", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.valid).toBe(true);
    expect(payload.command_count).toBeGreaterThan(0);
    expect(Array.isArray(payload.errors)).toBe(true);
    expect(payload.errors.length).toBe(0);
    expect(payload.command_quality).toBeTruthy();
    expect(typeof payload.command_quality.score).toBe("number");
    expect(Array.isArray(payload.command_quality.issues)).toBe(true);
  });

  it("quality prompts --json returns passing quality payload", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["quality", "prompts", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.valid).toBe(true);
    expect(payload.strict).toBe(false);
    expect(payload.score).toBeGreaterThanOrEqual(90);
    expect(payload.error_count).toBe(0);
    expect(payload.warn_count).toBe(0);
    expect(payload.command_count).toBeGreaterThanOrEqual(29);
    expect(Array.isArray(payload.commands)).toBe(true);
    expect(Array.isArray(payload.issues)).toBe(true);
  });

  it("profile show core --json returns minimal parity profile", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["profile", "show", "core", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.id).toBe("core");
    expect(Array.isArray(payload.workflow_loop)).toBe(true);
    expect(payload.workflow_loop).toHaveLength(10);
    expect(Array.isArray(payload.core_agents)).toBe(true);
    expect(payload.core_agents).toHaveLength(6);
    expect(Array.isArray(payload.core_modes)).toBe(true);
    expect(payload.core_modes).toHaveLength(4);
  });

  it("agent list --profile core --json returns the core 6 agents", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["agent", "list", "--profile", "core", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(6);
    expect(payload.map((entry: { name: string }) => entry.name)).toEqual([
      "backend-architect",
      "pm",
      "qa-engineer",
      "security-engineer",
      "system-architect",
      "tech-writer"
    ]);
  });

  it("mode list --profile core --json returns the core 4 policy modes", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["mode", "list", "--profile", "core", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(4);
    expect(payload.map((entry: { name: string }) => entry.name)).toEqual([
      "deep",
      "deep-research",
      "fast",
      "safe"
    ]);
    expect(payload.every((entry: { policy_profile?: string }) => entry.policy_profile === "core")).toBe(true);
  });

  it("kernel export --json returns primitive registries", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["kernel", "export", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.version).toBeTruthy();
    expect(Array.isArray(payload.command_registry)).toBe(true);
    expect(Array.isArray(payload.agent_registry)).toBe(true);
    expect(Array.isArray(payload.mode_engine)).toBe(true);
    expect(Array.isArray(payload.tool_layer)).toBe(true);
  });

  it("policy validate --json returns valid policy payload", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["policy", "validate", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.valid).toBe(true);
    expect(typeof payload.score).toBe("number");
    expect(Array.isArray(payload.checks)).toBe(true);
  });

  it("lock refresh + lock status + verify --strict pass on clean state", async () => {
    const codexHome = await createCodexHome();
    const lockPath = path.join(path.dirname(codexHome), ".supercodex.lock.json");

    const refreshed = await runCapturedCli([
      "lock",
      "refresh",
      "--path",
      lockPath,
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(refreshed.code).toBe(0);
    const refreshPayload = JSON.parse(refreshed.stdout);
    expect(refreshPayload.updated).toBe(true);
    expect(typeof refreshPayload.path).toBe("string");

    const status = await runCapturedCli([
      "lock",
      "status",
      "--path",
      lockPath,
      "--strict",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(status.code).toBe(0);
    const statusPayload = JSON.parse(status.stdout);
    expect(statusPayload.ok).toBe(true);
    expect(statusPayload.in_sync).toBe(true);

    const verify = await runCapturedCli([
      "verify",
      "--lock-path",
      lockPath,
      "--strict",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(verify.code).toBe(0);
    const verifyPayload = JSON.parse(verify.stdout);
    expect(verifyPayload.ok).toBe(true);
    expect(typeof verifyPayload.best_next_command).toBe("string");
    expect(Array.isArray(verifyPayload.next_commands)).toBe(true);
    expect(Array.isArray(verifyPayload.quick_actions)).toBe(true);
    expect(Array.isArray(verifyPayload.checks)).toBe(true);
    expect(
      verifyPayload.checks.some((check: { id: string; status: string }) => check.id === "command_quality" && check.status === "pass")
    ).toBe(true);

    const safety = await runCapturedCli([
      "verify",
      "--lock-path",
      lockPath,
      "--json",
      "--safety-gates",
      "--codex-home",
      codexHome
    ]);
    expect(safety.code).toBe(0);
    const safetyPayload = JSON.parse(safety.stdout);
    expect(
      safetyPayload.checks.some((check: { id: string }) => check.id === "safety_gates")
    ).toBe(true);
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
    expect(normalPayload.summary).toBeTruthy();
    expect(typeof normalPayload.summary.fixable).toBe("number");
    expect(Array.isArray(normalPayload.recommended_actions)).toBe(true);
    expect(typeof normalPayload.best_next_command).toBe("string");
    expect(Array.isArray(normalPayload.next_commands)).toBe(true);
    expect(Array.isArray(normalPayload.quick_actions)).toBe(true);

    const strict = await runCapturedCli(["doctor", "--json", "--strict", "--codex-home", codexHome]);
    expect(strict.code).toBe(1);
  });

  it("doctor --explain includes actionable fix plan and doctor --fix reports applied actions", async () => {
    const codexHome = await createCodexHome();

    const explained = await runCapturedCli(["doctor", "--json", "--explain", "--codex-home", codexHome]);
    expect(explained.code).toBe(0);
    const explainPayload = JSON.parse(explained.stdout);
    expect(Array.isArray(explainPayload.fix_plan)).toBe(true);
    expect(explainPayload.fix_plan.length).toBeGreaterThan(0);
    expect(typeof explainPayload.fix_plan[0].rollback_hint).toBe("string");

    const fixed = await runCapturedCli(["doctor", "--json", "--fix", "--codex-home", codexHome]);
    expect(fixed.code).toBe(0);
    const fixedPayload = JSON.parse(fixed.stdout);
    expect(Array.isArray(fixedPayload.fix_plan)).toBe(true);
    expect(fixedPayload.fix_result).toBeTruthy();
    expect(Array.isArray(fixedPayload.fix_result.applied)).toBe(true);
  });

  it("start --json reports checks and start --yes repairs first-run state", async () => {
    const codexHome = await createCodexHome();

    const initial = await runCapturedCli(["start", "--json", "--codex-home", codexHome]);
    const initialPayload = JSON.parse(initial.stdout);
    expect(Array.isArray(initialPayload.checks)).toBe(true);
    expect(initialPayload.checks.some((check: { id: string }) => check.id === "workflow.smoke")).toBe(true);
    expect(typeof initialPayload.readiness_score).toBe("number");
    expect(typeof initialPayload.recommended_action).toBe("string");
    expect(typeof initialPayload.best_next_command).toBe("string");
    expect(initialPayload.quick_start).toBeTruthy();
    expect(initialPayload.quick_start.context).toBe("terminal");
    expect(Array.isArray(initialPayload.next_commands)).toBe(true);
    expect(Array.isArray(initialPayload.quick_actions)).toBe(true);
    expect(initialPayload.next_commands).toContain("supercodex profile show core");
    expect(initialPayload.next_commands).toContain("supercodex spec");
    expect(initialPayload.wizard).toBeTruthy();
    expect(initialPayload.wizard.enabled).toBe(false);
    expect(initialPayload.wizard.interactive).toBe(false);

    const repaired = await runCapturedCli(["start", "--yes", "--json", "--codex-home", codexHome]);
    expect(repaired.code).toBe(0);
    const repairedPayload = JSON.parse(repaired.stdout);
    expect(repairedPayload.repaired).toBe(true);
    expect(["ok", "warn", "error"]).toContain(repairedPayload.status);

    const plain = await runCapturedCli(["start", "--yes", "--plain", "--codex-home", codexHome]);
    expect(plain.code).toBe(0);
    expect(hasEmoji(plain.stdout)).toBe(false);
  });

  it("start --wizard --json falls back safely in non-interactive test context", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["start", "--wizard", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.wizard).toBeTruthy();
    expect(payload.wizard.enabled).toBe(true);
    expect(payload.wizard.interactive).toBe(false);
    expect(payload.quick_start.context).toBe("terminal");
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

  it("run plan supports --dry-run and --explain payload fields", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli([
      "run",
      "plan",
      "--dry-run",
      "--explain",
      "--json",
      "--codex-home",
      codexHome
    ]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.dryRun).toBe(true);
    expect(Array.isArray(payload.explanation)).toBe(true);
    expect(payload.explanation.length).toBeGreaterThan(0);
  });

  it("supports /sc:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/sc:research", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("research");
    expect(payload.mode).toBe("deep");
    expect(payload.persona).toBe("architect");
  });

  it("supports /supercodex:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/supercodex:research", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("research");
    expect(payload.mode).toBe("deep");
    expect(payload.persona).toBe("architect");
  });

  it("applies reasoning-budget and mcp flags during alias dispatch", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli([
      "/sc:research",
      "--think",
      "--c7",
      "--seq",
      "--json",
      "--codex-home",
      codexHome
    ]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.reasoningBudget).toBe("high");
    expect(payload.requestedMcpServers).toEqual(["context7", "sequential"]);
  });

  it("rejects conflicting depth flags", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli([
      "/sc:research",
      "--think",
      "--ultrathink",
      "--codex-home",
      codexHome
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("conflict");
  });

  it("supports sc:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["sc:brainstorming", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("brainstorm");
    expect(payload.mode).toBe("balanced");
    expect(payload.persona).toBe("educator");
  });

  it("supports supercodex:* explicit alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["supercodex:brainstorming", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("brainstorm");
    expect(payload.mode).toBe("balanced");
    expect(payload.persona).toBe("educator");
  });

  it("supports plain alias syntax", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["research", "--json", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.workflow).toBe("research");
  });

  it("returns friendly error for unknown /sc alias", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/sc:researh", "--codex-home", codexHome]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown slash alias");
  });

  it("returns friendly error for unknown /supercodex alias with matching suggestion prefix", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["/supercodex:researh", "--codex-home", codexHome]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown slash alias");
    expect(result.stderr).toContain("/supercodex:research");
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
    expect(showPayload.target).toBe("run.research");
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

  it("aliases recommend returns ranked suggestions", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli([
      "aliases",
      "recommend",
      "security review",
      "--limit",
      "3",
      "--json",
      "--codex-home",
      codexHome
    ]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBeGreaterThan(0);
    expect(typeof payload[0].score).toBe("number");
    expect(payload.some((item: { alias: { name: string } }) => item.alias.name === "security")).toBe(true);
  });

  it("guide recommends a primary command with terminal and prompt forms", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli([
      "guide",
      "security review for auth flow",
      "--json",
      "--codex-home",
      codexHome
    ]);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.intent).toContain("security");
    expect(payload.primary).toBeTruthy();
    expect(typeof payload.primary.alias).toBe("string");
    expect(payload.primary.terminalCommand).toContain("supercodex");
    expect(payload.primary.promptCommand).toContain("/prompts:supercodex-");
    expect(typeof payload.best_next_command).toBe("string");
    expect(Array.isArray(payload.quick_actions)).toBe(true);
    expect(payload.quick_actions.length).toBeGreaterThan(0);
    expect(payload.core_profile).toBeTruthy();
    expect(payload.core_profile.id).toBe("core");
    expect(Array.isArray(payload.core_profile.next_commands)).toBe(true);
    expect(payload.core_profile.next_commands).toContain("supercodex spec");
  });

  it("run implement in safe mode enforces --dry-run and --explain policy gates", async () => {
    const codexHome = await createCodexHome();
    const blocked = await runCapturedCli([
      "run",
      "implement",
      "--mode",
      "safe",
      "--json",
      "--codex-home",
      codexHome
    ]);

    expect(blocked.code).toBe(1);
    expect(blocked.stderr).toContain("Safe mode requires --dry-run");
    expect(blocked.stderr).toContain("Safe mode requires --explain");

    const allowed = await runCapturedCli([
      "run",
      "implement",
      "--mode",
      "safe",
      "--dry-run",
      "--explain",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(allowed.code).toBe(0);
    const payload = JSON.parse(allowed.stdout);
    expect(payload.mode).toBe("safe");
    expect(payload.dryRun).toBe(true);
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
    expect(doctorPayload.mcp_health).toBeTruthy();
    expect(doctorPayload.mcp_health.summary).toMatchObject({
      healthy: 0,
      degraded: 0,
      failing: 0
    });
    expect(Array.isArray(doctorPayload.mcp_health.servers)).toBe(true);

    const missingTest = await runCapturedCli(["mcp", "test", "missing", "--codex-home", codexHome]);
    expect(missingTest.code).toBe(1);
    expect(missingTest.stderr).toContain("MCP server \"missing\" not found");
  });

  it("mcp guided returns recommendations and mcp install supports profiles", async () => {
    const codexHome = await createCodexHome();

    const guided = await runCapturedCli([
      "mcp",
      "guided",
      "--goal",
      "docs",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(guided.code).toBe(0);
    const guidedPayload = JSON.parse(guided.stdout);
    expect(Array.isArray(guidedPayload.recommendations)).toBe(true);
    expect(guidedPayload.recommendations.length).toBeGreaterThan(0);
    expect(guidedPayload.recommendations.some((entry: { id: string }) => entry.id === "fetch")).toBe(true);

    const profileInstall = await runCapturedCli([
      "mcp",
      "install",
      "--profile",
      "recommended",
      "--codex-home",
      codexHome
    ]);
    expect(profileInstall.code).toBe(0);
    expect(profileInstall.stdout).toContain("filesystem");
    expect(profileInstall.stdout).toContain("fetch");

    const doctor = await runCapturedCli([
      "mcp",
      "doctor",
      "--connectivity",
      "--json",
      "--codex-home",
      codexHome
    ]);
    const doctorPayload = JSON.parse(doctor.stdout);
    expect(doctorPayload.mcp_health).toBeTruthy();
    const anyServer = doctorPayload.mcp_health.servers[0];
    expect(anyServer).toHaveProperty("health_score");
    expect(anyServer).toHaveProperty("suggested_fix_steps");
    expect(anyServer).toHaveProperty("test_messages");

    const guidedPlain = await runCapturedCli([
      "mcp",
      "guided",
      "--goal",
      "docs",
      "--plain",
      "--codex-home",
      codexHome
    ]);
    expect(guidedPlain.code).toBe(0);
    expect(hasEmoji(guidedPlain.stdout)).toBe(false);
  });

  it("skill enable and disable persist across registry loads", async () => {
    const codexHome = await createCodexHome();

    const disable = await runCapturedCli(["skill", "disable", "confidence-check", "--codex-home", codexHome]);
    expect(disable.code).toBe(0);

    const showDisabled = await runCapturedCli(["skill", "show", "confidence-check", "--json", "--codex-home", codexHome]);
    expect(showDisabled.code).toBe(0);
    const disabledPayload = JSON.parse(showDisabled.stdout);
    expect(disabledPayload.enabled).toBe(false);

    const enable = await runCapturedCli(["skill", "enable", "confidence-check", "--codex-home", codexHome]);
    expect(enable.code).toBe(0);

    const showEnabled = await runCapturedCli(["skill", "show", "confidence-check", "--json", "--codex-home", codexHome]);
    expect(showEnabled.code).toBe(0);
    const enabledPayload = JSON.parse(showEnabled.stdout);
    expect(enabledPayload.enabled).toBe(true);
  });

  it("session save/load/reflect works end-to-end", async () => {
    const codexHome = await createCodexHome();

    const save = await runCapturedCli([
      "session",
      "save",
      "Implemented cache invalidation",
      "--decision",
      "Use tag-based invalidation",
      "--next",
      "Add eviction metrics",
      "--mode",
      "deep",
      "--persona",
      "architect",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(save.code).toBe(0);
    const savePayload = JSON.parse(save.stdout);
    expect(savePayload.saved).toBe(true);
    expect(savePayload.record.summary).toContain("cache invalidation");

    const load = await runCapturedCli([
      "session",
      "load",
      "--recent",
      "5",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(load.code).toBe(0);
    const loadPayload = JSON.parse(load.stdout);
    expect(loadPayload.totalRecords).toBeGreaterThanOrEqual(1);
    expect(loadPayload.records[0].summary).toContain("cache invalidation");

    const reflect = await runCapturedCli([
      "session",
      "reflect",
      "--json",
      "--codex-home",
      codexHome
    ]);
    expect(reflect.code).toBe(0);
    const reflectPayload = JSON.parse(reflect.stdout);
    expect(reflectPayload.reflection).toBeTruthy();
    expect(reflectPayload.reflection.decisions).toContain("Use tag-based invalidation");
    expect(reflectPayload.reflection.pending_next_steps).toContain("Add eviction metrics");
  });

  it("run plan supports every built-in mode", async () => {
    const codexHome = await createCodexHome();
    for (const modeName of Object.keys(BUILTIN_MODES)) {
      const result = await runCapturedCli(["run", "plan", "--mode", modeName, "--json", "--codex-home", codexHome]);
      expect(result.code).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.mode).toBe(modeName);
    }
  });

  it("mode show --full prints mode content when a content file exists", async () => {
    const codexHome = await createCodexHome();
    const result = await runCapturedCli(["mode", "show", "deep", "--full", "--codex-home", codexHome]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("# Deep Mode Overlay");
    expect(result.stdout).not.toContain("Content file not found");
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

function hasEmoji(value: string): boolean {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(value);
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
