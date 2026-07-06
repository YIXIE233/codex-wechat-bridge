import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeBridgeLockPayload,
  shouldAutoReclaimBridgeLock,
} from "../../src/bridge/bridge-state.ts";

test("normalizeBridgeLockPayload accepts old Codex lock records", () => {
  const lock = normalizeBridgeLockPayload({
    pid: 123,
    parentPid: 0,
    instanceId: "bridge_1",
    adapter: "codex",
    command: "codex",
    cwd: "D:\\repo",
    startedAt: "2026-07-03T00:00:00.000Z",
    lifecycle: "persistent",
  });

  assert.equal(lock?.lifecycle, "persistent");
  assert.equal(lock?.cwd, "D:\\repo");
});

test("normalizeBridgeLockPayload accepts new Codex-only lock records without adapter", () => {
  const lock = normalizeBridgeLockPayload({
    pid: 123,
    parentPid: 0,
    instanceId: "bridge_1",
    command: "codex",
    cwd: "D:\\repo",
    startedAt: "2026-07-03T00:00:00.000Z",
    lifecycle: "persistent",
  });

  assert.equal(lock?.lifecycle, "persistent");
  assert.equal(lock?.cwd, "D:\\repo");
});

test("normalizeBridgeLockPayload rejects non-Codex old lock records", () => {
  assert.equal(
    normalizeBridgeLockPayload({
      pid: 123,
      instanceId: "bridge_1",
      adapter: "other",
      command: "other",
      cwd: "D:\\repo",
      startedAt: "2026-07-03T00:00:00.000Z",
    }),
    null,
  );
});

test("shouldAutoReclaimBridgeLock reclaims dead persistent process locks", () => {
  const lock = normalizeBridgeLockPayload({
    pid: 123,
    instanceId: "bridge_1",
    adapter: "codex",
    command: "codex",
    cwd: "D:\\repo",
    startedAt: "2026-07-03T00:00:00.000Z",
  });

  assert.ok(lock);
  assert.equal(shouldAutoReclaimBridgeLock(lock, () => false), true);
  assert.equal(shouldAutoReclaimBridgeLock(lock, () => true), false);
});
