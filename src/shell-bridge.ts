import os from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { pathExists } from "./fs-utils";
import { expandHomePath } from "./paths";
import { RESERVED_TOP_LEVEL_COMMAND_NAMES } from "./registry/aliases";

export type ShellKind = "bash" | "zsh" | "fish" | "powershell";

export interface ShellBridgeOptions {
  shell?: string;
  profilePath?: string;
}

export interface ShellBridgeInstallResult {
  shell: ShellKind;
  profilePath: string;
  changed: boolean;
}

export interface ShellBridgeRemoveResult {
  shell: ShellKind;
  profilePath: string;
  changed: boolean;
}

export interface ShellBridgeStatusResult {
  shell: ShellKind;
  profilePath: string;
  profileExists: boolean;
  installed: boolean;
}

export const SUPPORTED_SHELLS: ShellKind[] = ["bash", "zsh", "fish", "powershell"];

const START_MARKER = "# >>> supercodex shell bridge >>>";
const END_MARKER = "# <<< supercodex shell bridge <<<";

export function detectShellKind(): ShellKind {
  if (process.platform === "win32") {
    return "powershell";
  }

  const shellEnv = (process.env.SHELL ?? "").toLowerCase();
  if (shellEnv.includes("zsh")) {
    return "zsh";
  }
  if (shellEnv.includes("fish")) {
    return "fish";
  }
  if (shellEnv.includes("bash")) {
    return "bash";
  }

  return "bash";
}

export function normalizeShellKind(shell?: string): ShellKind {
  if (!shell) {
    return detectShellKind();
  }

  const normalized = shell.trim().toLowerCase();
  if (!normalized) {
    return detectShellKind();
  }

  if (normalized === "powershell" || normalized === "pwsh" || normalized === "ps") {
    return "powershell";
  }

  if (normalized === "bash" || normalized === "zsh" || normalized === "fish") {
    return normalized;
  }

  throw new Error(
    `Unsupported shell "${shell}". Supported shells: ${SUPPORTED_SHELLS.join(", ")}.`
  );
}

export function resolveShellProfilePath(shell: ShellKind, profilePath?: string): string {
  if (profilePath && profilePath.trim().length > 0) {
    return path.resolve(expandHomePath(profilePath.trim()));
  }

  const home = os.homedir();
  switch (shell) {
    case "bash":
      return path.join(home, ".bashrc");
    case "zsh":
      return path.join(home, ".zshrc");
    case "fish":
      return path.join(home, ".config", "fish", "config.fish");
    case "powershell":
      return process.platform === "win32"
        ? path.join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1")
        : path.join(home, ".config", "powershell", "Microsoft.PowerShell_profile.ps1");
  }
}

export function renderShellBridgeScript(shellInput?: string): string {
  const shell = normalizeShellKind(shellInput);
  return renderManagedBlock(shell, "\n");
}

export async function installShellBridge(
  options: ShellBridgeOptions = {}
): Promise<ShellBridgeInstallResult> {
  const shell = normalizeShellKind(options.shell);
  const profilePath = resolveShellProfilePath(shell, options.profilePath);
  const existing = (await pathExists(profilePath)) ? await readFile(profilePath, "utf8") : "";
  const eol = pickEol(existing);

  const next = upsertManagedBlock(existing, renderManagedBlock(shell, eol), eol);
  if (next.changed) {
    await mkdir(path.dirname(profilePath), { recursive: true });
    await writeFile(profilePath, next.content, "utf8");
  }

  return {
    shell,
    profilePath,
    changed: next.changed
  };
}

export async function removeShellBridge(
  options: ShellBridgeOptions = {}
): Promise<ShellBridgeRemoveResult> {
  const shell = normalizeShellKind(options.shell);
  const profilePath = resolveShellProfilePath(shell, options.profilePath);
  if (!(await pathExists(profilePath))) {
    return {
      shell,
      profilePath,
      changed: false
    };
  }

  const existing = await readFile(profilePath, "utf8");
  const eol = pickEol(existing);
  const removed = stripManagedBlock(existing, eol);

  if (removed.changed) {
    await writeFile(profilePath, removed.content, "utf8");
  }

  return {
    shell,
    profilePath,
    changed: removed.changed
  };
}

export async function getShellBridgeStatus(
  options: ShellBridgeOptions = {}
): Promise<ShellBridgeStatusResult> {
  const shell = normalizeShellKind(options.shell);
  const profilePath = resolveShellProfilePath(shell, options.profilePath);
  const profileExists = await pathExists(profilePath);
  const content = profileExists ? await readFile(profilePath, "utf8") : "";

  return {
    shell,
    profilePath,
    profileExists,
    installed: hasManagedBlock(content)
  };
}

function renderManagedBlock(shell: ShellKind, eol: string): string {
  switch (shell) {
    case "bash":
    case "zsh":
      return renderPosixBridge(eol);
    case "fish":
      return renderFishBridge(eol);
    case "powershell":
      return renderPowerShellBridge(eol);
  }
}

