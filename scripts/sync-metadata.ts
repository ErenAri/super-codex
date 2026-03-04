import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import { listContentFiles } from "../src/content-loader";
import {
  BUILTIN_AGENT_DEFINITIONS,
  BUILTIN_COMMANDS,
  BUILTIN_MODES,
  BUILTIN_PERSONAS,
  BUILTIN_SKILLS
} from "../src/registry/builtins";

type CommandMode = "write" | "check";

interface MetadataSnapshot {
  command_definitions_total: number;
  workflow_command_definitions: number;
  workflow_base_definitions: number;
  workflow_extended_definitions: number;
  workflow_base_files: number;
  workflow_command_files: number;
  workflow_total_expected: number;
  agent_definitions: number;
  agent_content_files: number;
  mode_definitions: number;
  mode_content_files: number;
  persona_definitions: number;
  persona_content_files: number;
  skill_definitions: number;
  skill_content_files: number;
  invariants: Array<{ ok: boolean; message: string }>;
}

const MARKER_START = "<!-- supercodex:metadata:start -->";
const MARKER_END = "<!-- supercodex:metadata:end -->";
const README_ANCHOR = "## Why SuperCodex";

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const root = path.resolve(__dirname, "..");
  const readmePath = path.join(root, "README.md");
  const metadataDocPath = path.join(root, "docs", "METADATA.md");

  const snapshot = collectSnapshot();
  const invariantErrors = snapshot.invariants.filter((item) => !item.ok);
  if (invariantErrors.length > 0) {
    const details = invariantErrors.map((entry) => `- ${entry.message}`).join("\n");
    throw new Error(`Metadata invariants failed:\n${details}`);
  }

  const readmeCurrent = await readFile(readmePath, "utf8");
  const readmeExpected = upsertManagedBlock(readmeCurrent, renderReadmeBlock(snapshot));

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

function collectSnapshot(): MetadataSnapshot {
  const allCommandIds = Object.keys(BUILTIN_COMMANDS).sort();
  const workflowCommandIds = allCommandIds.filter((id) => id.startsWith("run."));
  const baseWorkflowNames = new Set(["plan", "review", "refactor", "debug"]);
  const baseWorkflowDefinitions = workflowCommandIds.filter((id) => baseWorkflowNames.has(id.slice(4)));
  const extendedWorkflowDefinitions = workflowCommandIds.filter((id) => !baseWorkflowNames.has(id.slice(4)));

  const workflowBaseFiles = listContentFiles("workflows");
  const workflowCommandFiles = listContentFiles("commands");
  const workflowCommandFileNames = new Set(
    workflowCommandFiles.map((file) => file.replace(/\.md$/i, ""))
  );
  const extendedWorkflowNames = new Set(extendedWorkflowDefinitions.map((id) => id.slice(4)));

  const agentContentFiles = listContentFiles("agents");
  const modeContentFiles = listContentFiles("modes");
  const personaContentFiles = listContentFiles("personas");
  const skillContentFiles = listContentFiles("skills").filter((file) =>
    /(^|\/)SKILL\.md$/i.test(file)
  );

  const invariants: Array<{ ok: boolean; message: string }> = [
    {
      ok: workflowCommandIds.length === workflowBaseFiles.length + workflowCommandFiles.length,
      message:
        "run.* command definitions must equal workflow files + command workflow files."
    },
    {
      ok: extendedWorkflowNames.size === workflowCommandFileNames.size,
      message: "run.* extended workflow definitions must match content/commands/*.md files."
    },
    {
      ok: agentContentFiles.length === Object.keys(BUILTIN_AGENT_DEFINITIONS).length,
      message: "Built-in agent definitions must match content/agents/*.md files."
    },
    {
      ok: modeContentFiles.length === Object.keys(BUILTIN_MODES).length,
      message: "Built-in mode definitions must match content/modes/*.md files."
    }
  ];

  return {
    command_definitions_total: allCommandIds.length,
    workflow_command_definitions: workflowCommandIds.length,
    workflow_base_definitions: baseWorkflowDefinitions.length,
    workflow_extended_definitions: extendedWorkflowDefinitions.length,
    workflow_base_files: workflowBaseFiles.length,
    workflow_command_files: workflowCommandFiles.length,
    workflow_total_expected: workflowBaseFiles.length + workflowCommandFiles.length,
    agent_definitions: Object.keys(BUILTIN_AGENT_DEFINITIONS).length,
    agent_content_files: agentContentFiles.length,
    mode_definitions: Object.keys(BUILTIN_MODES).length,
    mode_content_files: modeContentFiles.length,
    persona_definitions: Object.keys(BUILTIN_PERSONAS).length,
    persona_content_files: personaContentFiles.length,
    skill_definitions: Object.keys(BUILTIN_SKILLS).length,
    skill_content_files: skillContentFiles.length,
    invariants
  };
}

