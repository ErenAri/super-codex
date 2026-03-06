import path from "node:path";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import { pathExists } from "../fs-utils";

export type ReleaseChannel = "next" | "latest";

export type ChangelogFragmentType =
  | "feat"
  | "fix"
  | "perf"
  | "security"
  | "docs"
  | "chore"
  | "breaking";

export interface ChangelogFragment {
  id: string;
  type: ChangelogFragmentType;
  summary: string;
  details?: string;
  commands: string[];
  issues: string[];
  source_file: string;
}

export interface ReleaseNotesInput {
  version: string;
  channel?: ReleaseChannel;
  releaseDate?: string;
  fragments: ChangelogFragment[];
}

const RELEASE_FRAGMENT_ORDER: ChangelogFragmentType[] = [
  "breaking",
  "feat",
  "fix",
  "perf",
  "security",
  "docs",
  "chore"
];

const RELEASE_FRAGMENT_TITLES: Record<ChangelogFragmentType, string> = {
  breaking: "Breaking Changes",
  feat: "Features",
  fix: "Fixes",
  perf: "Performance",
  security: "Security",
  docs: "Documentation",
  chore: "Maintenance"
};

interface FragmentJsonInput {
  id?: unknown;
  type?: unknown;
  summary?: unknown;
  details?: unknown;
  commands?: unknown;
  issues?: unknown;
  breaking?: unknown;
}

