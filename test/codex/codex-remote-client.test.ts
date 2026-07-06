import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRemoteCodexClientArgs,
  buildRemoteCodexClientEnv,
  parseCliArgs,
} from "../../src/codex/codex-remote-client.ts";
import type { LocalClientEndpoint } from "../../src/codex/runtime-types.ts";

const endpoint: LocalClientEndpoint = {
  protocolVersion: 2,
  runtimeKind: "codex_runtime_host",
  instanceId: "inst",
  kind: "codex",
  port: 1234,
  token: "secret",
  serverUrl: "ws://127.0.0.1:1234",
  remoteAuthTokenEnv: "TOKEN_ENV",
  cwd: "D:\\repo",
  command: "codex",
  profile: "work",
  sharedThreadId: "thread_123",
  startedAt: "2026-07-06T00:00:00.000Z",
};

test("parseCliArgs forwards unknown args to visible Codex", () => {
  assert.deepEqual(parseCliArgs(["--cwd", "D:\\repo", "--model", "gpt-5.5"]), {
    cwd: "D:\\repo",
    cliArgs: ["--model", "gpt-5.5"],
  });
});

test("buildRemoteCodexClientArgs preserves original remote auth and passthrough behavior", () => {
  assert.deepEqual(
    buildRemoteCodexClientArgs(endpoint, {
      extraCliArgs: ["--model", "gpt-5.5"],
    }),
    [
      "resume",
      "thread_123",
      "--enable",
      "tui_app_server",
      "--remote",
      "ws://127.0.0.1:1234",
      "--profile",
      "work",
      "--remote-auth-token-env",
      "TOKEN_ENV",
      "--model",
      "gpt-5.5",
    ],
  );

  assert.throws(
    () => buildRemoteCodexClientArgs(endpoint, { extraCliArgs: ["--remote", "x"] }),
    /do not pass --remote/,
  );
});

test("buildRemoteCodexClientEnv puts endpoint token into selected env var", () => {
  const env = buildRemoteCodexClientEnv(endpoint, { PATH: "x" });
  assert.equal(env.TOKEN_ENV, "secret");
  assert.equal(env.PATH, "x");
});
