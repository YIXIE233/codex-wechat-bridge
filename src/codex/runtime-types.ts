import type { CodexRuntime } from "../bridge/bridge-types.ts";

export const LOCAL_CLIENT_PROTOCOL_VERSION = 2;
export const CODEX_REMOTE_AUTH_TOKEN_ENV = "WECHAT_BRIDGE_CODEX_REMOTE_AUTH_TOKEN";

export type RuntimeKind = "codex_runtime_host";
export type RuntimeRenderMode = "panel" | "headless";

export type LocalClientEndpoint = {
  protocolVersion: number;
  runtimeKind: RuntimeKind;
  instanceId: string;
  kind: "codex";
  port: number;
  token: string;
  renderMode?: RuntimeRenderMode;
  bridgeOwnerPid?: number;
  serverPort?: number;
  serverUrl?: string;
  remoteAuthTokenEnv?: string;
  cwd: string;
  command: string;
  profile?: string;
  sharedSessionId?: string;
  sharedThreadId?: string;
  resumeConversationId?: string;
  transcriptPath?: string;
  companionPid?: number;
  companionConnectedAt?: string;
  companionStatus?: import("../bridge/bridge-types.ts").BridgeWorkerStatus;
  companionLastStateAt?: string;
  companionWorkerPid?: number;
  startedAt: string;
};

export interface LocalClientEndpointProvider {
  getLocalClientEndpoint(): LocalClientEndpoint | null;
}

export interface RuntimeHost extends CodexRuntime {
  readonly runtimeKind: RuntimeKind;
}

export function hasLocalClientEndpointProvider(
  runtime: CodexRuntime,
): runtime is CodexRuntime & LocalClientEndpointProvider {
  return typeof (runtime as Partial<LocalClientEndpointProvider>).getLocalClientEndpoint === "function";
}
