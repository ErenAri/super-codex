import { BUILTIN_FLAGS } from "../registry/builtins";
import { isReservedTopLevelCommandName, loadRegistry, normalizeAliasToken } from "../registry";

export interface AliasDispatchOptions {
  projectRoot?: string;
  codexHome?: string;
}

export interface AliasDispatchResult {
  argv: string[];
  applied: boolean;
  aliasName?: string;
}

export async function dispatchAliasArgv(
  argv: string[],
  options: AliasDispatchOptions = {}
): Promise<AliasDispatchResult> {
  if (argv.length === 0) {
    return { argv, applied: false };
  }

  const firstToken = argv[0];
  if (firstToken.startsWith("-")) {
    return { argv, applied: false };
  }

  const normalized = normalizeAliasToken(firstToken);
  if (!normalized) {
    return { argv, applied: false };
  }

  if (!normalized.explicitPrefix && isReservedTopLevelCommandName(normalized.name)) {
    return { argv, applied: false };
  }

  const codexHome = options.codexHome ?? parseCodexHome(argv);
  const registryResult = await loadRegistry({
    codexHome,
    projectRoot: options.projectRoot ?? process.cwd()
  });

  const alias = registryResult.registry.aliases[normalized.name];
  if (!alias) {
    if (normalized.explicitPrefix) {
      const suggestion = suggestAlias(normalized.name, Object.keys(registryResult.registry.aliases));
      throw new Error(
        suggestion
          ? `Unknown slash alias "${firstToken}". Did you mean "/sc:${suggestion}"?`
          : `Unknown slash alias "${firstToken}".`
      );
    }
    return { argv, applied: false };
  }

  if (!Object.hasOwn(registryResult.registry.commands, alias.target)) {
    throw new Error(
      `Alias "${firstToken}" points to unknown command target "${alias.target}". ` +
        `Run "supercodex validate --strict" to inspect registry issues.`
    );
  }

  const targetArgv = targetToArgv(alias.target);
  if (targetArgv.length === 0) {
    throw new Error(`Alias "${firstToken}" has invalid target "${alias.target}".`);
  }
  const rewritten = [...targetArgv];
  const incomingArgs = alias.forward_args === false ? [] : argv.slice(1);
  rewritten.push(...incomingArgs);

  if (alias.output === "json" && !hasOption(rewritten, "--json")) {
    rewritten.push("--json");
  }

  if (targetArgv[0] === "run") {
    if (alias.default_mode && !hasOption(rewritten, "--mode")) {
      rewritten.push("--mode", alias.default_mode);
    }

    if (alias.default_persona && !hasOption(rewritten, "--persona")) {
      rewritten.push("--persona", alias.default_persona);
    }
  }

  const preprocessed = preprocessFlags(rewritten);

  return {
    argv: preprocessed.argv,
    applied: true,
    aliasName: alias.name
  };
}

export function preprocessFlags(argv: string[]): { argv: string[]; appliedFlags: string[] } {
  const appliedFlags: string[] = [];
  const processed = [...argv];

  for (const [flagName, def] of Object.entries(BUILTIN_FLAGS)) {
    const idx = processed.indexOf(def.flag);
    if (idx === -1) {
      continue;
    }

    // Check for conflicts
    for (const conflict of def.conflicts_with ?? []) {
      const conflictDef = BUILTIN_FLAGS[conflict];
      if (conflictDef && processed.includes(conflictDef.flag)) {
        throw new Error(
          `Flags "${def.flag}" and "${conflictDef.flag}" conflict and cannot be used together.`
        );
      }
    }

    processed.splice(idx, 1);
    appliedFlags.push(flagName);

    if (def.activates_mode && !hasOption(processed, "--mode")) {
      processed.push("--mode", def.activates_mode);
    }
  }

  return { argv: processed, appliedFlags };
}

function targetToArgv(target: string): string[] {
  const segments = target.split(".").map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  if (segments.some((segment) => !/^[a-z][a-z0-9]*$/.test(segment))) {
    return [];
  }
  return segments;
}

function hasOption(argv: string[], optionName: string): boolean {
  return argv.some((item) => item === optionName || item.startsWith(`${optionName}=`));
}

function parseCodexHome(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--codex-home") {
      return argv[index + 1];
    }
    if (current.startsWith("--codex-home=")) {
      return current.slice("--codex-home=".length);
    }
  }
  return undefined;
}

function suggestAlias(input: string, candidates: string[]): string | null {
  if (candidates.length === 0) {
    return null;
  }

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = levenshtein(input, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  if (bestDistance > 5) {
    return null;
  }

  return best;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}
