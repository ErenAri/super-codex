import path from "node:path";
import { access, constants } from "node:fs/promises";

import { runProcessCommand } from "./executor";
import type {
  BenchmarkTask,
  ProcessExecutionResult,
  VerificationResult
} from "./types";

export interface VerificationOptions {
  task: BenchmarkTask;
  workspace: string;
  timeoutSeconds: number;
  expandTokens?: (value: string) => string;
  executeCommand?: (options: {
    command: string[];
    cwd: string;
    timeoutSeconds: number;
  }) => Promise<ProcessExecutionResult>;
}

export async function verifyTask(options: VerificationOptions): Promise<VerificationResult> {
  const { task, workspace, timeoutSeconds } = options;
  const expand = options.expandTokens ?? ((value: string) => value);
  const executeCommand = options.executeCommand ?? runProcessCommand;
  const verifySpec = task.verify;

  if (verifySpec.type === "file_assert") {
    const targets = normalizeTargets(verifySpec.target).map(expand);
    const missing: string[] = [];
    for (const target of targets) {
      const absoluteTarget = path.isAbsolute(target)
        ? target
        : path.resolve(workspace, target);
      if (!(await pathExists(absoluteTarget))) {
        missing.push(target);
      }
    }

    return missing.length === 0
      ? { pass: true, messages: ["All file assertions passed."] }
      : { pass: false, messages: [`Missing files: ${missing.join(", ")}`] };
  }

  if (verifySpec.type === "command" || verifySpec.type === "tests") {
    const command = normalizeTargets(verifySpec.target).map(expand);
    const result = await executeCommand({
      command,
      cwd: workspace,
      timeoutSeconds
    });

    if (result.timedOut) {
      return {
        pass: false,
        messages: ["Verification command timed out."]
      };
    }

    if (result.ok) {
      return {
        pass: true,
        messages: ["Verification command passed."]
      };
    }

    return {
      pass: false,
      messages: [
        `Verification command failed with exit code ${String(result.exitCode)}.`,
        result.stderr.trim()
      ].filter((item) => item.length > 0)
    };
  }

  return {
    pass: false,
    messages: [`Unsupported verification type "${verifySpec.type}".`]
  };
}

function normalizeTargets(target: string | string[]): string[] {
  if (typeof target === "string") {
    return [target];
  }
  return target;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
