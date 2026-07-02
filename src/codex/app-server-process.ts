import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { CODEX_APP_SERVER_DIR } from "../wechat/channel-config.ts";
import { resolveCodexCommand } from "./command.ts";

const HOST = "127.0.0.1";
const READY_TIMEOUT_MS = 20_000;

export type CodexAppServerEndpoint = {
  url: string;
  token: string;
  port: number;
};

export type CodexAppServerOptions = {
  command?: string;
  cwd: string;
  profile?: string;
  log?: (message: string) => void;
};

export class CodexAppServerProcess {
  private child: ChildProcess | null = null;
  private endpoint: CodexAppServerEndpoint | null = null;
  private tokenFile: string | null = null;
  private readonly options: CodexAppServerOptions;

  constructor(options: CodexAppServerOptions) {
    this.options = options;
  }

  getEndpoint(): CodexAppServerEndpoint {
    if (!this.endpoint) {
      throw new Error("Codex app-server has not started.");
    }
    return this.endpoint;
  }

  async start(): Promise<CodexAppServerEndpoint> {
    if (this.endpoint) {
      return this.endpoint;
    }

    fs.mkdirSync(CODEX_APP_SERVER_DIR, { recursive: true });
    const port = await reservePort();
    const token = crypto.randomBytes(32).toString("hex");
    const tokenFile = path.join(CODEX_APP_SERVER_DIR, `token-${process.pid}-${Date.now()}.txt`);
    fs.writeFileSync(tokenFile, token, { mode: 0o600 });

    const command = resolveCodexCommand(this.options.command);
    const args = [
      "app-server",
      "--listen",
      `ws://${HOST}:${port}`,
      "--ws-auth",
      "capability-token",
      "--ws-token-file",
      tokenFile,
    ];
    if (this.options.profile) {
      args.push("--profile", this.options.profile);
    }

    const child = spawn(command, args, {
      cwd: this.options.cwd,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child = child;
    this.tokenFile = tokenFile;

    child.stdout.on("data", (chunk) => this.options.log?.(`[codex app-server] ${String(chunk).trim()}`));
    child.stderr.on("data", (chunk) => this.options.log?.(`[codex app-server] ${String(chunk).trim()}`));

    await waitForPort(port, READY_TIMEOUT_MS);
    this.endpoint = { url: `ws://${HOST}:${port}`, token, port };
    return this.endpoint;
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    this.endpoint = null;

    if (child && !child.killed) {
      child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // Best effort cleanup.
          }
          resolve();
        }, 2_000);
        timer.unref?.();
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    if (this.tokenFile) {
      try {
        fs.rmSync(this.tokenFile, { force: true });
      } catch {
        // Best effort cleanup.
      }
      this.tokenFile = null;
    }
  }
}

async function reservePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not reserve a local port.")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host: HOST, port });
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Timed out waiting for codex app-server on ${HOST}:${port}: ${String(lastError)}`);
}
