#!/usr/bin/env node
import { CodexWechatService } from "../service/codex-wechat-service.ts";

type CliOptions = {
  cwd: string;
  codexCommand?: string;
  profile?: string;
  approvalPolicy?: string;
  sandbox?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cwd: process.cwd(),
    approvalPolicy: "on-request",
    sandbox: "workspace-write",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--cwd":
        if (!next) {
          throw new Error("--cwd requires a value");
        }
        options.cwd = next;
        i += 1;
        break;
      case "--codex":
      case "--cmd":
        if (!next) {
          throw new Error(`${arg} requires a value`);
        }
        options.codexCommand = next;
        i += 1;
        break;
      case "--profile":
        if (!next) {
          throw new Error("--profile requires a value");
        }
        options.profile = next;
        i += 1;
        break;
      case "--approval-policy":
        if (!next) {
          throw new Error("--approval-policy requires a value");
        }
        options.approvalPolicy = next;
        i += 1;
        break;
      case "--sandbox":
        if (!next) {
          throw new Error("--sandbox requires a value");
        }
        options.sandbox = next;
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
  console.log(`Usage: codex-wechat-bridge [--cwd <path>] [--codex <command>] [--profile <name>] [--approval-policy <policy>] [--sandbox <mode>]

Runs a single Codex app-server backed WeChat bridge.`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const service = new CodexWechatService(options);
  await service.run();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
