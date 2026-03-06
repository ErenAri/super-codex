export interface QuickAction {
  id: string;
  label: string;
  command: string;
}

export interface QuickActionContract {
  best_next_command: string;
  next_commands: string[];
  quick_actions: QuickAction[];
}

export interface QuickActionContractOptions {
  bestCommand?: string;
  bestLabel?: string;
  limit?: number;
}

export function buildQuickActionContract(
  actions: QuickAction[],
  options: QuickActionContractOptions = {}
): QuickActionContract {
  const limit = normalizeLimit(options.limit);
  const normalized = normalizeActions(actions).slice(0, limit);

  if (normalized.length === 0) {
    return {
      best_next_command: "",
      next_commands: [],
      quick_actions: []
    };
  }

  const bestCommand = normalizeCommand(options.bestCommand);
  const existingBest = bestCommand
    ? normalized.find((entry) => entry.command === bestCommand)
    : undefined;

  const quickActions = existingBest
    ? normalized
    : bestCommand
      ? [{
        id: "best_next",
        label: normalizeLabel(options.bestLabel) ?? "Best next command",
        command: bestCommand
      }, ...normalized]
      : normalized;

  return {
    best_next_command: quickActions[0].command,
    next_commands: quickActions.map((entry) => entry.command),
    quick_actions: quickActions
  };
}

function normalizeActions(actions: QuickAction[]): QuickAction[] {
  const seen = new Set<string>();
  const normalized: QuickAction[] = [];

  for (const action of actions) {
    const command = normalizeCommand(action.command);
    if (!command || seen.has(command)) {
      continue;
    }
    seen.add(command);
    normalized.push({
      id: normalizeId(action.id) ?? `action_${normalized.length + 1}`,
      label: normalizeLabel(action.label) ?? "Next command",
      command
    });
  }

  return normalized;
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit) || !limit || limit < 1) {
    return 12;
  }
  return Math.max(1, Math.trunc(limit));
}

function normalizeCommand(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLabel(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
