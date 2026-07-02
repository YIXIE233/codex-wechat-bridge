import type { CodexAppServerEndpoint } from "./app-server-process.ts";
import { isRecord } from "./types.ts";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timer: NodeJS.Timeout;
};

type WebSocketLike = {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(name: string, handler: (event: { data?: unknown }) => void, options?: { once?: boolean }): void;
};

const WS_OPEN = 1;
const WS_CLOSED = 3;

export class CodexRpcClient {
  private socket: WebSocketLike | null = null;
  private nextId = 0;
  private readonly pending = new Map<number, PendingRequest>();
  private notificationHandler: ((method: string, params: unknown) => void) | null = null;
  private serverRequestHandler:
    | ((requestId: number | string, method: string, params: unknown) => void)
    | null = null;

  onNotification(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler;
  }

  onServerRequest(
    handler: (requestId: number | string, method: string, params: unknown) => void,
  ): void {
    this.serverRequestHandler = handler;
  }

  async connect(endpoint: CodexAppServerEndpoint): Promise<void> {
    if (this.socket) {
      return;
    }
    const WebSocketCtor = globalThis.WebSocket as unknown as
      | (new (url: string, options?: { headers?: Record<string, string> }) => WebSocketLike)
      | undefined;
    if (!WebSocketCtor) {
      throw new Error("Global WebSocket is unavailable. Use Node.js 22+.");
    }

    const socket = await new Promise<WebSocketLike>((resolve, reject) => {
      const ws = new WebSocketCtor(endpoint.url, {
        headers: { Authorization: `Bearer ${endpoint.token}` },
      });
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {
          // Best effort cleanup.
        }
        reject(new Error(`Timed out opening Codex websocket ${endpoint.url}.`));
      }, 10_000);
      ws.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve(ws);
        },
        { once: true },
      );
      ws.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Error(`Failed to open Codex websocket ${endpoint.url}.`));
        },
        { once: true },
      );
    });

    this.socket = socket;
    socket.addEventListener("message", (event) => this.handleMessage(event.data));
    socket.addEventListener("close", () => this.handleClose());

    await this.request("initialize", {
      clientInfo: {
        name: "codex-wechat-bridge",
        title: "Codex WeChat Bridge",
        version: "0.1.0",
      },
      capabilities: { experimentalApi: true },
    });
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WS_OPEN) {
      throw new Error("Codex websocket is not connected.");
    }
    const id = ++this.nextId;
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex RPC request timed out: ${method}`));
      }, 30_000);
      this.pending.set(id, { resolve, reject, timer });
    });
    socket.send(JSON.stringify({ id, method, params }));
    return await promise;
  }

  respond(requestId: number | string, result: unknown): void {
    this.sendRaw({ id: requestId, result });
  }

  reject(requestId: number | string, code: number, message: string): void {
    this.sendRaw({ id: requestId, error: { code, message } });
  }

  close(): void {
    const socket = this.socket;
    this.socket = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Codex websocket closed."));
    }
    this.pending.clear();
    if (socket && socket.readyState !== WS_CLOSED) {
      socket.close();
    }
  }

  private sendRaw(payload: Record<string, unknown>): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WS_OPEN) {
      throw new Error("Codex websocket is not connected.");
    }
    socket.send(JSON.stringify(payload));
  }

  private handleMessage(data: unknown): void {
    const text = typeof data === "string" ? data : data instanceof Buffer ? data.toString("utf8") : "";
    if (!text) {
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return;
    }
    if (!isRecord(payload)) {
      return;
    }

    const id = typeof payload.id === "number" || typeof payload.id === "string" ? payload.id : null;
    const method = typeof payload.method === "string" ? payload.method : null;
    if (id !== null && method) {
      this.serverRequestHandler?.(id, method, payload.params);
      return;
    }
    if (typeof id === "number") {
      const pending = this.pending.get(id);
      if (!pending) {
        return;
      }
      this.pending.delete(id);
      clearTimeout(pending.timer);
      if (payload.error) {
        pending.reject(new Error(JSON.stringify(payload.error)));
      } else {
        pending.resolve(payload.result);
      }
      return;
    }
    if (method) {
      this.notificationHandler?.(method, payload.params);
    }
  }

  private handleClose(): void {
    this.socket = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Codex websocket closed."));
    }
    this.pending.clear();
  }
}
