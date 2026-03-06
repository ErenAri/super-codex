import path from "node:path";
import { spawnSync } from "node:child_process";

const vitestEntrypoint = path.join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitestEntrypoint, "run", "tests/golden-outputs.test.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    UPDATE_GOLDEN: "1"
  }
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
