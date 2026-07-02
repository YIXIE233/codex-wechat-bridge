#!/usr/bin/env node
import { WeChatTransport } from "../wechat/wechat-transport.ts";

type SmokeWechatOptions = {
  recipientId?: string;
  message: string;
  pollMs: number;
};

function parseArgs(argv: string[]): SmokeWechatOptions {
  const options: SmokeWechatOptions = {
    message: "codex-wechat-bridge outgoing smoke：微信发送链路测试通过。",
    pollMs: 0,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--recipient":
        if (!next) {
          throw new Error("--recipient requires a value");
        }
        options.recipientId = next;
        i += 1;
        break;
      case "--message":
        if (!next) {
          throw new Error("--message requires a value");
        }
        options.message = next;
        i += 1;
        break;
      case "--poll-ms":
        if (!next) {
          throw new Error("--poll-ms requires a value");
        }
        options.pollMs = Number(next);
        i += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const wechat = new WeChatTransport({
    log: (message) => console.log(message),
    logError: (message) => console.error(message),
  });
  const account = wechat.getCredentials();
  if (!account) {
    throw new Error("Missing WeChat credentials. Run codex-wechat-setup first.");
  }
  const recipient = options.recipientId ?? account.userId;
  if (!recipient) {
    throw new Error("No recipient was provided and account.userId is missing.");
  }
  const sentTo = await wechat.sendNotification(options.message, recipient);
  console.log(`WECHAT_SEND_OK=${sentTo}`);

  if (options.pollMs > 0) {
    const result = await wechat.pollMessages({
      timeoutMs: options.pollMs,
      minCreatedAtMs: Date.now(),
    });
    console.log(
      `WECHAT_POLL_RESULT=${JSON.stringify({
        count: result.messages.length,
        ignoredBacklogCount: result.ignoredBacklogCount,
        messages: result.messages.map((message) => ({
          senderId: message.senderId,
          text: message.text.slice(0, 120),
          attachments: message.attachments.length,
        })),
      })}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
