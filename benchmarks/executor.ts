import { spawn } from "node:child_process";

import type { ProcessExecutionOptions, ProcessExecutionResult } from "./types";

export async function runProcessCommand(options: ProcessExecutionOptions): Promise<ProcessExecutionResult> {
  if (options.command.length === 0) {
    return {
      ok: false,
      exitCode: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      durationMs: 0,
      errorMessage: "Command is empty.",
      command: options.command
    };
  }

  const [commandName, ...args] = options.command;
  const startedAt = Date.now();

  return new Promise<ProcessExecutionResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    let timedOut = false;

    const child = spawn(commandName, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      if (!finished) {
        child.kill("SIGTERM");
      }
    }, options.timeoutSeconds * 1000);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeoutHandle);
      resolve({
        ok: false,
        exitCode: null,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
        errorMessage: error.message,
        command: options.command
      });
    });

    child.on("close", (exitCode) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeoutHandle);
      resolve({
        ok: !timedOut && exitCode === 0,
        exitCode,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
        command: options.command
      });
    });
  });
}
