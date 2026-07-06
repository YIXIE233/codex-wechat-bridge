import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCodexApprovalRequest,
  buildCodexCliArgs,
  buildCodexUserInputRequest,
} from "../../src/codex/codex-runtime-shared.ts";

test("buildCodexCliArgs enables Codex app-server remote mode", () => {
  assert.deepEqual(
    buildCodexCliArgs("http://127.0.0.1:1234", {
      profile: "work",
      inlineMode: true,
      resumeThreadId: "thread_123",
      extraCliArgs: ["--model", "gpt-5.5"],
    }),
    [
      "resume",
      "thread_123",
      "--enable",
      "tui_app_server",
      "--remote",
      "http://127.0.0.1:1234",
      "--no-alt-screen",
      "--profile",
      "work",
      "--model",
      "gpt-5.5",
    ],
  );
});

test("buildCodexApprovalRequest keeps command approval semantics", () => {
  const request = buildCodexApprovalRequest("item/commandExecution/requestApproval", {
    command: "pnpm test",
    cwd: "D:\\repo",
    reason: "run the test suite",
  });

  assert.equal(request?.source, "cli");
  assert.equal(
    request?.summary,
    "Codex needs approval before running a command: run the test suite",
  );
  assert.equal(request?.commandPreview, "pnpm test (D:\\repo)");
});

test("buildCodexUserInputRequest converts Codex tool questions", () => {
  const request = buildCodexUserInputRequest({
    questions: [
      {
        id: "choice",
        header: "Mode",
        question: "Pick a mode",
        options: [
          { label: "Fast", description: "Use the fast path" },
          { label: "Safe", description: "Use the safe path" },
        ],
      },
    ],
  });

  assert.equal(request?.summary, "Codex needs more information before the tool can continue.");
  assert.equal(request?.questions[0]?.id, "choice");
  assert.equal(request?.questions[0]?.options?.[1]?.label, "Safe");
});
