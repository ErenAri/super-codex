import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export async function ensureDir(targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJsonStable(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const sorted = sortValue(value);
  await writeFile(filePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, entry]) => [key, sortValue(entry)] as const);
    return Object.fromEntries(entries);
  }

  return value;
}
