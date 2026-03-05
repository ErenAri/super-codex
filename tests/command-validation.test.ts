import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SUPERCODEX_VERSION } from "../src/constants";
import { BUILTIN_COMMANDS } from "../src/registry/builtins";
import {
  evaluateCommandPromptQuality,
  validateSupercodexCommandSet
} from "../src/services/command-validation";

describe("command validation", () => {
  it("accepts the current built-in command set", () => {
    const result = validateSupercodexCommandSet(Object.keys(BUILTIN_COMMANDS));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("reports missing built-in commands", () => {
    const commandIds = Object.keys(BUILTIN_COMMANDS).filter((id) => id !== "install");
    const result = validateSupercodexCommandSet(commandIds);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("install");
  });

  it("evaluates command prompt quality for all bundled commands", () => {
    const quality = evaluateCommandPromptQuality();

    expect(quality.valid).toBe(true);
    expect(quality.score).toBeGreaterThanOrEqual(90);
    expect(quality.error_count).toBe(0);
    expect(quality.warn_count).toBe(0);
    expect(quality.commands.length).toBeGreaterThanOrEqual(29);
    expect(quality.issues).toEqual([]);
  });
});

describe("version metadata", () => {
  it("keeps runtime version in sync with package.json", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: string };

    expect(SUPERCODEX_VERSION).toBe(packageJson.version);
  });
});
