import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import {
  defaultReleaseNotesPath,
  loadChangelogFragments,
  renderReleaseNotesMarkdown,
  resolveReleaseChannel
} from "../src/services/release-notes";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const tmpDirs: string[] = [];

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describe("release notes service", () => {
  it("loads and sorts structured changelog fragments", async () => {
    const root = await createTempDir();
    const fragmentsDir = path.join(root, "changelog", "fragments");
    await mkdir(fragmentsDir, { recursive: true });

    await writeFile(
      path.join(fragmentsDir, "2026-03-06-b.json"),
      JSON.stringify({
        id: "B",
        type: "fix",
        summary: "Fixed lock refresh edge case."
      }, null, 2),
      "utf8"
    );
    await writeFile(
      path.join(fragmentsDir, "2026-03-06-a.json"),
      JSON.stringify({
        id: "A",
        type: "feat",
        summary: "Added release-train dispatch workflow.",
        commands: ["supercodex verify --strict"]
      }, null, 2),
      "utf8"
    );

    const fragments = await loadChangelogFragments(fragmentsDir);
    expect(fragments).toHaveLength(2);
    expect(fragments.map((entry) => entry.id)).toEqual(["A", "B"]);
    expect(fragments[0].commands).toEqual(["supercodex verify --strict"]);
  });

  it("renders release notes markdown with grouped sections", () => {
    const markdown = renderReleaseNotesMarkdown({
      version: "2.0.0-beta.2",
      releaseDate: "2026-03-06",
      fragments: [
        {
          id: "SC2-009",
          type: "feat",
          summary: "Added release train workflow.",
          details: "Dispatch now supports canary and stable lanes.",
          commands: ["npm run release:notes -- --version 2.0.0-beta.2"],
          issues: ["SC2-009"],
          source_file: "fragment-a.json"
        }
      ]
    });

    expect(markdown).toContain("# v2.0.0-beta.2 Release Notes");
    expect(markdown).toContain("Channel: `next`");
    expect(markdown).toContain("## Features");
    expect(markdown).toContain("SC2-009");
    expect(markdown).toContain("Automated Checklist");
  });

  it("infers release channel from version when channel is omitted", () => {
    expect(resolveReleaseChannel("2.0.0-beta.2")).toBe("next");
    expect(resolveReleaseChannel("2.0.0")).toBe("latest");
  });

  it("returns deterministic default release note output path", () => {
    const outputPath = defaultReleaseNotesPath("C:/repo/super-codex", "2.0.0-beta.2");
    expect(outputPath.replace(/\\/g, "/")).toBe("C:/repo/super-codex/docs/releases/v2.0.0-beta.2.md");
  });

  it("throws a clear error for malformed fragment JSON", async () => {
    const root = await createTempDir();
    const fragmentsDir = path.join(root, "changelog", "fragments");
    await mkdir(fragmentsDir, { recursive: true });
    await writeFile(path.join(fragmentsDir, "bad.json"), "{invalid}", "utf8");

    await expect(loadChangelogFragments(fragmentsDir)).rejects.toThrow(/Failed to parse changelog fragment/i);
  });
});

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-release-notes-test-"));
  tmpDirs.push(root);
  return root;
}
