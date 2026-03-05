import { listContentFiles, loadContentFile } from "../content-loader";
import { BUILTIN_COMMANDS } from "../registry";

export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
}

export type CommandQualityIssueLevel = "error" | "warn";

export interface CommandQualityIssue {
  commandId: string;
  file: string;
  level: CommandQualityIssueLevel;
  code: string;
  message: string;
}

export interface CommandQualityCommandReport {
  commandId: string;
  file: string;
  valid: boolean;
  score: number;
  issues: CommandQualityIssue[];
}

export interface CommandQualityReport {
  valid: boolean;
  score: number;
  error_count: number;
  warn_count: number;
  commands: CommandQualityCommandReport[];
  issues: CommandQualityIssue[];
}

const REQUIRED_COMMAND_HEADINGS = [
  "Purpose",
  "Activation",
  "Behavioral Flow",
  "MCP Integration",
  "Boundaries",
  "Output Format",
  "User Task"
];

export function validateSupercodexCommandSet(commandIds: string[]): CommandValidationResult {
  const errors: string[] = [];
  const requiredCommands = Object.keys(BUILTIN_COMMANDS);
  const commandSet = new Set(commandIds);
  const missingCommands = requiredCommands
    .filter((id) => !commandSet.has(id))
    .sort();
  if (missingCommands.length > 0) {
    errors.push(`Missing required commands: ${missingCommands.join(", ")}.`);
  }

  const builtinRunCommands = requiredCommands
    .filter((id) => id.startsWith("run."))
    .sort();
  const expectedRunCommands = resolveExpectedRunCommands();
  const expectedRunSet = new Set(expectedRunCommands);
  const builtinRunSet = new Set(builtinRunCommands);

  const runCommandsMissingContent = builtinRunCommands
    .filter((id) => !expectedRunSet.has(id))
    .sort();
  if (runCommandsMissingContent.length > 0) {
    errors.push(
      `Built-in run commands missing workflow content: ${runCommandsMissingContent.join(", ")}.`
    );
  }

  const workflowContentMissingCommands = expectedRunCommands
    .filter((id) => !builtinRunSet.has(id))
    .sort();
  if (workflowContentMissingCommands.length > 0) {
    errors.push(
      `Workflow content files missing built-in run commands: ${workflowContentMissingCommands.join(", ")}.`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSupercodexCommandCount(commandIds: string[]): CommandValidationResult {
  return validateSupercodexCommandSet(commandIds);
}

export function evaluateCommandPromptQuality(): CommandQualityReport {
  const files = listContentFiles("commands")
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort();

  const commands = files.map((file) => evaluateCommandPrompt(file));
  const issues = commands.flatMap((entry) => entry.issues);
  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const warnCount = issues.filter((issue) => issue.level === "warn").length;
  const totalScore = commands.reduce((sum, entry) => sum + entry.score, 0);

  return {
    valid: errorCount === 0,
    score: commands.length > 0 ? Math.round(totalScore / commands.length) : 0,
    error_count: errorCount,
    warn_count: warnCount,
    commands,
    issues
  };
}

function resolveExpectedRunCommands(): string[] {
  const baseWorkflows = ["plan", "review", "refactor", "debug"];
  const workflowCommands = listContentFiles("commands")
    .map((fileName) => fileName.replace(/\.md$/i, ""))
    .map((commandName) => `run.${commandName}`);

  return Array.from(
    new Set([
      ...baseWorkflows.map((name) => `run.${name}`),
      ...workflowCommands
    ])
  ).sort();
}

function evaluateCommandPrompt(file: string): CommandQualityCommandReport {
  const content = loadContentFile("commands", file);
  const commandName = file.replace(/\.md$/i, "");
  const commandId = `run.${commandName}`;
  const issues: CommandQualityIssue[] = [];

  const expectedTitle = new RegExp(`^#\\s+/supercodex:${escapeRegExp(commandName)}\\s*$`, "m");
  if (!expectedTitle.test(content)) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "error",
        "title.mismatch",
        `Expected title "# /supercodex:${commandName}".`
      )
    );
  }

  for (const heading of REQUIRED_COMMAND_HEADINGS) {
    if (!hasHeading(content, heading)) {
      issues.push(
        qualityIssue(
          commandId,
          file,
          "error",
          "section.missing",
          `Missing required section heading containing "${heading}".`
        )
      );
    }
  }

  if (!/^- Persona:/m.test(content)) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "error",
        "activation.persona.missing",
        "Activation section is missing '- Persona:'."
      )
    );
  }

  if (!/^- Mode:/m.test(content)) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "error",
        "activation.mode.missing",
        "Activation section is missing '- Mode:'."
      )
    );
  }

  if (!/\bWILL DO\b/i.test(content) || !/\bWILL NOT DO\b/i.test(content)) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "error",
        "boundaries.incomplete",
        "Boundaries should include both 'WILL DO' and 'WILL NOT DO'."
      )
    );
  }

  if (!/\n```[\s\S]*?\n```/m.test(content)) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "warn",
        "output.template.missing",
        "No fenced template/example block found."
      )
    );
  }

  if (!hasHeading(content, "Next Steps")) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "warn",
        "next_steps.missing",
        "Missing Next Steps section."
      )
    );
  }

  if (content.includes("/sc:")) {
    issues.push(
      qualityIssue(
        commandId,
        file,
        "warn",
        "naming.short_alias",
        "Found '/sc:' shorthand in command content. Prefer '/supercodex:' primary naming."
      )
    );
  }

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const warnCount = issues.filter((issue) => issue.level === "warn").length;
  const score = clampScore(100 - (errorCount * 18 + warnCount * 6));

  return {
    commandId,
    file,
    valid: errorCount === 0,
    score,
    issues
  };
}

function hasHeading(content: string, heading: string): boolean {
  const pattern = new RegExp(`^##\\s+.*\\b${escapeRegExp(heading)}\\b.*$`, "im");
  return pattern.test(content);
}

function qualityIssue(
  commandId: string,
  file: string,
  level: CommandQualityIssueLevel,
  code: string,
  message: string
): CommandQualityIssue {
  return {
    commandId,
    file,
    level,
    code,
    message
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
