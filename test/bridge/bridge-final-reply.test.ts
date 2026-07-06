import test from "node:test";
import assert from "node:assert/strict";

import { forwardWechatFinalReply } from "../../src/bridge/bridge-final-reply.ts";

test("forwardWechatFinalReply sends visible text and parsed attachments", async () => {
  const sentText: string[] = [];
  const sentImages: string[] = [];
  const sentFiles: string[] = [];

  await forwardWechatFinalReply({
    rawText: [
      "Here is the chart.",
      "",
      "```wechat-attachments",
      "image C:\\Users\\me\\Desktop\\chart.png",
      "file C:\\Users\\me\\Desktop\\report.pdf",
      "```",
    ].join("\n"),
    sender: {
      sendText: async (text) => {
        sentText.push(text);
      },
      sendImage: async (path) => {
        sentImages.push(path);
      },
      sendFile: async (path) => {
        sentFiles.push(path);
      },
      sendVoice: async () => undefined,
      sendVideo: async () => undefined,
    },
  });

  assert.deepEqual(sentText, ["Here is the chart."]);
  assert.deepEqual(sentImages, ["C:\\Users\\me\\Desktop\\chart.png"]);
  assert.deepEqual(sentFiles, ["C:\\Users\\me\\Desktop\\report.pdf"]);
});
