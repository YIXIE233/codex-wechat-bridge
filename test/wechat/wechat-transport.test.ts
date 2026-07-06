import test from "node:test";
import assert from "node:assert/strict";

import {
  extractInboundMessageContent,
  isWechatSyncSessionTimeout,
} from "../../src/wechat/wechat-transport.ts";

test("isWechatSyncSessionTimeout detects WeChat session timeout responses", () => {
  assert.equal(isWechatSyncSessionTimeout({ errcode: -14, errmsg: "session timeout" }), true);
  assert.equal(isWechatSyncSessionTimeout({ errcode: 0, errmsg: "ok" }), false);
});

test("extractInboundMessageContent keeps text and voice transcript", () => {
  const extracted = extractInboundMessageContent({
    item_list: [
      { type: 1, text_item: { text: "hello" } },
      { type: 3, voice_item: { text: "voice transcript" } },
    ],
  });

  assert.equal(extracted.text, "hello\nvoice transcript");
  assert.deepEqual(extracted.attachments, []);
});
