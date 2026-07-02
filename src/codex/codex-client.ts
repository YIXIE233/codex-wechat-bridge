import type { CodexRpcClient } from "./rpc-client.ts";
import {
  getNestedString,
  isRecord,
  type CodexApprovalAction,
  type CodexApprovalRequest,
  type CodexEvent,
  type CodexEventHandler,
  type CodexUserInputRequest,
} from "./types.ts";

export type CodexClientOptions = {
  cwd: string;
  approvalPolicy?: string;
  sandbox?: string;
  initialThreadId?: string | null;
};

type ActiveTurn = {
  threadId: string;
  turnId: string;
};

export class CodexClient {
  private readonly rpc: CodexRpcClient;
  private readonly options: CodexClientOptions;
  private readonly handlers = new Set<CodexEventHandler>();
  private threadId: string | null;
  private activeTurn: ActiveTurn | null = null;
  private finalByTurn = new Map<string, string[]>();
  private pendingApprovals = new Map<string, CodexApprovalRequest>();
  private pendingUserInputs = new Map<string, CodexUserInputRequest>();

  constructor(rpc: CodexRpcClient, options: CodexClientOptions) {
    this.rpc = rpc;
    this.options = options;
    this.threadId = options.initialThreadId ?? null;
    this.rpc.onNotification((method, params) => this.handleNotification(method, params));
    this.rpc.onServerRequest((id, method, params) => this.handleServerRequest(id, method, params));
  }

  onEvent(handler: CodexEventHandler): void {
    this.handlers.add(handler);
  }

  getCurrentThreadId(): string | null {
    return this.threadId;
  }

  getActiveTurn(): ActiveTurn | null {
    return this.activeTurn;
  }

  async startTurn(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (this.activeTurn) {
      throw new Error("Codex is still working. Wait for the current reply or use /stop.");
    }
    const threadId = await this.ensureThread();
    this.emit({ type: "status", status: "busy", message: "Codex is working." });
    const response = await this.rpc.request("turn/start", {
      threadId,
      cwd: this.options.cwd,
      approvalPolicy: this.options.approvalPolicy ?? "on-request",
      approvalsReviewer: "user",
      input: [{ type: "text", text: trimmed }],
    });
    const turnId = getNestedString(response, ["turn", "id"]);
    if (!turnId) {
      throw new Error("Codex did not return a turn id for the requested turn.");
    }
    this.activeTurn = { threadId, turnId };
    this.emit({ type: "turn", threadId, turnId });
  }

  async interrupt(): Promise<void> {
    if (!this.activeTurn) {
      return;
    }
    await this.rpc.request("turn/interrupt", {
      threadId: this.activeTurn.threadId,
      turnId: this.activeTurn.turnId,
    });
    this.activeTurn = null;
    this.emit({ type: "status", status: "idle", message: "Codex task interrupted." });
  }

  async resumeThread(threadId: string): Promise<void> {
    const response = await this.rpc.request("thread/resume", {
      threadId,
      cwd: this.options.cwd,
      approvalPolicy: this.options.approvalPolicy ?? "on-request",
      approvalsReviewer: "user",
      sandbox: this.options.sandbox ?? "workspace-write",
      excludeTurns: true,
    });
    const resumed = getNestedString(response, ["thread", "id"]);
    if (!resumed) {
      throw new Error("Codex did not return a thread id.");
    }
    this.threadId = resumed;
    this.emit({ type: "thread", threadId: resumed });
  }

  confirmApproval(): void {
    this.resolveOldestApproval("confirm");
  }

  denyApproval(): void {
    this.resolveOldestApproval("deny");
  }

  submitUserInput(text: string): void {
    const first = this.pendingUserInputs.values().next().value as CodexUserInputRequest | undefined;
    if (!first) {
      throw new Error("No Codex user input request is pending.");
    }
    this.pendingUserInputs.delete(String(first.requestId));
    this.rpc.respond(first.requestId, buildUserInputResponse(first.params, text));
    this.emit({ type: "status", status: "busy", message: "Codex user input submitted." });
  }

  private async ensureThread(): Promise<string> {
    if (this.threadId) {
      await this.resumeThread(this.threadId);
      return this.threadId;
    }
    const response = await this.rpc.request("thread/start", {
      cwd: this.options.cwd,
      approvalPolicy: this.options.approvalPolicy ?? "on-request",
      approvalsReviewer: "user",
      sandbox: this.options.sandbox ?? "workspace-write",
      serviceName: "codex-wechat-bridge",
      experimentalRawEvents: false,
      persistExtendedHistory: true,
    });
    const threadId = getNestedString(response, ["thread", "id"]);
    if (!threadId) {
      throw new Error("Codex did not return a thread id.");
    }
    this.threadId = threadId;
    this.emit({ type: "thread", threadId });
    return threadId;
  }

  private handleNotification(method: string, params: unknown): void {
    if (!isRecord(params)) {
      return;
    }
    if (method === "thread/started") {
      const threadId = getNestedString(params, ["thread", "id"]);
      if (threadId) {
        this.threadId = threadId;
        this.emit({ type: "thread", threadId });
      }
      return;
    }
    if (method === "turn/started") {
      const threadId = extractThreadId(params);
      const turnId = extractTurnId(params);
      if (threadId && turnId) {
        this.activeTurn = { threadId, turnId };
        this.emit({ type: "turn", threadId, turnId });
      }
      return;
    }
    if (method === "item/completed") {
      const final = extractFinalText(params.item);
      const turnId = extractTurnId(params);
      if (final && turnId) {
        const list = this.finalByTurn.get(turnId) ?? [];
        list.push(final);
        this.finalByTurn.set(turnId, list);
      }
      return;
    }
    if (method === "turn/completed") {
      const threadId = extractThreadId(params);
      const turnId = extractTurnId(params) ?? this.activeTurn?.turnId;
      const text = turnId ? (this.finalByTurn.get(turnId) ?? []).join("\n\n").trim() : "";
      if (turnId) {
        this.finalByTurn.delete(turnId);
      }
      this.activeTurn = null;
      if (text) {
        this.emit({ type: "final", text, threadId: threadId ?? undefined, turnId: turnId ?? undefined });
      }
      this.emit({ type: "status", status: "idle", message: "Codex turn completed." });
      return;
    }
    if (method === "error") {
      const message = getNestedString(params, ["error", "message"]) ?? "Codex reported an error.";
      this.emit({ type: "error", message });
    }
  }

