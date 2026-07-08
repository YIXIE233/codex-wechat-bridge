import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWechatInboundPrompt,
  parseBridgeCommand,
  parseSystemCommand,
  parseWechatFinalReply,
} from "../../src/bridge/bridge-utils.ts";

test("parseSystemCommand keeps Codex WeChat command mapping", () => {
  assert.deepEqual(parseSystemCommand("/status"), { type: "status" });
  assert.deepEqual(parseSystemCommand("/stop"), { type: "stop" });
  assert.deepEqual(parseSystemCommand("/new"), { type: "new_session" });
  assert.deepEqual(parseSystemCommand("/confirm"), { type: "confirm" });
  assert.deepEqual(parseSystemCommand("/deny"), { type: "deny" });
  assert.deepEqual(parseSystemCommand("/answer 1"), { type: "answer", raw: "1" });
  assert.deepEqual(parseSystemCommand("/resume thread_123"), {
    type: "resume",
    target: "thread_123",
  });
});

test("parseBridgeCommand keeps bridge-only commands under double slash", () => {
  assert.deepEqual(parseBridgeCommand("//queue"), { type: "queue" });
  assert.deepEqual(parseBridgeCommand("//drop 2"), { type: "drop", index: 2 });
  assert.deepEqual(parseBridgeCommand("//clear-queue"), { type: "clear_queue" });
  assert.deepEqual(parseBridgeCommand("//steer add context"), { type: "steer", raw: "add context" });
  assert.deepEqual(parseBridgeCommand("//begin"), { type: "begin" });
  assert.deepEqual(parseBridgeCommand("//end"), { type: "end" });
  assert.deepEqual(parseBridgeCommand("//cancel"), { type: "cancel" });
  assert.equal(parseBridgeCommand("/status"), null);
  assert.equal(parseBridgeCommand("//drop nope"), null);
});

test("buildWechatInboundPrompt includes local attachment paths for Codex", () => {
  const prompt = buildWechatInboundPrompt("看这个图片", [
    { kind: "image", path: "C:\\Users\\me\\Pictures\\a.png", name: "a.png" },
  ]);

  assert.match(prompt, /看这个图片/);
  assert.match(prompt, /C:\\Users\\me\\Pictures\\a\.png/);
  assert.match(prompt, /Read each path above/);
});

test("parseWechatFinalReply extracts trailing wechat-attachments block", () => {
  const parsed = parseWechatFinalReply(
    [
      "Done.",
      "",
      "```wechat-attachments",
      "image C:\\Users\\me\\Desktop\\chart.png",
      "file C:\\Users\\me\\Desktop\\report.pdf",
      "```",
    ].join("\n"),
  );

  assert.equal(parsed.visibleText, "Done.");
  assert.deepEqual(parsed.attachments, [
    { kind: "image", path: "C:\\Users\\me\\Desktop\\chart.png" },
    { kind: "file", path: "C:\\Users\\me\\Desktop\\report.pdf" },
  ]);
});
