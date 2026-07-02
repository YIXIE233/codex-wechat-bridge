#!/usr/bin/env node
import fs from "node:fs";

import { TurnQueue } from "../service/turn-queue.ts";

type EnqueueOptions = {
  text?: string;
  file?: string;
  recipientId?: string;
};

function parseArgs(argv: string[]): EnqueueOptions {
  const options: EnqueueOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--text":
      case "-m":
        if (!next) {
          throw new Error(`${arg} requires a value`);
        }
        options.text = next;
        i += 1;
        break;
      case "--file":
      case "-f":
        if (!next) {
          throw new Error(`${arg} requires a value`);
        }
        options.file = next;
        i += 1;
        break;
      case "--recipient":
        if (!next) {
          throw new Error("--recipient requires a value");
        }
        options.recipientId = next;
        i += 1;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`Usage: codex-wechat-enqueue (--text <prompt> | --file <prompt-file>) [--recipient <wechat-user-id>]

Queues a prompt for a running codex-wechat-bridge service. The service will run it
in the same Codex thread and send the final answer back to WeChat.`);
}

function readPrompt(options: EnqueueOptions): string {
  if (options.text && options.file) {
    throw new Error("Use only one of --text or --file.");
  }
  if (options.text) {
    return options.text;
  }
  if (options.file) {
    return fs.readFileSync(options.file, "utf8");
  }
  throw new Error("Missing prompt. Use --text or --file.");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const item = new TurnQueue().enqueue({
    text: readPrompt(options),
    recipientId: options.recipientId,
  });
  console.log(`QUEUED_TURN=${item.id}`);
}

main();
