#!/usr/bin/env tsx
interface Args {
  packageName: string;
  version: string;
  distTag: string;
  registry: string;
  retries: number;
  intervalMs: number;
  json: boolean;
}

interface VerifyAttempt {
  attempt: number;
  versionFound: boolean;
  distTag: string;
  distTagVersion?: string;
  ok: boolean;
}

interface VerifyResult {
  ok: boolean;
  package: string;
  version: string;
  distTag: string;
  attempts: number;
  last: VerifyAttempt;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await verifyPublishedVersion(args);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Package: ${result.package}`);
    console.log(`Expected version: ${result.version}`);
    console.log(`Expected dist-tag: ${result.distTag}`);
    console.log(`Attempts: ${result.attempts}`);
    console.log(`Version found: ${result.last.versionFound ? "yes" : "no"}`);
    console.log(`Dist-tag version: ${result.last.distTagVersion ?? "(missing)"}`);
    console.log(`Publish verification: ${result.ok ? "pass" : "fail"}`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

async function verifyPublishedVersion(args: Args): Promise<VerifyResult> {
  let lastAttempt: VerifyAttempt | undefined;

  for (let attempt = 1; attempt <= args.retries; attempt += 1) {
    const payload = await loadPackagePayload(args.registry, args.packageName);
    const distTags = readRecord(payload["dist-tags"]);
    const versions = readRecord(payload.versions);
    const distTagVersion = typeof distTags[args.distTag] === "string" ? (distTags[args.distTag] as string) : undefined;
    const versionFound = Boolean(versions[args.version]);
    const ok = versionFound && distTagVersion === args.version;

    lastAttempt = {
      attempt,
      versionFound,
      distTag: args.distTag,
      distTagVersion,
      ok
    };

    if (ok) {
      return {
        ok: true,
        package: args.packageName,
        version: args.version,
        distTag: args.distTag,
        attempts: attempt,
        last: lastAttempt
      };
    }

    if (attempt < args.retries) {
      await delay(args.intervalMs);
    }
  }

  if (!lastAttempt) {
    throw new Error("Internal error: no publish verification attempts were executed.");
  }

  return {
    ok: false,
    package: args.packageName,
    version: args.version,
    distTag: args.distTag,
    attempts: args.retries,
    last: lastAttempt
  };
}

async function loadPackagePayload(registry: string, packageName: string): Promise<Record<string, unknown>> {
  const normalizedRegistry = registry.endsWith("/") ? registry.slice(0, -1) : registry;
  const packagePath = packageName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("%2f");
  const response = await fetch(`${normalizedRegistry}/${packagePath}`);
  if (!response.ok) {
    throw new Error(`Failed to read npm registry package metadata (${response.status} ${response.statusText}).`);
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload)) {
    throw new Error("Invalid npm registry payload.");
  }
  return payload;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    packageName: "supercodex",
    version: "",
    distTag: "",
    registry: "https://registry.npmjs.org",
    retries: 10,
    intervalMs: 5000,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--package") {
      args.packageName = argv[++index] ?? "";
      continue;
    }
    if (arg === "--version") {
      args.version = argv[++index] ?? "";
      continue;
    }
    if (arg === "--dist-tag") {
      args.distTag = argv[++index] ?? "";
      continue;
    }
    if (arg === "--registry") {
      args.registry = argv[++index] ?? "";
      continue;
    }
    if (arg === "--retries") {
      args.retries = parsePositiveInt(argv[++index] ?? "", "--retries");
      continue;
    }
    if (arg === "--interval-ms") {
      args.intervalMs = parsePositiveInt(argv[++index] ?? "", "--interval-ms");
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.version.trim()) {
    throw new Error("Missing required argument: --version <value>");
  }
  if (!args.packageName.trim()) {
    throw new Error("Missing required argument: --package <value>");
  }
  if (!args.distTag.trim()) {
    args.distTag = args.version.includes("-") ? "next" : "latest";
  }

  return args;
}

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} expects a positive integer.`);
  }
  return parsed;
}

function printHelpAndExit(code: number): never {
  console.log("Usage: tsx scripts/verify-npm-publish.ts --version <x.y.z[-tag.N]> [options]");
  console.log("");
  console.log("Options:");
  console.log("  --package <name>          npm package name (default: supercodex)");
  console.log("  --dist-tag <tag>          npm dist-tag to verify (default: inferred from version)");
  console.log("  --registry <url>          npm registry URL (default: https://registry.npmjs.org)");
  console.log("  --retries <count>         Retry attempts (default: 10)");
  console.log("  --interval-ms <ms>        Delay between attempts (default: 5000)");
  console.log("  --json                    Output JSON");
  console.log("  --help                    Show help");
  process.exit(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
