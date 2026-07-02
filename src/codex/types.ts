export type CodexStatus = "starting" | "idle" | "busy" | "awaiting_approval" | "awaiting_input" | "stopped" | "error";

export type CodexApprovalAction = "confirm" | "deny";

export type CodexApprovalRequest = {
  requestId: number | string;
  method: string;
  threadId?: string;
  turnId?: string;
  summary: string;
  detail: string;
  params: Record<string, unknown>;
};

export type CodexUserInputRequest = {
  requestId: number | string;
  threadId?: string;
  turnId?: string;
  summary: string;
  params: Record<string, unknown>;
};

export type CodexEvent =
  | { type: "status"; status: CodexStatus; message?: string }
  | { type: "thread"; threadId: string }
  | { type: "turn"; threadId: string; turnId: string }
  | { type: "final"; text: string; threadId?: string; turnId?: string }
  | { type: "error"; message: string }
  | { type: "approval"; request: CodexApprovalRequest }
  | { type: "user_input"; request: CodexUserInputRequest };

export type CodexEventHandler = (event: CodexEvent) => void;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getNestedString(value: unknown, path: string[]): string | null {
  let current = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[key];
  }
  return typeof current === "string" ? current : null;
}
