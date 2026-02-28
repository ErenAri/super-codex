import type {
  BenchmarkRunConfig,
  BenchmarkTask,
  BenchmarkMode,
  VerifyType
} from "./types";

const VALID_MODES: BenchmarkMode[] = ["codex_native", "supercodex"];
const VALID_CATEGORIES = new Set(["bugfix", "feature", "refactor", "migration", "review", "debug"]);
const VALID_VERIFY_TYPES = new Set<VerifyType>(["tests", "command", "file_assert"]);

export function validateRunConfig(value: unknown): {
  valid: boolean;
  errors: string[];
  config?: BenchmarkRunConfig;
} {
  const errors: string[] = [];
  if (!isObject(value)) {
    return {
      valid: false,
      errors: ["Run config must be an object."]
    };
  }

  const seed = asNonEmptyString(value.seed, "seed", errors);
  const taskGlob = asNonEmptyString(value.task_glob, "task_glob", errors);
  const outputDir = asNonEmptyString(value.output_dir, "output_dir", errors);
  const maxParallel = asPositiveInteger(value.max_parallel, "max_parallel", errors);
  const failFast = asBoolean(value.fail_fast, "fail_fast", errors);

  const modesRaw = value.modes;
  const modes: BenchmarkMode[] = [];
  if (!Array.isArray(modesRaw) || modesRaw.length === 0) {
    errors.push("modes must be a non-empty array.");
  } else {
    for (const mode of modesRaw) {
      if (typeof mode !== "string" || !VALID_MODES.includes(mode as BenchmarkMode)) {
        errors.push(`Unsupported mode "${String(mode)}".`);
        continue;
      }
      if (!modes.includes(mode as BenchmarkMode)) {
        modes.push(mode as BenchmarkMode);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors,
    config: {
      seed: seed as string,
      task_glob: taskGlob as string,
      output_dir: outputDir as string,
      max_parallel: maxParallel as number,
      fail_fast: failFast as boolean,
      modes
    }
  };
}

export function validateTask(value: unknown): {
  valid: boolean;
  errors: string[];
  task?: BenchmarkTask;
} {
  const errors: string[] = [];
  if (!isObject(value)) {
    return {
      valid: false,
      errors: ["Task must be an object."]
    };
  }

  const id = asNonEmptyString(value.id, "id", errors);
  const title = asNonEmptyString(value.title, "title", errors);
  const category = asNonEmptyString(value.category, "category", errors);
  const repoFixture = asNonEmptyString(value.repo_fixture, "repo_fixture", errors);
  const prompt = asNonEmptyString(value.prompt, "prompt", errors);
  const timeoutSeconds = asPositiveInteger(value.timeout_seconds, "timeout_seconds", errors);

  if (category && !VALID_CATEGORIES.has(category)) {
    errors.push(`Unsupported category "${category}".`);
  }

  const verify = parseVerify(value.verify, errors);
  const runCmd = parseCommand(value.run_cmd, "run_cmd", false, errors);
  const setupCmds = parseSetupCommands(value.setup_cmds, errors);
  const modeCmds = parseModeCommands(value.mode_cmds, errors);
  const tags = parseStringArray(value.tags, "tags", false, errors);
  const riskLevel = asOptionalString(value.risk_level);
  if (riskLevel && riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high") {
    errors.push(`Unsupported risk_level "${riskLevel}".`);
  }

  if (!runCmd && Object.keys(modeCmds).length === 0) {
    errors.push("Task must define run_cmd or mode_cmds.");
  }

  if (errors.length > 0 || !verify) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors,
    task: {
      id: id as string,
      title: title as string,
      category: category as BenchmarkTask["category"],
      repo_fixture: repoFixture as string,
      prompt: prompt as string,
      timeout_seconds: timeoutSeconds as number,
      verify,
      ...(setupCmds.length > 0 ? { setup_cmds: setupCmds } : {}),
      ...(runCmd ? { run_cmd: runCmd } : {}),
      ...(Object.keys(modeCmds).length > 0 ? { mode_cmds: modeCmds } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      ...(riskLevel ? { risk_level: riskLevel as "low" | "medium" | "high" } : {})
    }
  };
}

function parseVerify(value: unknown, errors: string[]): BenchmarkTask["verify"] | null {
  if (!isObject(value)) {
    errors.push("verify must be an object.");
    return null;
  }

  const type = asNonEmptyString(value.type, "verify.type", errors);
  if (!type || !VALID_VERIFY_TYPES.has(type as VerifyType)) {
    errors.push(`Unsupported verify.type "${String(value.type)}".`);
    return null;
  }

  const target = value.target;
  if (!isStringOrStringArray(target)) {
    errors.push("verify.target must be a string or string array.");
    return null;
  }

  return {
    type: type as VerifyType,
    target
  };
}

function parseModeCommands(
  value: unknown,
  errors: string[]
): Partial<Record<BenchmarkMode, string[]>> {
  if (value === undefined) {
    return {};
  }
  if (!isObject(value)) {
    errors.push("mode_cmds must be an object.");
    return {};
  }

  const mapped: Partial<Record<BenchmarkMode, string[]>> = {};
  for (const mode of VALID_MODES) {
    const parsed = parseCommand(value[mode], `mode_cmds.${mode}`, false, errors);
    if (parsed) {
      mapped[mode] = parsed;
    }
  }

  for (const key of Object.keys(value)) {
    if (!VALID_MODES.includes(key as BenchmarkMode)) {
      errors.push(`Unsupported mode_cmds key "${key}".`);
    }
  }

  return mapped;
}

function parseSetupCommands(value: unknown, errors: string[]): string[][] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push("setup_cmds must be an array of command arrays.");
    return [];
  }

  const commands: string[][] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!Array.isArray(item) || item.length === 0) {
      errors.push(`setup_cmds[${index}] must be a non-empty string array.`);
      continue;
    }
    if (!item.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
      errors.push(`setup_cmds[${index}] must only contain non-empty strings.`);
      continue;
    }
    commands.push(item as string[]);
  }

  return commands;
}

function parseCommand(
  value: unknown,
  fieldName: string,
  required: boolean,
  errors: string[]
): string[] | undefined {
  if (value === undefined || value === null) {
    if (required) {
      errors.push(`${fieldName} is required.`);
    }
    return undefined;
  }

  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${fieldName} must be a non-empty string array.`);
    return undefined;
  }

  if (!value.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    errors.push(`${fieldName} must only contain non-empty strings.`);
    return undefined;
  }

  return value as string[];
}

function parseStringArray(
  value: unknown,
  fieldName: string,
  required: boolean,
  errors: string[]
): string[] {
  if (value === undefined || value === null) {
    if (required) {
      errors.push(`${fieldName} is required.`);
    }
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return [];
  }

  const values = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  if (values.length !== value.length) {
    errors.push(`${fieldName} must only contain non-empty strings.`);
  }
  return values;
}

function asNonEmptyString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${fieldName} must be a non-empty string.`);
    return undefined;
  }

  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asPositiveInteger(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    errors.push(`${fieldName} must be a positive integer.`);
    return undefined;
  }
  return value;
}

function asBoolean(value: unknown, fieldName: string, errors: string[]): boolean | undefined {
  if (typeof value !== "boolean") {
    errors.push(`${fieldName} must be a boolean.`);
    return undefined;
  }
  return value;
}

function isStringOrStringArray(value: unknown): value is string | string[] {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  return value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
