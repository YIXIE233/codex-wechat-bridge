#!/usr/bin/env node
import { CodexAppServerProcess } from "../codex/app-server-process.ts";
import { CodexClient } from "../codex/codex-client.ts";
import { CodexRpcClient } from "../codex/rpc-client.ts";

type SmokeOptions = {
  cwd: string;
  codexCommand?: string;
  timeoutMs: number;
};

function parseArgs(argv: string[]): SmokeOptions {
  const options: SmokeOptions = {
    cwd: process.cwd(),
    codexCommand: process.env.CODEX_WECHAT_CODEX_COMMAND,
    timeoutMs: 120_000,
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
      case "--timeout-ms":
        if (!next) {
          throw new Error("--timeout-ms requires a value");
        }
        options.timeoutMs = Number(next);
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
  const appServer = new CodexAppServerProcess({
    command: options.codexCommand,
    cwd: options.cwd,
    log: (message) => console.log(message),
  });
  const rpc = new CodexRpcClient();
  let finalText = "";

  try {
    const endpoint = await appServer.start();
    await rpc.connect(endpoint);

    const codex = new CodexClient(rpc, {
      cwd: options.cwd,
      approvalPolicy: "on-request",
      sandbox: "workspace-write",
    });
    codex.onEvent((event) => {
      if (event.type === "final") {
        finalText = event.text;
      }
    });

    await codex.startTurn("只回复 OK 两个字，不要解释。");
    const deadline = Date.now() + options.timeoutMs;
    while (!finalText && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!finalText) {
      throw new Error("Timed out waiting for Codex final answer.");
    }
    console.log(`SMOKE_FINAL=${finalText}`);
  } finally {
    rpc.close();
    await appServer.stop();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
