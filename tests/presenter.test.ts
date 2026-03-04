import { describe, expect, it } from "vitest";

import { icon, line, resolveOutputStyle } from "../src/commands/presenter";

describe("presenter", () => {
  it("resolves decorated style in interactive mode", () => {
    expect(resolveOutputStyle({ isTTY: true })).toBe("decorated");
  });

  it("forces plain style for json and --plain", () => {
    expect(resolveOutputStyle({ isTTY: true, json: true })).toBe("plain");
    expect(resolveOutputStyle({ isTTY: true, plain: true })).toBe("plain");
  });

  it("uses plain icons when style is plain", () => {
    expect(icon("ok", "plain")).toBe("[ok]");
    expect(line("warn", "warning", "plain")).toContain("[warn]");
  });

  it("uses emoji icons when style is decorated", () => {
    expect(icon("ok", "decorated")).toBe("✅");
    expect(line("tip", "helpful", "decorated")).toContain("💡");
  });
});
