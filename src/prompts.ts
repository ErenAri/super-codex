import path from "node:path";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

import { pathExists } from "./fs-utils";

export const BUNDLED_PROMPTS: Record<string, string> = {
  "plan.md": `# SuperCodex Plan

## Goal
- State the objective in one sentence.

## Constraints
- List technical, time, and safety constraints.

## Plan
1. Define scope and assumptions.
2. Break work into small, verifiable steps.
3. Execute with checkpoints.

## Checkpoints
- [ ] Checkpoint 1: baseline passes
- [ ] Checkpoint 2: change implemented
- [ ] Checkpoint 3: tests + docs updated

## Exit Criteria
- Concrete definition of done.
`,
  "review.md": `# SuperCodex Review

## Review Rubric
1. Correctness and behavioral regressions
2. Security and data safety
3. Performance and scalability
4. Maintainability and readability
5. Test coverage and failure modes

## Risk Scan
- What can break at runtime?
- What assumptions are unverified?
- Which paths are untested?

## Output
- Findings ordered by severity with file references.
- Residual risks and recommended follow-ups.
`,
  "refactor.md": `# SuperCodex Refactor

## Refactor Safety Steps
1. Lock behavior with tests first.
2. Refactor one seam at a time.
3. Keep commits small and reversible.
4. Re-run focused and full tests.

## Guardrails
- No broad rewrites without test coverage.
- Preserve public contracts.
- Document any deliberate behavior changes.
`,
  "debug.md": `# SuperCodex Debug

## Hypothesis Loop
1. Define observable failure.
2. Form one hypothesis.
3. Design the smallest experiment.
4. Run and record result.
5. Confirm or reject, then iterate.

## Notes
- Prefer instrumentation over guessing.
- Change one variable at a time.
- Stop when root cause is validated by a reproducer.
`,
  "modes/deep.md": `# Deep Mode Overlay

- Prioritize architecture-level reasoning.
- Enumerate tradeoffs before implementation.
- Highlight irreversible decisions.
`,
  "modes/fast.md": `# Fast Mode Overlay

- Optimize for shortest safe path to done.
- Keep scope tight and changes minimal.
- Prefer deterministic small diffs.
`,
  "personas/architect.md": `# Architect Persona

- Focus on boundaries, contracts, and long-term maintainability.
- Surface tradeoffs and migration impacts.
`,
  "personas/reviewer.md": `# Reviewer Persona

- Focus on correctness, regressions, and security risks.
- Prioritize findings by severity.
`
};

export interface PromptInstallResult {
  changed: boolean;
  writtenFiles: string[];
}

export function listBundledPrompts(): string[] {
  return Object.keys(BUNDLED_PROMPTS).sort();
}

export async function installPromptPack(promptPackDir: string): Promise<PromptInstallResult> {
  await mkdir(promptPackDir, { recursive: true });

  let changed = false;
  const writtenFiles: string[] = [];

  for (const fileName of listBundledPrompts()) {
    const targetPath = path.join(promptPackDir, fileName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    const nextContent = BUNDLED_PROMPTS[fileName];
    let currentContent: string | null = null;

    if (await pathExists(targetPath)) {
      currentContent = await readFile(targetPath, "utf8");
    }

    if (currentContent !== nextContent) {
      await writeFile(targetPath, nextContent, "utf8");
      changed = true;
      writtenFiles.push(targetPath);
    }
  }

  return { changed, writtenFiles };
}

export async function removePromptPack(promptPackDir: string): Promise<boolean> {
  if (!(await pathExists(promptPackDir))) {
    return false;
  }

  await rm(promptPackDir, { recursive: true, force: true });
  return true;
}

export async function listInstalledPrompts(promptPackDir: string): Promise<string[]> {
  if (!(await pathExists(promptPackDir))) {
    return [];
  }

  return walkPromptFiles(promptPackDir, "");
}

async function walkPromptFiles(baseDir: string, relativeDir: string): Promise<string[]> {
  const targetDir = path.join(baseDir, relativeDir);
  const entries = await readdir(targetDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const children = await walkPromptFiles(baseDir, relativePath);
      files.push(...children);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath.replaceAll("\\", "/"));
    }
  }

  return files.sort();
}
