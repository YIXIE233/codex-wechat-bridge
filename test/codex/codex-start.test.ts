import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBackgroundBridgeArgs,
  decideLaunchAction,
  parseCliArgs,
} from "../../src/codex/codex-start.ts";

test("parseCliArgs keeps wechat-codex-start flags and forwards Codex args", () => {
  assert.deepEqual(
    parseCliArgs([
      "--cwd",
      "D:\\repo",
      "--profile",
      "work",
      "--timeout-ms",
      "2000",
      "--session-start-mode",
      "new",
      "--model",
      "gpt-5.5",
    ]),
    {
      cwd: "D:\\repo",
      profile: "work",
      timeoutMs: 2000,
      sessionStartMode: "new",
      cliArgs: ["--model", "gpt-5.5"],
    },
  );
});

test("buildBackgroundBridgeArgs starts Codex-only bridge with companion lifecycle", () => {
  assert.deepEqual(
    buildBackgroundBridgeArgs("D:\\pkg\\dist\\bridge\\wechat-bridge.js", {
      cwd: "D:\\repo",
      profile: "work",
      timeoutMs: 2000,
      sessionStartMode: "new",
      cliArgs: [],
    }),
    [
      "--no-warnings",
      "D:\\pkg\\dist\\bridge\\wechat-bridge.js",
      "--cwd",
      "D:\\repo",
      "--lifecycle",
      "companion_bound",
      "--session-start-mode",
      "new",
      "--profile",
      "work",
    ],
  );
});

test("decideLaunchAction reuses, opens, restarts, or switches like original codex branch", () => {
  const lock = {
    pid: 123,
    parentPid: 1,
    instanceId: "inst",
    command: "codex",
    cwd: "D:\\repo",
    startedAt: "2026-07-06T00:00:00.000Z",
    lifecycle: "persistent" as const,
  };

  assert.equal(
    decideLaunchAction({
      requestedCwd: "D:\\repo",
      runningLock: lock,
      lockShouldAutoReclaim: false,
      endpoint: null,
      endpointIsReachable: false,
      companionIsAlive: false,
    }).kind,
    "restart_unhealthy",
  );

  assert.equal(
    decideLaunchAction({
      requestedCwd: "D:\\repo2",
      runningLock: lock,
      lockShouldAutoReclaim: false,
      endpoint: null,
      endpointIsReachable: false,
      companionIsAlive: false,
    }).kind,
    "switch_workspace",
  );
});