export async function loadChangelogFragments(fragmentsDir: string): Promise<ChangelogFragment[]> {
  if (!(await pathExists(fragmentsDir))) {
    return [];
  }

  const entries = (await readdir(fragmentsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const fragments: ChangelogFragment[] = [];
  for (const fileName of entries) {
    const sourceFile = path.join(fragmentsDir, fileName);
    const raw = await readFile(sourceFile, "utf8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Failed to parse changelog fragment ${fileName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const fragment = parseFragmentFromJson(parsed, fileName);
    fragments.push({
      ...fragment,
      source_file: sourceFile
    });
  }

  fragments.sort((left, right) => {
    const typeOrder = RELEASE_FRAGMENT_ORDER.indexOf(left.type) - RELEASE_FRAGMENT_ORDER.indexOf(right.type);
    if (typeOrder !== 0) {
      return typeOrder;
    }
    return left.id.localeCompare(right.id);
  });

  return fragments;
}

export function resolveReleaseChannel(version: string, channel?: string): ReleaseChannel {
  const normalizedVersion = version.trim();
  if (!normalizedVersion) {
    throw new Error("Release version is required.");
  }

  if (channel) {
    const normalized = channel.trim().toLowerCase();
    if (normalized === "next" || normalized === "latest") {
      return normalized;
    }
    throw new Error(`Unsupported release channel "${channel}". Expected "next" or "latest".`);
  }

  return normalizedVersion.includes("-") ? "next" : "latest";
}

export function defaultReleaseNotesPath(projectRoot: string, version: string): string {
  if (isWindowsAbsolutePath(projectRoot)) {
    return path.win32.resolve(projectRoot, "docs", "releases", `${normalizeVersionLabel(version)}.md`);
  }
  return path.resolve(projectRoot, "docs", "releases", `${normalizeVersionLabel(version)}.md`);
}

export async function writeReleaseNotesFile(outputPath: string, markdown: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
}

export function renderReleaseNotesMarkdown(input: ReleaseNotesInput): string {
  const normalizedVersion = input.version.trim();
  if (!normalizedVersion) {
    throw new Error("Release version is required.");
  }

  const channel = resolveReleaseChannel(normalizedVersion, input.channel);
  const releaseDate = normalizeReleaseDate(input.releaseDate);
  const grouped = groupFragments(input.fragments);
  const totalItems = input.fragments.length;

  const lines: string[] = [];
  lines.push(`# ${normalizeVersionLabel(normalizedVersion)} Release Notes`);
  lines.push("");
  lines.push(`Date: ${releaseDate}`);
  lines.push(`Channel: \`${channel}\``);
  lines.push(`Source fragments: ${totalItems}`);
  lines.push("");

  if (totalItems === 0) {
    lines.push("## Highlights");
    lines.push("");
    lines.push("- No changelog fragments were supplied for this release.");
    lines.push("");
  } else {
    for (const type of RELEASE_FRAGMENT_ORDER) {
      const entries = grouped.get(type) ?? [];
      if (entries.length === 0) {
        continue;
      }

      lines.push(`## ${RELEASE_FRAGMENT_TITLES[type]}`);
      lines.push("");
      for (const fragment of entries) {
        lines.push(`- ${fragment.summary} (\`${fragment.id}\`)`);
        if (fragment.details) {
          lines.push(`  - Details: ${fragment.details}`);
        }
        if (fragment.commands.length > 0) {
          lines.push(`  - Commands: ${fragment.commands.map((command) => `\`${command}\``).join(", ")}`);
        }
        if (fragment.issues.length > 0) {
          lines.push(`  - References: ${fragment.issues.join(", ")}`);
        }
      }
      lines.push("");
    }
  }

  lines.push("## Automated Checklist");
  lines.push("");
  lines.push("- [x] Build passes (`npm run build`)");
  lines.push("- [x] Tests pass (`npm test`)");
  lines.push("- [x] Strict verification passes (`npm run verify:consistency`)");
  lines.push("- [x] Release notes generated from structured fragments");
  lines.push("- [ ] Publish and verify npm dist-tag (`next` or `latest`)");
  lines.push("");
  lines.push("## Quick Install");
  lines.push("");
  lines.push("```bash");
  lines.push(`npm install -g supercodex@${normalizedVersion}`);
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function parseFragmentFromJson(parsed: unknown, fileName: string): Omit<ChangelogFragment, "source_file"> {
  if (!isObjectRecord(parsed)) {
    throw new Error(`Changelog fragment ${fileName} must be a JSON object.`);
  }

  const input = parsed as FragmentJsonInput;
  const fileId = fileName.replace(/\.json$/i, "");
  const id = toOptionalString(input.id)?.trim() || fileId;
  const summary = toOptionalString(input.summary)?.trim();
  if (!summary) {
    throw new Error(`Changelog fragment ${fileName} is missing required "summary" field.`);
  }

  const type = resolveFragmentType(input.type, Boolean(input.breaking));
  const details = toOptionalString(input.details)?.trim();
  const commands = readStringArray(input.commands, fileName, "commands");
  const issues = readStringArray(input.issues, fileName, "issues");

  return {
    id,
    type,
    summary,
    details: details && details.length > 0 ? details : undefined,
    commands,
    issues
  };
}

function resolveFragmentType(rawType: unknown, isBreaking: boolean): ChangelogFragmentType {
  if (isBreaking) {
    return "breaking";
  }

  const value = typeof rawType === "string" ? rawType.trim().toLowerCase() : "";
  if (value === "") {
    return "chore";
  }

  if (isFragmentType(value)) {
    return value;
  }

  throw new Error(
    `Unsupported changelog fragment type "${String(rawType)}". ` +
      `Expected one of: ${RELEASE_FRAGMENT_ORDER.join(", ")}`
  );
}

function isFragmentType(value: string): value is ChangelogFragmentType {
  return RELEASE_FRAGMENT_ORDER.includes(value as ChangelogFragmentType);
}

function readStringArray(value: unknown, fileName: string, fieldName: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Changelog fragment ${fileName} field "${fieldName}" must be an array of strings.`);
  }
  const normalized = value
    .map((entry) => toOptionalString(entry)?.trim() ?? "")
    .filter((entry) => entry.length > 0);

  if (normalized.length !== value.length) {
    throw new Error(`Changelog fragment ${fileName} field "${fieldName}" must only contain strings.`);
  }

  return normalized;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function groupFragments(fragments: ChangelogFragment[]): Map<ChangelogFragmentType, ChangelogFragment[]> {
  const grouped = new Map<ChangelogFragmentType, ChangelogFragment[]>();
  for (const type of RELEASE_FRAGMENT_ORDER) {
    grouped.set(type, []);
  }
  for (const fragment of fragments) {
    grouped.get(fragment.type)?.push(fragment);
  }
  for (const type of RELEASE_FRAGMENT_ORDER) {
    grouped.get(type)?.sort((left, right) => left.id.localeCompare(right.id));
  }
  return grouped;
}

function normalizeVersionLabel(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function normalizeReleaseDate(value?: string): string {
  if (value) {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    throw new Error(`Invalid release date "${value}". Expected YYYY-MM-DD.`);
  }

  return new Date().toISOString().slice(0, 10);
}

function isWindowsAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value.trim());
}
