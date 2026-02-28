import type { MergeWarning } from "../config";

export async function runCommand(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

export function printWarnings(warnings: MergeWarning[]): void {
  if (warnings.length === 0) {
    return;
  }

  console.warn("Warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning.message}`);
  }
}

export function collectRepeatedOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}
