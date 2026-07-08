#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  readBridgeInletEndpoint,
  sendBridgeInletRequest,
  type BridgeInletSendRequest,
} from "../bridge/bridge-inlet.ts";
import type { InboundWechatAttachment } from "../wechat/wechat-transport.ts";

type SendCliOptions = {
  cwd: string;
  text?: string;
  file?: string;
  threadId?: string;
  foreground: boolean;
  attachments: InboundWechatAttachment[];
};

function parseArgs(argv: string[]): SendCliOptions {
  const options: SendCliOptions = {
    cwd: process.cwd(),
    foreground: false,
    attachments: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    switch (arg) {
      case "--cwd":
        if (!next) throw new Error("--cwd requires a value");
        options.cwd = path.resolve(next);
        i += 1;
        break;
      case "--text":
        if (next === undefined) throw new Error("--text requires a value");
        options.text = next;
        i += 1;
        break;
      case "--file":
        if (!next) throw new Error("--file requires a value");
        options.file = path.resolve(next);
        i += 1;
        break;
      case "--thread":
        if (!next) throw new Error("--thread requires a value");
        options.threadId = next;
        i += 1;
        break;
      case "--foreground":
        options.foreground = true;
        break;
      case "--attach": {
        if (!next) throw new Error("--attach requires a value");
        const filePath = path.resolve(next);
        const stat = fs.statSync(filePath);
        options.attachments.push({
          kind: inferAttachmentKind(filePath),
          path: filePath,
          fileName: path.basename(filePath),
          sizeBytes: stat.size,
        });
        i += 1;
        break;
      }
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function inferAttachmentKind(filePath: string): InboundWechatAttachment["kind"] {
  return /\.(?:png|jpe?g|gif|webp|bmp)$/i.test(filePath) ? "image" : "file";
}

function printUsage(): void {
  console.log(`Usage: codex-wechat-send [--cwd <path>] (--text <prompt> | --file <prompt-file>) [--thread <id> --foreground] [--attach <file>]...

Sends a prompt through the running codex-wechat-bridge foreground inlet.`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const text = options.text ?? (options.file ? fs.readFileSync(options.file, "utf8") : undefined);
  if (text === undefined) {
    throw new Error("Missing prompt. Use --text or --file.");
  }

  const endpoint = readBridgeInletEndpoint(options.cwd);
  if (!endpoint) {
    throw new Error(`No running codex-wechat-bridge inlet found for ${options.cwd}.`);
  }

  const request: BridgeInletSendRequest = {
    type: "send",
    text,
    threadId: options.threadId,
    foreground: options.foreground,
    attachments: options.attachments,
  };
  const response = await sendBridgeInletRequest(endpoint, request);
  if (!response.ok) {
    throw new Error(response.error);
  }
  console.log(response.message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
