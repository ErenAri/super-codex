import { describe, expect, it } from "vitest";

import { loadContentFile } from "../src/content-loader";
import { extractPurposeSummary, formatDisplayName, truncateText } from "../src/workflow-summary";

describe("workflow summary utilities", () => {
  it("extracts purpose summary from command workflows", () => {
    const scaffold = loadContentFile("commands", "analyze.md");
    const summary = extractPurposeSummary(scaffold, 110);

    expect(summary).toContain("Perform deep structural and qualitative analysis");
  });

  it("returns null when no paragraph-style summary exists", () => {
    const scaffold = loadContentFile("workflows", "plan.md");
    const summary = extractPurposeSummary(scaffold, 110);

    expect(summary).toBeNull();
  });

  it("formats display names from kebab-case identifiers", () => {
    expect(formatDisplayName("index-repo")).toBe("Index Repo");
    expect(formatDisplayName("spec-panel")).toBe("Spec Panel");
  });

  it("truncates long text safely", () => {
    expect(truncateText("abcd", 10)).toBe("abcd");
    expect(truncateText("abcdefghijkl", 8)).toBe("abcde...");
  });
});
