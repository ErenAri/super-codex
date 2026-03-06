import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["vitest", "run", "tests/golden-outputs.test.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    UPDATE_GOLDEN: "1"
  }
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