  private handleServerRequest(requestId: number | string, method: string, params: unknown): void {
    if (method === "mcpServer/elicitation/request") {
      this.rpc.respond(requestId, { action: "decline", content: null, _meta: null });
      return;
    }
    if (method === "item/tool/call") {
      this.rpc.respond(requestId, {
        contentItems: [
          {
            type: "inputText",
            text: "Dynamic tool calls are not supported by codex-wechat-bridge.",
          },
        ],
        success: false,
      });
      return;
    }
    if (method === "item/tool/requestUserInput") {
      const request: CodexUserInputRequest = {
        requestId,
        threadId: isRecord(params) ? extractThreadId(params) ?? undefined : undefined,
        turnId: isRecord(params) ? extractTurnId(params) ?? undefined : undefined,
        summary: "Codex is waiting for user input.",
        params: isRecord(params) ? params : {},
      };
      this.pendingUserInputs.set(String(requestId), request);
      this.emit({ type: "user_input", request });
      return;
    }
    if (
      method === "item/commandExecution/requestApproval" ||
      method === "item/fileChange/requestApproval" ||
      method === "item/permissions/requestApproval"
    ) {
      const recordParams = isRecord(params) ? params : {};
      const request: CodexApprovalRequest = {
        requestId,
        method,
        threadId: extractThreadId(recordParams) ?? undefined,
        turnId: extractTurnId(recordParams) ?? undefined,
        summary: approvalSummary(method, recordParams),
        detail: JSON.stringify(recordParams, null, 2),
        params: recordParams,
      };
      this.pendingApprovals.set(String(requestId), request);
      this.emit({ type: "approval", request });
      this.emit({ type: "status", status: "awaiting_approval", message: request.summary });
      return;
    }
    this.rpc.reject(requestId, -32601, `Unsupported Codex server request: ${method}`);
  }

  private resolveOldestApproval(action: CodexApprovalAction): void {
    const first = this.pendingApprovals.values().next().value as CodexApprovalRequest | undefined;
    if (!first) {
      throw new Error("No Codex approval request is pending.");
    }
    this.pendingApprovals.delete(String(first.requestId));
    if (first.method === "item/permissions/requestApproval") {
      this.rpc.respond(first.requestId, buildPermissionsResponse(first.params, action));
    } else {
      this.rpc.respond(first.requestId, { decision: action === "confirm" ? "accept" : "decline" });
    }
    this.emit({ type: "status", status: "busy", message: "Codex approval resolved." });
  }

  private emit(event: CodexEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}

function extractThreadId(params: Record<string, unknown>): string | null {
  return (
    getNestedString(params, ["thread", "id"]) ??
    getNestedString(params, ["threadId"]) ??
    getNestedString(params, ["turn", "threadId"]) ??
    getNestedString(params, ["item", "threadId"])
  );
}

function extractTurnId(params: Record<string, unknown>): string | null {
  return (
    getNestedString(params, ["turn", "id"]) ??
    getNestedString(params, ["turnId"]) ??
    getNestedString(params, ["item", "turnId"])
  );
}

function extractFinalText(item: unknown): string | null {
  if (!isRecord(item) || item.type !== "agentMessage") {
    return null;
  }

  const phase = item.phase;
  if (phase !== undefined && phase !== null && phase !== "final_answer") {
    return null;
  }
  if (typeof item.text === "string") {
    return item.text.trim() || null;
  }
  if (typeof item.message === "string") {
    return item.message.trim() || null;
  }
  const content = item.content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
    return text || null;
  }
  return null;
}

function approvalSummary(method: string, params: Record<string, unknown>): string {
  const command =
    getNestedString(params, ["command"]) ??
    getNestedString(params, ["cmd"]) ??
    getNestedString(params, ["toolName"]) ??
    getNestedString(params, ["path"]);
  if (command) {
    return `Codex approval is required: ${command}`;
  }
  return `Codex approval is required: ${method}`;
}

function buildPermissionsResponse(
  params: Record<string, unknown>,
  action: CodexApprovalAction,
): Record<string, unknown> {
  const permissions: Record<string, unknown> = {};
  const sourcePermissions = isRecord(params.permissions) ? params.permissions : null;
  if (action === "confirm" && sourcePermissions) {
    const network = cloneRecord(sourcePermissions.network);
    const fileSystem = cloneRecord(sourcePermissions.fileSystem);
    if (network) {
      permissions.network = network;
    }
    if (fileSystem) {
      permissions.fileSystem = fileSystem;
    }
  }
  return { permissions, scope: "turn" };
}

function cloneRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function buildUserInputResponse(
  params: Record<string, unknown>,
  text: string,
): Record<string, unknown> {
  const firstQuestion = Array.isArray(params.questions)
    ? params.questions.find((question) => isRecord(question) && typeof question.id === "string")
    : null;
  const questionId = isRecord(firstQuestion) && typeof firstQuestion.id === "string"
    ? firstQuestion.id
    : "answer";
  return {
    answers: {
      [questionId]: {
        answers: [text],
      },
    },
  };
}
