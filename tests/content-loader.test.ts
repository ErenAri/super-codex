import { describe, expect, it } from "vitest";

import {
  contentFileExists,
  getContentDir,
  listContentFiles,
  loadContentFile,
  loadContentFileAsync
} from "../src/content-loader";

describe("content-loader", () => {
  it("getContentDir returns a path ending in content", () => {
    const dir = getContentDir();
    expect(dir).toMatch(/content$/);
  });

  it("loadContentFile reads workflow files", () => {
    const content = loadContentFile("workflows", "plan.md");
    expect(content).toContain("# SuperCodex Plan");
  });

  it("loadContentFile reads mode overlay files", () => {
    const content = loadContentFile("modes", "deep.md");
    expect(content).toContain("# Deep Mode Overlay");
  });

  it("loadContentFile reads persona files", () => {
    const content = loadContentFile("personas", "architect.md");
    expect(content).toContain("# Architect Persona");
  });

  it("loadContentFile throws on missing file", () => {
    expect(() => loadContentFile("workflows", "nonexistent.md")).toThrow("Content file not found");
  });

  it("loadContentFileAsync reads files", async () => {
    const content = await loadContentFileAsync("workflows", "review.md");
    expect(content).toContain("# SuperCodex Review");
  });

  it("loadContentFileAsync throws on missing file", async () => {
    await expect(loadContentFileAsync("workflows", "nonexistent.md")).rejects.toThrow("Content file not found");
  });

  it("listContentFiles returns workflow files", () => {
    const files = listContentFiles("workflows");
    expect(files).toContain("debug.md");
    expect(files).toContain("plan.md");
    expect(files).toContain("refactor.md");
    expect(files).toContain("review.md");
  });

  it("listContentFiles returns mode files", () => {
    const files = listContentFiles("modes");
    expect(files).toContain("deep.md");
    expect(files).toContain("fast.md");
  });

  it("listContentFiles returns persona files", () => {
    const files = listContentFiles("personas");
    expect(files).toContain("architect.md");
    expect(files).toContain("reviewer.md");
  });

  it("listContentFiles returns empty array for missing category", () => {
    const files = listContentFiles("nonexistent" as never);
    expect(files).toEqual([]);
  });

  it("contentFileExists returns true for existing files", () => {
    expect(contentFileExists("workflows", "plan.md")).toBe(true);
  });

  it("contentFileExists returns false for missing files", () => {
    expect(contentFileExists("workflows", "nonexistent.md")).toBe(false);
  });
});
