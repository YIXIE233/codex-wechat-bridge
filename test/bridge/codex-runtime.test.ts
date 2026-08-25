import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCodexApprovalRequest,
  buildCodexCliArgs,
  buildCodexUserInputRequest,
} from "../../src/codex/codex-runtime-shared.ts";
import { createCodexRuntime } from "../../src/codex/codex-runtime.ts";

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

test("local Codex thread follow subscribes bridge client to turn events", async () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  }) as any;
  const requests: Array<{ method: string; params: any }> = [];

  runtime.sendRpcRequest = async (method: string, params: any) => {
    requests.push({ method, params });
    return { thread: { id: params.threadId } };
  };

  runtime.handleRpcNotification("thread/started", {
    thread: {
      id: "thread_local",
      cwd: process.cwd(),
    },
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(runtime.getState().sharedThreadId, "thread_local");
  assert.deepEqual(requests, [
    {
      method: "thread/resume",
      params: {
        threadId: "thread_local",
        cwd: process.cwd(),
        approvalPolicy: "never",
        approvalsReviewer: "user",
        sandbox: "danger-full-access",
        excludeTurns: true,
      },
    },
  ]);
});

test("Codex steer sends turn/steer for the active turn", async () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  }) as any;
  const requests: Array<{ method: string; params: any }> = [];

  runtime.activeTurn = {
    threadId: "thread_123",
    turnId: "turn_456",
    origin: "wechat",
  };
  runtime.sendRpcRequest = async (method: string, params: any) => {
    requests.push({ method, params });
    return {};
  };

  assert.equal(await runtime.steerInput("extra guidance"), true);
  assert.deepEqual(requests, [
    {
      method: "turn/steer",
      params: {
        threadId: "thread_123",
        expectedTurnId: "turn_456",
        input: [{ type: "text", text: "extra guidance" }],
      },
    },
  ]);
});

test("Codex steer reports false without an active turn", async () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  });

  assert.equal(await runtime.steerInput?.("extra guidance"), false);
});

test("Codex recovers busy state when no turn is active", () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  }) as any;
  const events: any[] = [];

  runtime.state.status = "busy";
  runtime.setEventSink((event: any) => events.push(event));

  assert.equal(runtime.recoverStaleState(), true);
  assert.equal(runtime.getState().status, "idle");
  assert.equal(events.at(-1)?.type, "task_complete");
  assert.equal(runtime.recoverStaleState(), false);
});

test("Codex ignores late events for completed turns", () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  }) as any;

  runtime.state.status = "idle";
  runtime.sharedThreadId = "thread_local";
  runtime.rememberCompletedTurn("turn_done");
  runtime.handleRpcNotification("item/completed", {
    threadId: "thread_local",
    turnId: "turn_done",
    item: { type: "agentMessage", text: "late" },
  });

  assert.equal(runtime.getState().status, "idle");
  assert.equal(runtime.activeTurn, null);
});

test("Codex recovers final reply from turn/completed items", () => {
  const runtime = createCodexRuntime({
    kind: "codex",
    command: "codex",
    cwd: process.cwd(),
    renderMode: "headless",
  }) as any;
  const events: any[] = [];

  runtime.state.status = "busy";
  runtime.sharedThreadId = "thread_123";
  runtime.activeTurn = {
    threadId: "thread_123",
    turnId: "turn_456",
    origin: "wechat",
  };
  runtime.setEventSink((event: any) => events.push(event));

  runtime.handleRpcNotification("turn/completed", {
    threadId: "thread_123",
    turn: {
      id: "turn_456",
      status: "completed",
      items: [
        { type: "agentMessage", id: "msg_1", text: "progress", phase: "commentary" },
        { type: "agentMessage", id: "msg_2", text: "SIGNAL_V1_INLET_OK", phase: "final_answer" },
      ],
    },
  });

  assert.equal(runtime.getState().status, "idle");
  assert.equal(runtime.activeTurn, null);
  assert.equal(events.find((event) => event.type === "final_reply")?.text, "SIGNAL_V1_INLET_OK");
  assert.equal(events.at(-1)?.type, "task_complete");
});
