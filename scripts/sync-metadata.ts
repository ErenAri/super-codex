import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import {
  collectMetadataSnapshot,
  renderMetadataDoc,
  renderMetadataReadmeBlock,
  upsertMetadataReadmeBlock
} from "../src/services/metadata-sync";

type CommandMode = "write" | "check";

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const root = path.resolve(__dirname, "..");
  const readmePath = path.join(root, "README.md");
  const metadataDocPath = path.join(root, "docs", "METADATA.md");

  const snapshot = collectMetadataSnapshot();
  const invariantErrors = snapshot.invariants.filter((item) => !item.ok);
  if (invariantErrors.length > 0) {
    const details = invariantErrors.map((entry) => `- ${entry.message}`).join("\n");
    throw new Error(`Metadata invariants failed:\n${details}`);
  }

  const readmeCurrent = await readFile(readmePath, "utf8");
  const readmeExpected = upsertMetadataReadmeBlock(readmeCurrent, renderMetadataReadmeBlock(snapshot));

  const metadataExpected = renderMetadataDoc(snapshot);
  const metadataCurrent = await readIfExists(metadataDocPath);

  if (mode === "check") {
    const readmeDirty = readmeCurrent !== readmeExpected;
    const metadataDirty = metadataCurrent !== metadataExpected;
    if (readmeDirty || metadataDirty) {
      const changed: string[] = [];
      if (readmeDirty) changed.push("README.md");
      if (metadataDirty) changed.push("docs/METADATA.md");
      throw new Error(
        `Metadata drift detected in ${changed.join(", ")}. Run "npm run metadata:sync".`
      );
    }
    console.log("Metadata is up to date.");
    return;
  }

  if (readmeCurrent !== readmeExpected) {
    await writeFile(readmePath, readmeExpected, "utf8");
    console.log("Updated README.md metadata block.");
  }
  if (metadataCurrent !== metadataExpected) {
    await writeFile(metadataDocPath, metadataExpected, "utf8");
    console.log("Updated docs/METADATA.md.");
  }
}

function parseMode(args: string[]): CommandMode {
  if (args.includes("--write")) {
    return "write";
  }
  if (args.includes("--check")) {
    return "check";
  }
  throw new Error('Usage: tsx scripts/sync-metadata.ts --write|--check');
}

async function readIfExists(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
