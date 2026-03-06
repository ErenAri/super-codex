#!/usr/bin/env tsx
import path from "node:path";
import { readFile } from "node:fs/promises";

import {
  defaultReleaseNotesPath,
  loadChangelogFragments,
  renderReleaseNotesMarkdown,
  resolveReleaseChannel,
  writeReleaseNotesFile
} from "../src/services/release-notes";
import { pathExists } from "../src/fs-utils";

interface Args {
  version: string;
  channel?: string;
  fragmentsDir: string;
  output?: string;
  releaseDate?: string;
  check: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();
  const fragmentsDir = path.resolve(projectRoot, args.fragmentsDir);
  const fragments = await loadChangelogFragments(fragmentsDir);
  const channel = resolveReleaseChannel(args.version, args.channel);
  const outputPath = args.output
    ? path.resolve(projectRoot, args.output)
    : defaultReleaseNotesPath(projectRoot, args.version);

  const markdown = renderReleaseNotesMarkdown({
    version: args.version,
    channel,
    releaseDate: args.releaseDate,
    fragments
  });

  if (args.check) {
    if (!(await pathExists(outputPath))) {
      throw new Error(`Release notes file is missing: ${outputPath}`);
    }
    const current = await readFile(outputPath, "utf8");
    if (current !== markdown) {
      throw new Error(`Release notes out of date at ${outputPath}. Run: npm run release:notes -- --version ${args.version}`);
    }
    console.log(`Release notes are up to date: ${outputPath}`);
    console.log(`Fragments loaded: ${fragments.length}`);
    return;
  }

  await writeReleaseNotesFile(outputPath, markdown);
  console.log(`Release notes written: ${outputPath}`);
  console.log(`Channel: ${channel}`);
  console.log(`Fragments loaded: ${fragments.length}`);
}

function parseArgs(argv: string[]): Args {
  const parsed: Args = {
    version: "",
    fragmentsDir: "changelog/fragments",
    check: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--version") {
      parsed.version = argv[++index] ?? "";
      continue;
    }
    if (arg === "--channel") {
      parsed.channel = argv[++index] ?? "";
      continue;
    }
    if (arg === "--fragments-dir") {
      parsed.fragmentsDir = argv[++index] ?? parsed.fragmentsDir;
      continue;
    }
    if (arg === "--output") {
      parsed.output = argv[++index] ?? "";
      continue;
    }
    if (arg === "--date") {
      parsed.releaseDate = argv[++index] ?? "";
      continue;
    }
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.version.trim()) {
    throw new Error("Missing required argument: --version <value>");
  }

  return parsed;
}

function printHelpAndExit(code: number): never {
  console.log("Usage: tsx scripts/generate-release-notes.ts --version <x.y.z[-tag.N]> [options]");
  console.log("");
  console.log("Options:");
  console.log("  --channel <next|latest>      Override channel (default inferred from version)");
  console.log("  --fragments-dir <path>       Changelog fragments directory (default: changelog/fragments)");
  console.log("  --output <path>              Output markdown path (default: docs/releases/v<version>.md)");
  console.log("  --date <YYYY-MM-DD>          Release date override");
  console.log("  --check                      Check existing file matches generated output");
  console.log("  --help                       Show this help");
  process.exit(code);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
