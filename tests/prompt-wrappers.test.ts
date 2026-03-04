import { describe, expect, it } from "vitest";

import { listBundledInteractivePromptCommands, renderInteractivePrompt } from "../src/prompts";
import { BUILTIN_ALIASES } from "../src/registry/aliases";

describe("interactive prompt wrappers", () => {
  it("keeps supercodex-* wrapper filenames for codex prompt compatibility", () => {
    const files = listBundledInteractivePromptCommands();
    expect(files).toContain("supercodex-research.md");
    expect(files.every((file) => file.startsWith("supercodex-"))).toBe(true);
  });

  it("renders workflow-command scaffold for aliases that differ from command filename", () => {
    const alias = BUILTIN_ALIASES.brainstorming;
    const prompt = renderInteractivePrompt(alias, "brainstorm");

    expect(prompt).toContain("description: SuperCodex Brainstorming:");
    expect(prompt).toContain("(balanced/educator)");
    expect(prompt).toContain('argument-hint: "<problem|goal|constraints>"');
    expect(prompt).toContain("- Slash Command: /prompts:supercodex-brainstorming");
    expect(prompt).toContain("- SuperCodex Alias: /supercodex:brainstorming (short: /sc:brainstorming)");
    expect(prompt).toContain("- Intent: Generate a wide range of creative ideas");
    expect(prompt).toContain("- Pack: core-planning");
    expect(prompt).toContain("## Workflow Scaffold");
    expect(prompt).toContain("## Purpose");
    expect(prompt).toContain("Generate a wide range of creative ideas");
  });

  it("falls back to base workflow scaffold for plan aliases", () => {
    const alias = BUILTIN_ALIASES.spec;
    const prompt = renderInteractivePrompt(alias, "plan");

    expect(prompt).toContain("description: SuperCodex Spec: Specification-oriented planning workflow (deep/architect)");
    expect(prompt).toContain('argument-hint: "<goal|constraints|deliverable>"');
    expect(prompt).toContain("- Workflow: plan");
    expect(prompt).toContain("## Workflow Scaffold");
    expect(prompt).toContain("# SuperCodex Plan");
    expect(prompt).toContain("## Goal");
  });

  it("uses a richer description than the previous generic wrapper label", () => {
    const alias = BUILTIN_ALIASES.research;
    const prompt = renderInteractivePrompt(alias, "research");

    expect(prompt).not.toContain("description: SuperCodex alias /sc:research");
    expect(prompt).toContain("description: SuperCodex Research: Conduct deep, methodical research");
    expect(prompt).toContain("(deep/architect)");
  });
});
