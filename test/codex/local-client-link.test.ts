import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("local client endpoint write/read/clear uses workspace-scoped Codex endpoint files", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-link-"));
  const cwd = path.join(dataDir, "repo");
  fs.mkdirSync(cwd);

  const script = `
    import assert from "node:assert/strict";
    import fs from "node:fs";
    import { getWorkspaceCodexEndpointFile, getWorkspaceChannelPaths } from "./src/wechat/channel-config.ts";
    import { writeLocalClientEndpoint, readLocalClientEndpoint, clearLocalClientEndpoint } from "./src/codex/local-client-link.ts";

    const endpoint = {
      protocolVersion: 2,
      runtimeKind: "codex_runtime_host",
      instanceId: "inst",
      kind: "codex",
      port: 1234,
      token: "secret",
      cwd: ${JSON.stringify(cwd)},
      command: "codex",
      startedAt: "2026-07-06T00:00:00.000Z",
    };
    writeLocalClientEndpoint(endpoint);
    assert.equal(readLocalClientEndpoint(${JSON.stringify(cwd)})?.instanceId, "inst");
    assert.equal(fs.existsSync(getWorkspaceCodexEndpointFile(${JSON.stringify(cwd)})), true);
    assert.equal(fs.existsSync(getWorkspaceChannelPaths(${JSON.stringify(cwd)}).endpointFile), true);
    clearLocalClientEndpoint(${JSON.stringify(cwd)}, "inst");
    assert.equal(readLocalClientEndpoint(${JSON.stringify(cwd)}), null);
  `;

  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CLI_BRIDGE_DATA_DIR: dataDir,
      },
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
