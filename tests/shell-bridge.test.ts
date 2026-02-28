import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import {
  getShellBridgeStatus,
  installShellBridge,
  removeShellBridge,
  renderShellBridgeScript
} from "../src/shell-bridge";

const tmpDirs: string[] = [];

afterEach(async () => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("shell bridge", () => {
  it("installs shell bridge idempotently", async () => {
    const root = await createTempDir();
    const profilePath = path.join(root, "bashrc");

    await writeFile(profilePath, "export PATH=/usr/bin\n", "utf8");

    const first = await installShellBridge({
      shell: "bash",
      profilePath
    });
    const second = await installShellBridge({
      shell: "bash",
      profilePath
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const content = await readFile(profilePath, "utf8");
    expect(content).toContain("# >>> supercodex shell bridge >>>");
    expect(content).toContain("sc() {");

    const status = await getShellBridgeStatus({
      shell: "bash",
      profilePath
    });
    expect(status.installed).toBe(true);
    expect(status.profileExists).toBe(true);
  });

  it("removes only the managed shell bridge block", async () => {
    const root = await createTempDir();
    const profilePath = path.join(root, "zshrc");

    await writeFile(
      profilePath,
      [
        "# local start",
        "export FOO=bar",
        "",
        "# footer",
        "alias ll='ls -la'",
        ""
      ].join("\n"),
      "utf8"
    );

    await installShellBridge({
      shell: "zsh",
      profilePath
    });

    const removed = await removeShellBridge({
      shell: "zsh",
      profilePath
    });
    expect(removed.changed).toBe(true);

    const content = await readFile(profilePath, "utf8");
    expect(content).toContain("# local start");
    expect(content).toContain("alias ll='ls -la'");
    expect(content).not.toContain("# >>> supercodex shell bridge >>>");

    const status = await getShellBridgeStatus({
      shell: "zsh",
      profilePath
    });
    expect(status.installed).toBe(false);
  });

  it("renders scripts for fish and powershell", () => {
    const fishScript = renderShellBridgeScript("fish");
    const psScript = renderShellBridgeScript("powershell");

    expect(fishScript).toContain("function sc");
    expect(fishScript).toContain("case '/sc:*' 'sc:*'");
    expect(psScript).toContain("function sc {");
    expect(psScript).toContain("$first -like '/sc:*'");
  });
});

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "supercodex-shell-test-"));
  tmpDirs.push(root);
  return root;
}
