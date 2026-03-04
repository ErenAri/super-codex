import type { MergeWarning } from "../config";
import { line, resolveOutputStyle, type StyleOptions } from "./presenter";

export async function runCommand(task: () => Promise<void>, options: StyleOptions = {}): Promise<void> {
  try {
    await task();
  } catch (error) {
    const style = resolveOutputStyle(options);
    const message = error instanceof Error ? error.message : String(error);
    console.error(line("error", `Error: ${message}`, style));
    process.exitCode = 1;
  }
}

export function printWarnings(warnings: MergeWarning[], options: StyleOptions = {}): void {
  if (warnings.length === 0) {
    return;
  }

  const style = resolveOutputStyle(options);
  console.warn(line("warn", "Warnings:", style));
  for (const warning of warnings) {
    console.warn(line("warn", warning.message, style));
  }
}

export function collectRepeatedOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}
