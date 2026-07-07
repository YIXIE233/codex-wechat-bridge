import test from "node:test";
import assert from "node:assert/strict";

import {
  isWechatBridgeCommandLine,
  isWechatDaemonCommandLine,
  isWechatDaemonCommandLineForCwd,
  parsePosixBridgeProcessProbeOutput,
  parseWindowsBridgeProcessProbeOutput,
} from "../../src/bridge/bridge-process-reaper.ts";

test("detects Codex-only bridge command lines", () => {
  assert.equal(
    isWechatBridgeCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" --no-warnings --experimental-strip-types C:\\repo\\src\\bridge\\wechat-bridge.ts --cwd C:\\repo',
    ),
    true,
  );
  assert.equal(
    isWechatBridgeCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\codex-wechat-bridge\\dist\\bridge\\wechat-bridge.js" "--cwd" "C:\\repo"',
    ),
    true,
  );
  assert.equal(
    isWechatBridgeCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\codex-wechat-bridge\\bin\\wechat-bridge-codex.mjs"',
    ),
    true,
  );
  assert.equal(
    isWechatBridgeCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\src\\codex\\codex-remote-client.ts',
    ),
    false,
  );
  assert.equal(
    isWechatBridgeCommandLine(
      '/bin/sh -c cd /root/codex-wechat-bridge && /usr/local/bin/node /root/codex-wechat-bridge/bin/codex-wechat-bridge.mjs --cwd /root/qdii-nasdaq',
    ),
    false,
  );
});

test("detects Codex-only daemon command lines", () => {
  assert.equal(
    isWechatDaemonCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\src\\daemon\\codex-daemon.ts --cwd C:\\repo',
    ),
    true,
  );
  assert.equal(
    isWechatDaemonCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\bin\\codex-wechat-daemon.mjs',
    ),
    true,
  );
  assert.equal(
    isWechatDaemonCommandLine(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\src\\bridge\\wechat-bridge.ts --cwd C:\\repo',
    ),
    false,
  );
  assert.equal(
    isWechatDaemonCommandLine(
      '/bin/bash -lc /usr/local/bin/node /root/codex-wechat-bridge/bin/codex-wechat-daemon.mjs --cwd /root/qdii-nasdaq',
    ),
    false,
  );
});

test("matches Codex-only daemon command lines for a startup cwd", () => {
  assert.equal(
    isWechatDaemonCommandLineForCwd(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\bin\\codex-wechat-daemon.mjs "--cwd" "C:\\Users\\user"',
      "C:\\Users\\user",
    ),
    true,
  );
  assert.equal(
    isWechatDaemonCommandLineForCwd(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\dist\\daemon\\codex-daemon.js --cwd=C:\\Users\\user',
      "C:\\Users\\user",
    ),
    true,
  );
  assert.equal(
    isWechatDaemonCommandLineForCwd(
      '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\dist\\daemon\\codex-daemon.js --cwd C:\\Users\\other',
      "C:\\Users\\user",
    ),
    false,
  );
});

test("parses Windows process probe output and filters non-bridge rows", () => {
  const output = JSON.stringify([
    {
      ProcessId: 101,
      ParentProcessId: 1,
      Name: "node.exe",
      CommandLine:
        '"C:\\Program Files\\nodejs\\node.exe" --no-warnings --experimental-strip-types C:\\repo\\src\\bridge\\wechat-bridge.ts --cwd C:\\Users\\user',
    },
    {
      ProcessId: 202,
      ParentProcessId: 1,
      Name: "node.exe",
      CommandLine:
        '"C:\\Program Files\\nodejs\\node.exe" --no-warnings --experimental-strip-types C:\\repo\\src\\codex\\codex-start.ts',
    },
    {
      ProcessId: 204,
      ParentProcessId: 1,
      Name: "node.exe",
      CommandLine:
        '"C:\\Program Files\\nodejs\\node.exe" "C:\\repo\\bin\\codex-wechat-bridge.mjs" "--cwd" "C:\\repo"',
    },
    {
      ProcessId: 303,
      ParentProcessId: 1,
      Name: "node.exe",
      CommandLine:
        '"C:\\Program Files\\nodejs\\node.exe" --no-warnings --experimental-strip-types C:\\repo\\src\\bridge\\wechat-bridge.ts --cwd C:\\repo',
    },
  ]);

  assert.deepEqual(parseWindowsBridgeProcessProbeOutput(output, 303), [
    {
      pid: 101,
      parentPid: 1,
      name: "node.exe",
      commandLine:
        '"C:\\Program Files\\nodejs\\node.exe" --no-warnings --experimental-strip-types C:\\repo\\src\\bridge\\wechat-bridge.ts --cwd C:\\Users\\user',
    },
    {
      pid: 204,
      parentPid: 1,
      name: "node.exe",
      commandLine:
        '"C:\\Program Files\\nodejs\\node.exe" "C:\\repo\\bin\\codex-wechat-bridge.mjs" "--cwd" "C:\\repo"',
    },
  ]);
});

test("parses POSIX process probe output and ignores the current pid", () => {
  const output = [
    "101 node --no-warnings --experimental-strip-types /repo/src/bridge/wechat-bridge.ts --cwd /tmp/work",
    "202 node --no-warnings --experimental-strip-types /repo/src/codex/codex-start.ts",
    "303 node --no-warnings --experimental-strip-types /repo/src/bridge/wechat-bridge.ts --cwd /repo",
  ].join("\n");

  assert.deepEqual(parsePosixBridgeProcessProbeOutput(output, 303), [
    {
      pid: 101,
      commandLine:
        "node --no-warnings --experimental-strip-types /repo/src/bridge/wechat-bridge.ts --cwd /tmp/work",
    },
  ]);
});
