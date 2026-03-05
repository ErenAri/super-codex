import path from "node:path";
import { readFile } from "node:fs/promises";

import { listContentFiles, loadContentFile } from "../content-loader";
import {
  listBundledInteractivePromptCommands,
  renderInteractivePrompt
} from "../prompts";
import { pathExists } from "../fs-utils";
import {
  loadRegistry,
  validateRegistry,
  type AliasDefinition,
  type RegistryValidationIssue
} from "../registry";
import { validateSupercodexCommandSet } from "./command-validation";
import {
  collectMetadataSnapshot,
  renderMetadataDoc,
  renderMetadataReadmeBlock,
  upsertMetadataReadmeBlock
} from "./metadata-sync";

export type PolicyCheckStatus = "pass" | "warn" | "fail";
export type PolicyIssueLevel = "warn" | "error";

export interface PolicyIssue {
  level: PolicyIssueLevel;
  message: string;
}

export interface PolicyCheck {
  id: string;
  title: string;
  status: PolicyCheckStatus;
  issues: PolicyIssue[];
}

export interface PolicyReport {
  ok: boolean;
  score: number;
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  checks: PolicyCheck[];
}

export interface PolicyOptions {
  codexHome?: string;
  projectRoot?: string;
}

const COMMAND_SCAFFOLD_HEADINGS = [
  "purpose",
  "activation",
  "behavioral flow",
  "mcp integration",
  "boundaries",
  "output format",
  "user task"
];

export async function evaluatePolicy(options: PolicyOptions = {}): Promise<PolicyReport> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const checks: PolicyCheck[] = [];

  checks.push(await evaluateRegistryPolicy(options));
  checks.push(evaluateCommandScaffoldPolicy());
  checks.push(await evaluatePromptWrapperPolicy(options));
  checks.push(await evaluateMetadataPolicy(projectRoot));

  const summary = {
    pass: checks.filter((check) => check.status === "pass").length,
    warn: checks.filter((check) => check.status === "warn").length,
    fail: checks.filter((check) => check.status === "fail").length
  };

  return {
    ok: summary.fail === 0,
    score: computePolicyScore(checks),
    summary,
    checks
  };
}

async function evaluateRegistryPolicy(options: PolicyOptions): Promise<PolicyCheck> {
  const registryResult = await loadRegistry({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot ?? process.cwd()
  });

  const staticIssues = validateRegistry(registryResult.registry);
  const dynamicIssues = registryResult.issues;
  const commandSet = validateSupercodexCommandSet(Object.keys(registryResult.registry.commands));

  const issues: PolicyIssue[] = [
    ...normalizeRegistryIssues(dynamicIssues),
    ...normalizeRegistryIssues(staticIssues),
    ...commandSet.errors.map((message) => ({ level: "error" as const, message }))
  ];

  for (const alias of Object.values(registryResult.registry.aliases)) {
    if (!alias.stability) {
      issues.push({
        level: "warn",
        message: `Alias "${alias.name}" is missing a stability marker (stable|experimental).`
      });
    }
  }

  const status = resolvePolicyStatus(issues);
  return {
    id: "registry.integrity",
    title: "Registry integrity and command compatibility",
    status,
    issues
  };
}

function evaluateCommandScaffoldPolicy(): PolicyCheck {
  const issues: PolicyIssue[] = [];
  const commandFiles = listContentFiles("commands");

  for (const fileName of commandFiles) {
    const content = loadContentFile("commands", fileName);
    for (const heading of COMMAND_SCAFFOLD_HEADINGS) {
      if (!hasHeading(content, heading)) {
        issues.push({
          level: "error",
          message: `commands/${fileName} is missing section heading "${heading}".`
        });
      }
    }
  }

  return {
    id: "workflows.scaffold",
    title: "Workflow command scaffold completeness",
    status: resolvePolicyStatus(issues),
    issues
  };
}

