#!/usr/bin/env node
import { Command, CommanderError } from "commander";

import { SUPERCODEX_VERSION } from "./constants";
import {
  registerAgentCommands,
  registerAliasCommands,
  registerCatalogCommands,
  registerCoreCommands,
  registerDoctorCommands,
  registerFlagCommands,
  registerGuideCommands,
  registerKernelCommands,
  registerLockCommands,
  registerMcpCommands,
  registerModeCommands,
  registerPersonaCommands,
  registerPolicyCommands,
  registerProfileCommands,
  registerQualityCommands,
  registerRunCommands,
  registerSessionCommands,
  registerShellCommands,
  registerStartCommand,
  registerSkillCommands,
  registerValidateCommand,
  registerVerifyCommand
} from "./commands";
import { dispatchAliasArgv } from "./runtime";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("supercodex")
    .description("SuperCodex configuration framework for Codex CLI")
    .version(SUPERCODEX_VERSION);

  registerCoreCommands(program);
  registerStartCommand(program);
  registerValidateCommand(program);
  registerVerifyCommand(program);
  registerDoctorCommands(program);
  registerPolicyCommands(program);
  registerProfileCommands(program);
  registerQualityCommands(program);
  registerLockCommands(program);
  registerCatalogCommands(program);
  registerAliasCommands(program);
  registerGuideCommands(program);
  registerKernelCommands(program);
  registerModeCommands(program);
  registerPersonaCommands(program);
  registerMcpCommands(program);
  registerSessionCommands(program);
  registerRunCommands(program);
  registerShellCommands(program);
  registerAgentCommands(program);
  registerSkillCommands(program);
  registerFlagCommands(program);

  return program;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const program = createProgram();
  program.exitOverride();
  process.exitCode = 0;

  let effectiveArgv = argv;
  try {
    const dispatchResult = await dispatchAliasArgv(argv, {
      projectRoot: process.cwd()
    });
    effectiveArgv = dispatchResult.argv;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
    return 1;
  }

  try {
    await program.parseAsync(effectiveArgv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code !== "commander.helpDisplayed") {
        console.error(error.message);
      }
      process.exitCode = error.exitCode;
    } else {
      throw error;
    }
  }

  return process.exitCode ?? 0;
}

if (require.main === module) {
  void runCli();
}
