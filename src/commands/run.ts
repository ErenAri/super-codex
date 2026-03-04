import type { Command } from "commander";

import { contentFileExists, listContentFiles, loadContentFile } from "../content-loader";
import { loadRegistry } from "../registry";
import { checkCompatibility, resolveWorkflow, isBaseWorkflow } from "../runtime";
import { extractPurposeSummary } from "../workflow-summary";
import { collectRepeatedOption, runCommand } from "./utils";

const BASE_WORKFLOWS = ["plan", "review", "refactor", "debug"];
const BASE_WORKFLOW_DESCRIPTION_FALLBACKS: Record<string, string> = {
  plan: "Create an execution plan with scope, constraints, checkpoints, and exit criteria",
  review: "Review code or changes for correctness, risk, regressions, and test coverage",
  refactor: "Refactor code safely with incremental steps, validation checks, and rollback awareness",
  debug: "Debug issues through hypothesis-driven investigation, instrumentation, and root-cause isolation"
};

export function registerRunCommands(program: Command): void {
  const run = program
    .command("run")
    .description("Resolve workflow context (prompt, mode, persona, reasoning budget)");

  // Register the 4 base workflows first
  for (const workflowName of BASE_WORKFLOWS) {
    registerWorkflowCommand(run, workflowName, resolveWorkflowCommandDescription(workflowName));
  }

  // Dynamically register command workflows from content/commands/
  const commandFiles = listContentFiles("commands");
  for (const file of commandFiles) {
    const commandName = file.replace(/\.md$/, "");
    // Skip if it collides with a base workflow name
    if (BASE_WORKFLOWS.includes(commandName)) {
      continue;
    }
    registerWorkflowCommand(run, commandName, resolveWorkflowCommandDescription(commandName));
  }
}

function registerWorkflowCommand(parent: Command, workflowName: string, description: string): void {
  parent
    .command(workflowName)
    .description(description)
    .option("--codex-home <path>", "Override Codex home directory")
    .option("--mode <name>", "Override mode")
    .option("--persona <name>", "Override persona")
    .option("--reasoning-budget <level>", "Override reasoning budget (low|medium|high|maximum)")
    .option("--mcp <name>", "Request MCP server", collectRepeatedOption, [])
    .option("--json", "Output JSON")
    .action((options) =>
      runCommand(async () => {
        const registry = await loadRegistry({
          codexHome: options.codexHome as string | undefined,
          projectRoot: process.cwd()
        });
        const resolution = await resolveWorkflow(registry.registry, {
          workflow: workflowName,
          codexHome: options.codexHome as string | undefined,
          mode: options.mode as string | undefined,
          persona: options.persona as string | undefined,
          reasoningBudget: options.reasoningBudget as string | undefined,
          requestedMcpServers: (options.mcp as string[] | undefined) ?? [],
          projectRoot: process.cwd()
        });

        const commandId = `run.${workflowName}`;
        if (Object.hasOwn(registry.registry.commands, commandId)) {
          const compat = checkCompatibility(
            registry.registry,
            commandId,
            resolution.mode,
            resolution.persona
          );
          if (!compat.ok) {
            throw new Error(compat.errors.join(" "));
          }
        }

        if (Boolean(options.json)) {
          console.log(JSON.stringify(resolution, null, 2));
          return;
        }

        console.log(`Workflow: ${resolution.workflow}`);
        console.log(`Prompt: ${resolution.promptPath}`);
        console.log(`Mode: ${resolution.mode} (${resolution.modeSource})`);
        console.log(`Persona: ${resolution.persona} (${resolution.personaSource})`);
        console.log(`Reasoning budget: ${resolution.reasoningBudget}`);
        if (resolution.requestedMcpServers.length > 0) {
          console.log(`Requested MCP servers: ${resolution.requestedMcpServers.join(", ")}`);
        }
        if (resolution.overlays.modePrompt) {
          console.log(`Mode overlay: ${resolution.overlays.modePrompt}`);
        }
        if (resolution.overlays.personaPrompt) {
          console.log(`Persona overlay: ${resolution.overlays.personaPrompt}`);
        }
      })
    );
}

function resolveWorkflowCommandDescription(workflowName: string): string {
  const summary = loadWorkflowPurposeSummary(workflowName);
  if (summary) {
    return summary;
  }

  if (isBaseWorkflow(workflowName)) {
    return BASE_WORKFLOW_DESCRIPTION_FALLBACKS[workflowName] ?? `Resolve ${workflowName} workflow context`;
  }

  return `Run ${workflowName} command workflow`;
}

function loadWorkflowPurposeSummary(workflowName: string): string | null {
  const fileName = `${workflowName}.md`;
  if (contentFileExists("commands", fileName)) {
    return extractPurposeSummary(loadContentFile("commands", fileName), 95);
  }

  if (contentFileExists("workflows", fileName)) {
    return extractPurposeSummary(loadContentFile("workflows", fileName), 95);
  }

  return null;
}