function renderPosixBridge(eol: string): string {
  const passthroughPattern = getPassthroughCommands().join("|");
  const lines = [
    START_MARKER,
    "sc() {",
    '  if [ "$#" -eq 0 ]; then',
    "    supercodex aliases list",
    "    return $?",
    "  fi",
    "",
    '  case "$1" in',
    "    /sc:*|sc:*)",
    '      supercodex "$@"',
    "      ;;",
    `    ${passthroughPattern})`,
    '      supercodex "$@"',
    "      ;;",
    "    *)",
    '      first="$1"',
    "      shift",
    '      supercodex "sc:${first}" "$@"',
    "      ;;",
    "  esac",
    "}",
    END_MARKER
  ];

  return withTrailingEol(lines.join(eol), eol);
}

function renderFishBridge(eol: string): string {
  const commandCases = getPassthroughCommands().map((name) => `'${name}'`).join(" ");
  const lines = [
    START_MARKER,
    "function sc",
    "  if test (count $argv) -eq 0",
    "    supercodex aliases list",
    "    return $status",
    "  end",
    "",
    "  set first $argv[1]",
    "  switch $first",
    `    case '/sc:*' 'sc:*' ${commandCases}`,
    "      supercodex $argv",
    "    case '*'",
    "      set -e argv[1]",
    "      supercodex \"sc:$first\" $argv",
    "  end",
    "end",
    END_MARKER
  ];

  return withTrailingEol(lines.join(eol), eol);
}

function renderPowerShellBridge(eol: string): string {
  const commandList = getPassthroughCommands().map((name) => `'${name}'`).join(", ");
  const lines = [
    START_MARKER,
    "function sc {",
    "  param(",
    "    [Parameter(ValueFromRemainingArguments = $true)]",
    "    [string[]]$Args",
    "  )",
    "",
    "  if (-not $Args -or $Args.Count -eq 0) {",
    "    supercodex aliases list",
    "    return",
    "  }",
    "",
    "  $first = $Args[0]",
    "  $rest = @()",
    "  if ($Args.Count -gt 1) {",
    "    $rest = $Args[1..($Args.Count - 1)]",
    "  }",
    "",
    "  if (",
    "    $first -like '/sc:*' -or",
    "    $first -like 'sc:*' -or",
    `    $first -in @(${commandList})`,
    "  ) {",
    "    supercodex @Args",
    "    return",
    "  }",
    "",
    "  supercodex (\"sc:$first\") @rest",
    "}",
    END_MARKER
  ];

  return withTrailingEol(lines.join(eol), eol);
}

function getPassthroughCommands(): string[] {
  return Array.from(RESERVED_TOP_LEVEL_COMMAND_NAMES).sort();
}

function hasManagedBlock(content: string): boolean {
  if (!content) {
    return false;
  }

  const start = content.indexOf(START_MARKER);
  if (start === -1) {
    return false;
  }

  return content.indexOf(END_MARKER, start) !== -1;
}

function upsertManagedBlock(content: string, block: string, eol: string): { content: string; changed: boolean } {
  const stripped = stripManagedBlock(content, eol).content;
  const normalizedBase = stripped.trimEnd();
  const normalizedBlock = block.trimEnd();
  const merged = normalizedBase.length > 0
    ? `${normalizedBase}${eol}${eol}${normalizedBlock}`
    : normalizedBlock;
  const nextContent = withTrailingEol(merged, eol);
  const changed = nextContent !== content;

  return {
    content: nextContent,
    changed
  };
}

function stripManagedBlock(content: string, eol: string): { content: string; changed: boolean } {
  const bounds = findManagedBlockBounds(content);
  if (!bounds) {
    return {
      content,
      changed: false
    };
  }

  const before = content.slice(0, bounds.start).trimEnd();
  const after = content.slice(bounds.end).trimStart();
  const merged = before.length > 0 && after.length > 0
    ? `${before}${eol}${eol}${after}`
    : before.length > 0
      ? before
      : after;

  return {
    content: merged.length > 0 ? withTrailingEol(merged, eol) : "",
    changed: true
  };
}

function findManagedBlockBounds(content: string): { start: number; end: number } | null {
  const start = content.indexOf(START_MARKER);
  if (start === -1) {
    return null;
  }

  const endMarkerStart = content.indexOf(END_MARKER, start);
  if (endMarkerStart === -1) {
    return {
      start,
      end: content.length
    };
  }

  let end = endMarkerStart + END_MARKER.length;
  if (content.slice(end, end + 2) === "\r\n") {
    end += 2;
  } else if (content[end] === "\n") {
    end += 1;
  }

  return {
    start,
    end
  };
}

function pickEol(content: string): string {
  if (content.includes("\r\n")) {
    return "\r\n";
  }

  if (content.includes("\n")) {
    return "\n";
  }

  return process.platform === "win32" ? "\r\n" : "\n";
}

function withTrailingEol(content: string, eol: string): string {
  if (!content) {
    return "";
  }

  if (content.endsWith("\r\n") || content.endsWith("\n")) {
    return content;
  }

  return `${content}${eol}`;
}
