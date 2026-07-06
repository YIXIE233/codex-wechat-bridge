import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  formatUserFacingInboundError,
  parseCliArgs,
  shouldForwardBridgeEventToWechat,
} from "../../src/bridge/wechat-bridge.ts";

test("parseCliArgs is Codex-only and has no runtime selector", () => {
  const cwd = path.resolve("D:\\repo");
  assert.deepEqual(parseCliArgs(["--cmd", "codex", "--cwd", cwd, "--session-start-mode", "new"]), {
    command: "codex",
    cwd,
    profile: undefined,
    lifecycle: "persistent",
    sessionStartMode: "new",
  });

  assert.deepEqual(parseCliArgs(["--cwd", cwd, "--lifecycle", "companion_bound"]), {
    command: "codex",
    cwd,
    profile: undefined,
    lifecycle: "companion_bound",
    sessionStartMode: "restore",
  });

  assert.throws(() => parseCliArgs(["--adapter", "codex"]), /Unknown argument: --adapter/);
});

test("shouldForwardBridgeEventToWechat keeps Codex event forwarding", () => {
  assert.equal(shouldForwardBridgeEventToWechat("final_reply"), true);
  assert.equal(shouldForwardBridgeEventToWechat("thinking"), true);
  assert.equal(shouldForwardBridgeEventToWechat("approval_required"), true);
});

test("formatUserFacingInboundError keeps bridge error prefix", () => {
  assert.equal(
    formatUserFacingInboundError({
      errorText: "boom",
    }),
    "Bridge error: boom",
  );
});
