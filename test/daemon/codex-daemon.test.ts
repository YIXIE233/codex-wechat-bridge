import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  buildVisibleClientLaunchArgs,
  buildWindowsVisibleClientLaunchCommand,
  cleanupDaemonBeforeStart,
  cleanupSingleBridgeBeforeDaemon,
  formatDaemonStatus,
  parseDaemonCliArgs,
  parseDaemonSwitchCommand,
  waitForVisibleClientConnection,
} from "../../src/daemon/codex-daemon.ts";

test("parseDaemonCliArgs is Codex-only and accepts legacy --adapter codex", () => {
  const cwd = path.resolve("D:\\repo");
  assert.deepEqual(
    parseDaemonCliArgs([
      "--cmd",
      "codex",
      "--cwd",
      cwd,
      "--adapter",
      "codex",
      "--profile",
      "work",
      "--session-start-mode",
      "new",
      "--no-open",
    ]),
    {
      command: "codex",
      cwd,
      profile: "work",
      openVisible: false,
      sessionStartMode: "new",
    },
  );
  assert.throws(() => parseDaemonCliArgs(["--adapter", "claude"]), /Invalid adapter/);
});

test("parseDaemonSwitchCommand only exposes /codex", () => {
  assert.equal(parseDaemonSwitchCommand("/codex"), "codex");
  assert.equal(parseDaemonSwitchCommand("/claude"), null);
  assert.equal(parseDaemonSwitchCommand("/opencode"), null);
});

test("visible client launch args target the Codex remote client", () => {
  const args = buildVisibleClientLaunchArgs({
    cwd: "D:\\repo",
    sessionStartMode: "new",
    cliArgs: ["--model", "gpt-5.5"],
  });
  assert.match(args.join(" "), /codex-remote-client\.(ts|js)/);
  assert.deepEqual(args.slice(-4), ["--cwd", "D:\\repo", "--model", "gpt-5.5"]);
  assert.ok(args.includes("--session-start-mode"));
});

test("Windows visible launch command uses wechat-codex title", () => {
  const command = buildWindowsVisibleClientLaunchCommand({
    cwd: "D:\\repo",
    args: ["client.js", "--cwd", "D:\\repo"],
  });
  assert.match(command, /wechat-codex/);
  assert.match(command, /client\.js/);
});

test("waitForVisibleClientConnection polls until the visible client appears", async () => {
  let polls = 0;
  const connected = await waitForVisibleClientConnection(
    {
      cwd: "D:\\repo",
      timeoutMs: 1_000,
      pollMs: 10,
    },
    {
      isAlive: () => {
        polls += 1;
        return polls === 3;
      },
      sleep: async () => undefined,
      now: () => polls * 10,
    },
  );

  assert.equal(connected, true);
  assert.equal(polls, 3);
});

test("formatDaemonStatus reports the single Codex slot", () => {
  assert.equal(
    formatDaemonStatus({
      cwd: "D:\\repo",
      activeAdapter: "codex",
      startedAt: "2026-07-07T00:00:00.000Z",
      slots: [
        {
          adapter: "codex",
          status: "idle",
          cwd: "D:\\repo",
          companionPid: 123,
          pendingApproval: false,
          pendingUserInput: true,
        },
      ],
    }),
    [
      "codex-wechat-daemon status",
      "cwd: D:\\repo",
      "active: codex",
      "started_at: 2026-07-07T00:00:00.000Z",
      "codex: idle (pending_input, companion_pid=123)",
    ].join("\n"),
  );
});

test("cleanupDaemonBeforeStart clears stale endpoint and workspace endpoint", async () => {
  const cleared: number[] = [];
  let workspaceCleared = false;
  const result = await cleanupDaemonBeforeStart({
    readEndpoint: () => ({
      protocolVersion: 1,
      pid: 100,
      port: 12345,
      token: "token",
      cwd: "D:\\repo",
      startedAt: "2026-07-07T00:00:00.000Z",
    }),
    isAlive: () => false,
    clearEndpoint: (pid) => {
      cleared.push(pid ?? 0);
    },
    clearWorkspaceEndpoints: () => {
      workspaceCleared = true;
    },
    listDaemonProcesses: () => [],
    log: () => undefined,
    daemonLog: () => undefined,
  });

  assert.equal(result.action, "cleared_stale_endpoint");
  assert.deepEqual(cleared, [100]);
  assert.equal(workspaceCleared, true);
});

test("cleanupSingleBridgeBeforeDaemon removes dead bridge lock", async () => {
  let lockCleared = false;
  let workspaceCleared = false;
  const result = await cleanupSingleBridgeBeforeDaemon({
    readLock: () => ({
      pid: 200,
      parentPid: 1,
      instanceId: "bridge-1",
      command: "codex",
      cwd: "D:\\repo",
      startedAt: "2026-07-07T00:00:00.000Z",
      lifecycle: "persistent",
    }),
    isAlive: () => false,
    clearLock: () => {
      lockCleared = true;
    },
    clearWorkspaceEndpoint: () => {
      workspaceCleared = true;
    },
    log: () => undefined,
    daemonLog: () => undefined,
  });

  assert.equal(result.action, "cleared_stale_lock");
  assert.equal(lockCleared, true);
  assert.equal(workspaceCleared, true);
});
