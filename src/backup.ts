import path from "node:path";
import { copyFile, mkdir, writeFile } from "node:fs/promises";

import { pathExists } from "./fs-utils";

export interface BackupResult {
  backupDir: string;
  backupFile: string | null;
}

export function formatBackupTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hour}${minute}${second}`;
}

export async function createTimestampedBackup(
  configPath: string,
  codexHome: string,
  now: Date = new Date()
): Promise<BackupResult> {
  const baseDir = path.join(codexHome, "backups", formatBackupTimestamp(now));
  let backupDir = baseDir;
  let suffix = 1;

  while (await pathExists(backupDir)) {
    backupDir = `${baseDir}-${suffix}`;
    suffix += 1;
  }

  await mkdir(backupDir, { recursive: true });

  if (await pathExists(configPath)) {
    const backupFile = path.join(backupDir, "config.toml");
    await copyFile(configPath, backupFile);
    return { backupDir, backupFile };
  }

  await writeFile(
    path.join(backupDir, "README.txt"),
    "No config.toml existed when this backup was created.\n",
    "utf8"
  );
  return { backupDir, backupFile: null };
}
