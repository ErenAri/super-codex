import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../src/cli";
import { cleanupTrackedTempDirs } from "./helpers/temp-cleanup";

const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";
const GOLDEN_DIR = path.join(process.cwd(), "tests", "fixtures", "golden");
const tmpDirs: string[] = [];

interface GoldenCase {
  name: string;
  args: string[];
  format: "json" | "plain";
}

const CASES: GoldenCase[] = [
  {
    name: "run-analyze.json",
    args: ["run", "analyze", "--json"],
    format: "json"
  },
  {
    name: "run-implement.json",
    args: ["run", "implement", "--json"],
    format: "json"
  },
  {
    name: "run-research.json",
    args: ["run", "research", "--json"],
    format: "json"
  },
  {
    name: "guide-security.json",
    args: ["guide", "security review for auth flow", "--json"],
    format: "json"
  },
  {
    name: "run-analyze.txt",
    args: ["run", "analyze"],
    format: "plain"
  },
  {
    name: "run-implement.txt",
    args: ["run", "implement"],
    format: "plain"
  },
  {
    name: "run-research.txt",
    args: ["run", "research"],
    format: "plain"
  },
  {
    name: "guide-security.txt",
    args: ["guide", "security review for auth flow", "--plain"],
    format: "plain"
  }
];

afterEach(async () => {
  await cleanupTrackedTempDirs(tmpDirs);
});

describe("golden command outputs", { timeout: 120000 }, () => {
  for (const entry of CASES) {
    it(entry.name, async () => {
      const codexHome = await createCodexHome();
      const result = await runCapturedCli([...entry.args, "--codex-home", codexHome]);
      expect(result.code).toBe(0);

      const normalized = normalizeOutput(result.stdout, {
        format: entry.format,
        codexHome
      });
      await assertGoldenFixture(entry.name, normalized);
    });
  }
});

async function createCodexHome(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-golden-test-"));
  tmpDirs.push(root);
  return path.join(root, ".codex");
}

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

function normalizeOutput(
  value: string,
  options: { format: "json" | "plain"; codexHome: string }
): string {
  if (options.format === "json") {
    const parsed = JSON.parse(value) as unknown;
    const normalized = normalizeJsonValue(parsed, options);
    return JSON.stringify(normalized, null, 2);
  }

  return normalizeText(value, options).trimEnd();
}

function normalizeJsonValue(
  value: unknown,
  options: { format: "json" | "plain"; codexHome: string }
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item, options));
  }

  if (value && typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      normalized[key] = normalizeJsonValue(item, options);
    }
    return normalized;
  }

  if (typeof value === "string") {
    return normalizeText(value, options);
  }

  return value;
}

function normalizeText(
  value: string,
  options: { format: "json" | "plain"; codexHome: string }
): string {
  const projectRoot = toForwardSlashes(process.cwd());
  const codexHome = toForwardSlashes(options.codexHome);

  let normalized = value.replace(/\r\n/g, "\n");
  normalized = toForwardSlashes(normalized);
  normalized = normalized.split(projectRoot).join("<PROJECT_ROOT>");
  normalized = normalized.split(codexHome).join("<CODEX_HOME>");
  return normalized;
}

function toForwardSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

async function assertGoldenFixture(name: string, actual: string): Promise<void> {
  const fixturePath = path.join(GOLDEN_DIR, name);
  if (UPDATE_GOLDEN) {
    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, `${actual}\n`, "utf8");
    return;
  }

  const expected = await readFile(fixturePath, "utf8");
  expect(actual).toBe(expected.trimEnd());
}
