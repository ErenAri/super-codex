export interface WorkflowLoopStep {
  step_id: string;
  objective: string;
  primary_command: string;
  suggested_aliases: string[];
}

export interface FrameworkProfile {
  id: string;
  title: string;
  description: string;
  workflow_loop: WorkflowLoopStep[];
  core_agents: string[];
  core_modes: string[];
}

export const CORE_PROFILE_ID = "core";

export const CORE_PROFILE: FrameworkProfile = {
  id: CORE_PROFILE_ID,
  title: "Core Framework Profile",
  description:
    "Minimal parity workflow set focused on end-to-end delivery with safety and reproducibility.",
  workflow_loop: [
    {
      step_id: "spec",
      objective: "Create a concrete plan/spec before writing code.",
      primary_command: "run.plan",
      suggested_aliases: ["spec", "plan"]
    },
    {
      step_id: "implement",
      objective: "Implement the scoped change.",
      primary_command: "run.implement",
      suggested_aliases: ["implement", "build"]
    },
    {
      step_id: "test",
      objective: "Add or run tests for the change.",
      primary_command: "run.test",
      suggested_aliases: ["test"]
    },
    {
      step_id: "review",
      objective: "Review behavior, risks, and regressions.",
      primary_command: "run.review",
      suggested_aliases: ["review", "audit"]
    },
    {
      step_id: "refactor",
      objective: "Improve maintainability without changing behavior.",
      primary_command: "run.refactor",
      suggested_aliases: ["refactor", "cleanup"]
    },
    {
      step_id: "docs",
      objective: "Update user/dev documentation.",
      primary_command: "run.document",
      suggested_aliases: ["document", "doc"]
    },
    {
      step_id: "security_scan",
      objective: "Perform security-focused review.",
      primary_command: "run.review",
      suggested_aliases: ["security", "audit"]
    },
    {
      step_id: "release_notes",
      objective: "Prepare release notes and communication.",
      primary_command: "run.document",
      suggested_aliases: ["document", "doc"]
    },
    {
      step_id: "session_save_restore",
      objective: "Persist and restore working context.",
      primary_command: "session.save",
      suggested_aliases: ["save"]
    },
    {
      step_id: "tool_health",
      objective: "Validate runtime and tool health before release.",
      primary_command: "doctor",
      suggested_aliases: ["doctor"]
    }
  ],
  core_agents: [
    "pm",
    "backend-architect",
    "qa-engineer",
    "security-engineer",
    "tech-writer",
    "system-architect"
  ],
  core_modes: ["fast", "safe", "deep", "deep-research"]
};

export const BUILTIN_FRAMEWORK_PROFILES: Record<string, FrameworkProfile> = {
  [CORE_PROFILE_ID]: CORE_PROFILE
};

export function listFrameworkProfiles(): FrameworkProfile[] {
  return Object.values(BUILTIN_FRAMEWORK_PROFILES).sort((a, b) => a.id.localeCompare(b.id));
}

export function getFrameworkProfile(profileId: string): FrameworkProfile | null {
  const normalized = profileId.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return BUILTIN_FRAMEWORK_PROFILES[normalized] ?? null;
}

export function getCoreProfileStepByAlias(aliasName: string): WorkflowLoopStep | null {
  const normalizedAlias = aliasName.trim().toLowerCase();
  if (!normalizedAlias) {
    return null;
  }

  return (
    CORE_PROFILE.workflow_loop.find((step) =>
      step.suggested_aliases.some((alias) => alias.toLowerCase() === normalizedAlias)
    ) ?? null
  );
}

export function getCoreProfileStepByCommand(commandId: string): WorkflowLoopStep | null {
  const normalized = commandId.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    CORE_PROFILE.workflow_loop.find((step) => step.primary_command.toLowerCase() === normalized) ?? null
  );
}

export function getCoreProfileNextCommands(limit = 10): string[] {
  const commands = CORE_PROFILE.workflow_loop.map((step) => {
    const preferredAlias = step.suggested_aliases[0];
    if (preferredAlias) {
      return `supercodex ${preferredAlias}`;
    }
    return `supercodex ${step.primary_command.replace(/\./g, " ")}`;
  });

  return commands.slice(0, Math.max(1, Math.trunc(limit)));
}
