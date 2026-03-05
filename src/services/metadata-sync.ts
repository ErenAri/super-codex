import {
  BUILTIN_AGENT_DEFINITIONS,
  BUILTIN_COMMANDS,
  BUILTIN_MODES,
  BUILTIN_PERSONAS,
  BUILTIN_SKILLS
} from "../registry/builtins";
import { listContentFiles } from "../content-loader";

export interface MetadataInvariant {
  ok: boolean;
  message: string;
}

export interface MetadataSnapshot {
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
  invariants: MetadataInvariant[];
}

export const METADATA_MARKER_START = "<!-- supercodex:metadata:start -->";
export const METADATA_MARKER_END = "<!-- supercodex:metadata:end -->";
export const METADATA_README_ANCHOR = "## Why SuperCodex";

export function collectMetadataSnapshot(): MetadataSnapshot {
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

  const invariants: MetadataInvariant[] = [
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

export function renderMetadataReadmeBlock(snapshot: MetadataSnapshot): string {
  return [
    METADATA_MARKER_START,
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
    METADATA_MARKER_END
  ].join("\n");
}

export function renderMetadataDoc(snapshot: MetadataSnapshot): string {
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

export function upsertMetadataReadmeBlock(content: string, block: string): string {
  const startIndex = content.indexOf(METADATA_MARKER_START);
  const endIndex = content.indexOf(METADATA_MARKER_END);

  if (startIndex >= 0 && endIndex > startIndex) {
    const before = content.slice(0, startIndex).trimEnd();
    const after = content.slice(endIndex + METADATA_MARKER_END.length).trimStart();
    return `${before}\n\n${block}\n\n${after}`.trimEnd() + "\n";
  }

  const anchorIndex = content.indexOf(METADATA_README_ANCHOR);
  if (anchorIndex < 0) {
    throw new Error(`Could not find README anchor "${METADATA_README_ANCHOR}".`);
  }

  const before = content.slice(0, anchorIndex).trimEnd();
  const after = content.slice(anchorIndex).trimStart();
  return `${before}\n\n${block}\n\n${after}`.trimEnd() + "\n";
}
