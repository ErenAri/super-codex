import path from "node:path";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";

const CONTENT_DIR = path.resolve(__dirname, "..", "content");

export type ContentCategory = "commands" | "agents" | "modes" | "framework" | "skills" | "workflows" | "personas";

export function getContentDir(): string {
  return CONTENT_DIR;
}

export function loadContentFile(category: ContentCategory, name: string): string {
  const filePath = path.join(CONTENT_DIR, category, name);
  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `Content file not found: ${category}/${name} (looked in ${filePath})`
    );
  }
}

export async function loadContentFileAsync(category: ContentCategory, name: string): Promise<string> {
  const filePath = path.join(CONTENT_DIR, category, name);
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `Content file not found: ${category}/${name} (looked in ${filePath})`
    );
  }
}

export function listContentFiles(category: ContentCategory): string[] {
  const categoryDir = path.join(CONTENT_DIR, category);
  if (!existsSync(categoryDir)) {
    return [];
  }

  const stats = statSync(categoryDir);
  if (!stats.isDirectory()) {
    return [];
  }

  return collectMarkdownFiles(categoryDir, "");
}

export async function listContentFilesAsync(category: ContentCategory): Promise<string[]> {
  const categoryDir = path.join(CONTENT_DIR, category);
  if (!existsSync(categoryDir)) {
    return [];
  }

  const stats = await stat(categoryDir);
  if (!stats.isDirectory()) {
    return [];
  }

  return collectMarkdownFilesAsync(categoryDir, "");
}

export function contentFileExists(category: ContentCategory, name: string): boolean {
  const filePath = path.join(CONTENT_DIR, category, name);
  return existsSync(filePath);
}

function collectMarkdownFiles(baseDir: string, relativeDir: string): string[] {
  const targetDir = path.join(baseDir, relativeDir);
  const entries = readdirSync(targetDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(baseDir, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath.replaceAll("\\", "/"));
    }
  }

  return files.sort();
}

async function collectMarkdownFilesAsync(baseDir: string, relativeDir: string): Promise<string[]> {
  const targetDir = path.join(baseDir, relativeDir);
  const entries = await readdir(targetDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFilesAsync(baseDir, relativePath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath.replaceAll("\\", "/"));
    }
  }

  return files.sort();
}