function renderReadmeBlock(snapshot: MetadataSnapshot): string {
  return [
    MARKER_START,
    "## Framework Snapshot",
    "",
    "- Workflow commands: " +
      `${snapshot.workflow_command_definitions} (` +
      `${snapshot.workflow_base_definitions} base + ` +
      `${snapshot.workflow_extended_definitions} extended)`,
    "- Workflow content files: " +
      `${snapshot.workflow_total_expected} (` +
      `${snapshot.workflow_base_files} in content/workflows + ` +
      `${snapshot.workflow_command_files} in content/commands)`,
    `- Agent definitions: ${snapshot.agent_definitions}`,
    `- Mode definitions: ${snapshot.mode_definitions}`,
    `- Persona definitions: ${snapshot.persona_definitions}`,
    `- Skill definitions: ${snapshot.skill_definitions}`,
    MARKER_END
  ].join("\n");
}

function renderMetadataDoc(snapshot: MetadataSnapshot): string {
  const invariantRows = snapshot.invariants
    .map((entry) => `| ${entry.ok ? "pass" : "fail"} | ${entry.message} |`)
    .join("\n");

  return [
    "# SuperCodex Metadata",
    "",
    "This file is auto-generated from framework source-of-truth files.",
    "Do not edit manually. Run `npm run metadata:sync`.",
    "",
    "## Counts",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Total command definitions | ${snapshot.command_definitions_total} |`,
    `| Workflow command definitions (run.*) | ${snapshot.workflow_command_definitions} |`,
    `| Base workflow definitions | ${snapshot.workflow_base_definitions} |`,
    `| Extended workflow definitions | ${snapshot.workflow_extended_definitions} |`,
    `| Workflow base files (content/workflows) | ${snapshot.workflow_base_files} |`,
    `| Workflow command files (content/commands) | ${snapshot.workflow_command_files} |`,
    `| Agent definitions | ${snapshot.agent_definitions} |`,
    `| Agent content files | ${snapshot.agent_content_files} |`,
    `| Mode definitions | ${snapshot.mode_definitions} |`,
    `| Mode content files | ${snapshot.mode_content_files} |`,
    `| Persona definitions | ${snapshot.persona_definitions} |`,
    `| Persona content files | ${snapshot.persona_content_files} |`,
    `| Skill definitions | ${snapshot.skill_definitions} |`,
    `| Skill content files | ${snapshot.skill_content_files} |`,
    "",
    "## Invariants",
    "",
    "| Status | Rule |",
    "| --- | --- |",
    invariantRows,
    ""
  ].join("\n");
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

function upsertManagedBlock(content: string, block: string): string {
  const startIndex = content.indexOf(MARKER_START);
  const endIndex = content.indexOf(MARKER_END);

  if (startIndex >= 0 && endIndex > startIndex) {
    const before = content.slice(0, startIndex).trimEnd();
    const after = content.slice(endIndex + MARKER_END.length).trimStart();
    return `${before}\n\n${block}\n\n${after}`.trimEnd() + "\n";
  }

  const anchorIndex = content.indexOf(README_ANCHOR);
  if (anchorIndex < 0) {
    throw new Error(`Could not find README anchor "${README_ANCHOR}".`);
  }

  const before = content.slice(0, anchorIndex).trimEnd();
  const after = content.slice(anchorIndex).trimStart();
  return `${before}\n\n${block}\n\n${after}`.trimEnd() + "\n";
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