async function evaluatePromptWrapperPolicy(options: PolicyOptions): Promise<PolicyCheck> {
  const issues: PolicyIssue[] = [];
  const registryResult = await loadRegistry({
    codexHome: options.codexHome,
    projectRoot: options.projectRoot ?? process.cwd()
  });

  const wrapperFiles = new Set(listBundledInteractivePromptCommands());
  const aliases = Object.values(registryResult.registry.aliases)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const alias of aliases) {
    const workflow = resolveWorkflowFromAlias(alias);
    if (!workflow) {
      issues.push({
        level: "warn",
        message: `Alias "${alias.name}" has non-workflow target "${alias.target}".`
      });
      continue;
    }

    const expectedFile = `supercodex-${alias.name}.md`;
    if (!wrapperFiles.has(expectedFile)) {
      issues.push({
        level: "error",
        message: `Missing interactive wrapper file "${expectedFile}" for alias "${alias.name}".`
      });
      continue;
    }

    const wrapper = renderInteractivePrompt(alias, workflow);
    if (!wrapper.includes("<!-- supercodex:managed-prompt-wrapper -->")) {
      issues.push({
        level: "error",
        message: `Interactive wrapper for "${alias.name}" is missing the managed marker.`
      });
    }
    if (!wrapper.includes("## User Task")) {
      issues.push({
        level: "error",
        message: `Interactive wrapper for "${alias.name}" is missing the "User Task" section.`
      });
    }
    if (!wrapper.includes(`/prompts:supercodex-${alias.name}`)) {
      issues.push({
        level: "error",
        message: `Interactive wrapper for "${alias.name}" is missing canonical /prompts command naming.`
      });
    }
  }

  if (wrapperFiles.size !== aliases.length) {
    issues.push({
      level: "warn",
      message:
        `Interactive wrapper file count (${wrapperFiles.size}) differs from alias count (${aliases.length}).`
    });
  }

  return {
    id: "wrappers.integrity",
    title: "Interactive prompt wrapper integrity",
    status: resolvePolicyStatus(issues),
    issues
  };
}

async function evaluateMetadataPolicy(projectRoot: string): Promise<PolicyCheck> {
  const issues: PolicyIssue[] = [];
  const snapshot = collectMetadataSnapshot();
  const invariantFailures = snapshot.invariants.filter((entry) => !entry.ok);
  for (const failure of invariantFailures) {
    issues.push({
      level: "error",
      message: `Metadata invariant failed: ${failure.message}`
    });
  }

  const metadataPath = path.join(projectRoot, "docs", "METADATA.md");
  const expectedMetadata = renderMetadataDoc(snapshot);
  if (!(await pathExists(metadataPath))) {
    issues.push({
      level: "error",
      message: "docs/METADATA.md is missing."
    });
  } else {
    const current = await readFile(metadataPath, "utf8");
    if (current !== expectedMetadata) {
      issues.push({
        level: "error",
        message: "docs/METADATA.md is out of sync. Run `npm run metadata:sync`."
      });
    }
  }

  const readmePath = path.join(projectRoot, "README.md");
  if (await pathExists(readmePath)) {
    const current = await readFile(readmePath, "utf8");
    const expected = upsertMetadataReadmeBlock(current, renderMetadataReadmeBlock(snapshot));
    if (current !== expected) {
      issues.push({
        level: "warn",
        message: "README metadata snapshot block is out of sync."
      });
    }
  } else {
    issues.push({
      level: "warn",
      message: "README.md is missing; metadata snapshot cannot be verified."
    });
  }

  return {
    id: "metadata.sync",
    title: "Metadata documentation sync",
    status: resolvePolicyStatus(issues),
    issues
  };
}

function normalizeRegistryIssues(issues: RegistryValidationIssue[]): PolicyIssue[] {
  return issues.map((issue) => ({
    level: issue.level === "error" ? "error" : "warn",
    message: `[${issue.path}] ${issue.message}`
  }));
}

function resolveWorkflowFromAlias(alias: AliasDefinition): string | null {
  if (!alias.target.startsWith("run.")) {
    return null;
  }
  return alias.target.slice(4);
}

function hasHeading(content: string, heading: string): boolean {
  const normalizedTarget = normalizeHeadingText(heading);
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trimStart().startsWith("##")) {
      continue;
    }
    const normalizedLine = normalizeHeadingText(line);
    if (normalizedLine.includes(normalizedTarget)) {
      return true;
    }
  }
  return false;
}

function normalizeHeadingText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolvePolicyStatus(issues: PolicyIssue[]): PolicyCheckStatus {
  if (issues.some((issue) => issue.level === "error")) {
    return "fail";
  }
  if (issues.some((issue) => issue.level === "warn")) {
    return "warn";
  }
  return "pass";
}

function computePolicyScore(checks: PolicyCheck[]): number {
  let score = 100;
  for (const check of checks) {
    if (check.status === "fail") {
      score -= 25;
      continue;
    }
    if (check.status === "warn") {
      score -= 10;
    }
  }
  return Math.max(0, score);
}
