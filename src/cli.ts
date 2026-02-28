#!/usr/bin/env node
import { Command, CommanderError } from "commander";

import { SUPERCODEX_VERSION } from "./constants";
import {
  registerAliasCommands,
  registerCatalogCommands,
  registerCoreCommands,
  registerDoctorCommands,
  registerMcpCommands,
  registerModeCommands,
  registerPersonaCommands,
  registerRunCommands,
  registerValidateCommand
} from "./commands";
import { dispatchAliasArgv } from "./runtime";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("supercodex")
    .description("SuperCodex configuration framework for Codex CLI")
    .version(SUPERCODEX_VERSION);

  registerCoreCommands(program);
  registerValidateCommand(program);
  registerDoctorCommands(program);
  registerCatalogCommands(program);
  registerAliasCommands(program);
  registerModeCommands(program);
  registerPersonaCommands(program);
  registerMcpCommands(program);
  registerRunCommands(program);

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
