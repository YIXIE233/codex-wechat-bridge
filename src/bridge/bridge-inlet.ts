import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { ensureWorkspaceChannelDir } from "../wechat/channel-config.ts";
import type { InboundWechatAttachment } from "../wechat/wechat-transport.ts";

export type BridgeInletEndpoint = {
  protocolVersion: 1;
  host: string;
  port: number;
  token: string;
  cwd: string;
  pid: number;
  startedAt: string;
};

export type BridgeInletSendRequest = {
  type: "send";
  text: string;
  threadId?: string;
  foreground?: boolean;
  attachments?: InboundWechatAttachment[];
};

export type BridgeInletRequest = BridgeInletSendRequest & {
  token: string;
};

export type BridgeInletResponse =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function getBridgeInletEndpointFile(cwd: string): string {
  return path.join(ensureWorkspaceChannelDir(cwd).workspaceDir, "bridge-inlet-endpoint.json");
}

export function readBridgeInletEndpoint(cwd: string): BridgeInletEndpoint | null {
  try {
    const filePath = getBridgeInletEndpointFile(cwd);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as BridgeInletEndpoint;
    return typeof data.host === "string" && typeof data.port === "number" && typeof data.token === "string"
      ? data
      : null;
  } catch {
    return null;
  }
}

export async function startBridgeInletServer(params: {
  cwd: string;
  onSend: (request: BridgeInletSendRequest) => Promise<BridgeInletResponse>;
}): Promise<{ close: () => Promise<void>; endpoint: BridgeInletEndpoint }> {
  const host = "127.0.0.1";
  const token = crypto.randomBytes(24).toString("hex");
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) {
        return;
      }
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      void (async () => {
        let response: BridgeInletResponse;
        try {
          const request = JSON.parse(line) as BridgeInletRequest;
          if (request.token !== token) {
            response = { ok: false, error: "invalid inlet token" };
          } else if (request.type !== "send" || typeof request.text !== "string") {
            response = { ok: false, error: "invalid inlet request" };
          } else {
            response = await params.onSend(request);
          }
        } catch (error) {
          response = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        socket.end(`${JSON.stringify(response)}\n`);
      })();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Bridge inlet did not bind to a TCP port.");
  }

  const endpoint: BridgeInletEndpoint = {
    protocolVersion: 1,
    host,
    port: address.port,
    token,
    cwd: params.cwd,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  const endpointFile = getBridgeInletEndpointFile(params.cwd);
  fs.mkdirSync(path.dirname(endpointFile), { recursive: true });
  fs.writeFileSync(endpointFile, JSON.stringify(endpoint, null, 2));

  return {
    endpoint,
    close: async () => {
      try {
        fs.rmSync(endpointFile, { force: true });
      } catch {
        // best effort
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export async function sendBridgeInletRequest(
  endpoint: BridgeInletEndpoint,
  request: BridgeInletSendRequest,
): Promise<BridgeInletResponse> {
  return await new Promise<BridgeInletResponse>((resolve) => {
    const socket = net.connect({ host: endpoint.host, port: endpoint.port });
    let buffer = "";
    let settled = false;
    const finish = (response: BridgeInletResponse) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(response);
    };
    socket.setEncoding("utf8");
    socket.setTimeout(10_000);
    socket.once("connect", () => {
      socket.write(`${JSON.stringify({ ...request, token: endpoint.token })}\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) {
        return;
      }
      try {
        finish(JSON.parse(buffer.slice(0, newline)) as BridgeInletResponse);
      } catch (error) {
        finish({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
    socket.once("timeout", () => finish({ ok: false, error: "bridge inlet request timed out" }));
    socket.once("error", (error) => finish({ ok: false, error: error.message }));
    socket.once("close", () => {
      if (!settled) {
        finish({ ok: false, error: "bridge inlet closed without response" });
      }
    });
  });
}
