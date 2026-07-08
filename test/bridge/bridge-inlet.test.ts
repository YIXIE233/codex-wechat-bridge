import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("bridge inlet endpoint accepts external send requests", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-inlet-"));
  const cwd = path.join(dataDir, "repo");
  fs.mkdirSync(cwd);

  const script = `
    import assert from "node:assert/strict";
    import { startBridgeInletServer, readBridgeInletEndpoint, sendBridgeInletRequest } from "./src/bridge/bridge-inlet.ts";

    const cwd = ${JSON.stringify(cwd)};
    const seen = [];
    const server = await startBridgeInletServer({
      cwd,
      onSend: async (request) => {
        seen.push(request);
        return { ok: true, message: "accepted" };
      },
    });
    const endpoint = readBridgeInletEndpoint(cwd);
    assert.equal(endpoint?.port, server.endpoint.port);
    const response = await sendBridgeInletRequest(server.endpoint, {
      type: "send",
      text: "hello",
      foreground: true,
    });
    assert.deepEqual(response, { ok: true, message: "accepted" });
    assert.equal(seen[0].text, "hello");
    assert.equal(seen[0].foreground, true);
    await server.close();
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
