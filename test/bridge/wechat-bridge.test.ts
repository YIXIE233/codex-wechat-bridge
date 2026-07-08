import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  canDrainDeferredCodexInboundQueue,
  formatUserFacingInboundError,
  parseCliArgs,
  shouldDeferCodexInboundMessage,
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

test("generalized queue defers ordinary busy Codex input regardless of origin", () => {
  assert.equal(
    shouldDeferCodexInboundMessage({
      status: "busy",
      hasPendingConfirmation: false,
      hasPendingUserInput: false,
      hasSystemCommand: false,
    }),
    true,
  );
  assert.equal(
    shouldDeferCodexInboundMessage({
      status: "idle",
      hasPendingConfirmation: false,
      hasPendingUserInput: false,
      hasSystemCommand: false,
    }),
    false,
  );
  assert.equal(
    shouldDeferCodexInboundMessage({
      status: "busy",
      hasPendingConfirmation: false,
      hasPendingUserInput: false,
      hasSystemCommand: true,
    }),
    false,
  );
  assert.equal(
    shouldDeferCodexInboundMessage({
      status: "busy",
      hasPendingConfirmation: true,
      hasPendingUserInput: false,
      hasSystemCommand: false,
    }),
    false,
  );
});

test("deferred queue drains only when Codex is idle and no prompt is pending", () => {
  assert.equal(
    canDrainDeferredCodexInboundQueue({
      deferredCount: 1,
      status: "idle",
      activeTurnId: undefined,
      hasPendingConfirmation: false,
      hasPendingUserInput: false,
      hasPendingApproval: false,
      hasActiveTask: false,
    }),
    true,
  );
  assert.equal(
    canDrainDeferredCodexInboundQueue({
      deferredCount: 1,
      status: "busy",
      activeTurnId: "turn",
      hasPendingConfirmation: false,
      hasPendingUserInput: false,
      hasPendingApproval: false,
      hasActiveTask: false,
    }),
    false,
  );
});
