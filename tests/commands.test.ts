import { describe, expect, it } from "vitest";

import { contentFileExists, listContentFiles, loadContentFile } from "../src/content-loader";
import { BUILTIN_COMMANDS } from "../src/registry/builtins";
import { BUILTIN_ALIASES } from "../src/registry/aliases";

const EXPECTED_COMMAND_FILES = [
  "analyze.md",
  "brainstorm.md",
  "build.md",
  "business-panel.md",
  "cleanup.md",
  "design.md",
  "document.md",
  "estimate.md",
  "explain.md",
  "git.md",
  "help.md",
  "implement.md",
  "improve.md",
  "index.md",
  "index-repo.md",
  "load.md",
  "pm.md",
  "recommend.md",
  "reflect.md",
  "research.md",
  "save.md",
  "sc.md",
  "select-tool.md",
  "spawn.md",
  "spec-panel.md",
  "task.md",
  "test.md",
  "troubleshoot.md",
  "workflow.md"
];

describe("command content files", () => {
  it("has all 29 expected command files", () => {
    const files = listContentFiles("commands");
    for (const expected of EXPECTED_COMMAND_FILES) {
      expect(files).toContain(expected);
    }
    expect(files.length).toBeGreaterThanOrEqual(29);
  });

  it("each command file exists and is readable", () => {
    for (const file of EXPECTED_COMMAND_FILES) {
      expect(contentFileExists("commands", file)).toBe(true);
    }
  });

  it("each command file has non-trivial content", () => {
    for (const file of EXPECTED_COMMAND_FILES) {
      const content = loadContentFile("commands", file);
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain("#");
    }
  });

  it("every run.* command in builtins has a matching content file or is a base workflow", () => {
    const baseWorkflows = new Set(["plan", "review", "refactor", "debug"]);
    for (const commandId of Object.keys(BUILTIN_COMMANDS)) {
      if (!commandId.startsWith("run.")) continue;
      const workflowName = commandId.slice(4);
      if (baseWorkflows.has(workflowName)) continue;
      expect(contentFileExists("commands", `${workflowName}.md`)).toBe(true);
    }
  });

  it("every alias with a run.* target resolves to a registered command", () => {
    for (const alias of Object.values(BUILTIN_ALIASES)) {
      expect(Object.hasOwn(BUILTIN_COMMANDS, alias.target)).toBe(true);
    }
  });
});
