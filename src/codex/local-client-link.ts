import crypto from "node:crypto";
import fs from "node:fs";

import {
  ensureWorkspaceChannelDir,
  getWorkspaceCodexEndpointFile,
  getWorkspaceChannelPaths,
} from "../wechat/channel-config.ts";
import type { BridgeWorkerStatus } from "../bridge/bridge-types.ts";
import {
  LOCAL_CLIENT_PROTOCOL_VERSION,
  type LocalClientEndpoint,
} from "./runtime-types.ts";

export type LocalClientEndpointWriteOptions = {
  writeLegacy?: boolean;
};

function normalizeEndpoint(value: unknown): LocalClientEndpoint | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const kind = record.kind === "codex" ? record.kind : "codex";
  const sharedSessionId =
    typeof record.sharedSessionId === "string"
      ? record.sharedSessionId
      : typeof record.sharedThreadId === "string"
        ? record.sharedThreadId
        : undefined;

  if (
    typeof record.instanceId !== "string" ||
    typeof record.port !== "number" ||
    typeof record.token !== "string" ||
    typeof record.cwd !== "string" ||
    typeof record.command !== "string" ||
    typeof record.startedAt !== "string"
  ) {
    return null;
  }

  return {
    protocolVersion:
      typeof record.protocolVersion === "number"
        ? record.protocolVersion
        : LOCAL_CLIENT_PROTOCOL_VERSION,
    runtimeKind: "codex_runtime_host",
    instanceId: record.instanceId,
    kind,
    port: record.port,
    token: record.token,
    renderMode:
      record.renderMode === "panel" || record.renderMode === "headless"
        ? record.renderMode
        : undefined,
    bridgeOwnerPid:
      typeof record.bridgeOwnerPid === "number" ? record.bridgeOwnerPid : undefined,
    serverPort: typeof record.serverPort === "number" ? record.serverPort : undefined,
    serverUrl: typeof record.serverUrl === "string" ? record.serverUrl : undefined,
    remoteAuthTokenEnv:
      typeof record.remoteAuthTokenEnv === "string" ? record.remoteAuthTokenEnv : undefined,
    cwd: record.cwd,
    command: record.command,
    profile: typeof record.profile === "string" ? record.profile : undefined,
    sharedSessionId,
    sharedThreadId: sharedSessionId,
    resumeConversationId:
      typeof record.resumeConversationId === "string" ? record.resumeConversationId : undefined,
    transcriptPath:
      typeof record.transcriptPath === "string" ? record.transcriptPath : undefined,
    companionPid: typeof record.companionPid === "number" ? record.companionPid : undefined,
    companionConnectedAt:
      typeof record.companionConnectedAt === "string" ? record.companionConnectedAt : undefined,
    companionStatus:
      typeof record.companionStatus === "string"
        ? (record.companionStatus as BridgeWorkerStatus)
        : undefined,
    companionLastStateAt:
      typeof record.companionLastStateAt === "string" ? record.companionLastStateAt : undefined,
    companionWorkerPid:
      typeof record.companionWorkerPid === "number" ? record.companionWorkerPid : undefined,
    startedAt: record.startedAt,
  };
}

export function buildLocalClientToken(): string {
  return crypto.randomBytes(18).toString("hex");
}

function serializeEndpoint(endpoint: LocalClientEndpoint): LocalClientEndpoint {
  return {
    ...endpoint,
    protocolVersion: endpoint.protocolVersion ?? LOCAL_CLIENT_PROTOCOL_VERSION,
    sharedThreadId: endpoint.sharedSessionId ?? endpoint.sharedThreadId,
  };
}

function readEndpointFile(filePath: string): LocalClientEndpoint | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return normalizeEndpoint(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

export function writeLocalClientEndpoint(
  endpoint: LocalClientEndpoint,
  options: LocalClientEndpointWriteOptions = {},
): void {
  const { endpointFile } = ensureWorkspaceChannelDir(endpoint.cwd);
  const payload: LocalClientEndpoint = {
    ...serializeEndpoint(endpoint),
  };

  fs.writeFileSync(
    getWorkspaceCodexEndpointFile(endpoint.cwd),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
  if (options.writeLegacy !== false) {
    fs.writeFileSync(endpointFile, JSON.stringify(payload, null, 2), "utf8");
  }
}

export function readLocalClientEndpoint(
  cwd: string,
): LocalClientEndpoint | null {
  try {
    const { endpointFile } = getWorkspaceChannelPaths(cwd);
    const scoped = readEndpointFile(getWorkspaceCodexEndpointFile(cwd));
    if (scoped) {
      return scoped;
    }
    const legacy = readEndpointFile(endpointFile);
    return legacy?.kind === "codex" ? legacy : null;
  } catch {
    return null;
  }
}

export function clearLocalClientEndpoint(
  cwd: string,
  instanceId?: string,
): void {
  try {
    const { endpointFile } = getWorkspaceChannelPaths(cwd);
    const files = [endpointFile, getWorkspaceCodexEndpointFile(cwd)];

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      if (!instanceId) {
        fs.rmSync(filePath, { force: true });
        continue;
      }

      const endpoint = readEndpointFile(filePath);
      if (!endpoint || endpoint.instanceId === instanceId) {
        fs.rmSync(filePath, { force: true });
      }
    }
  } catch {
    // Best effort cleanup.
  }
}

export function clearLocalClientOccupancy(
  cwd: string,
  instanceId?: string,
): void {
  try {
    const endpoint = readLocalClientEndpoint(cwd);
    if (!endpoint) {
      return;
    }

    if (instanceId && endpoint.instanceId !== instanceId) {
      return;
    }

    writeLocalClientEndpoint({
      ...endpoint,
      companionPid: undefined,
      companionConnectedAt: undefined,
      companionStatus: undefined,
      companionLastStateAt: undefined,
      companionWorkerPid: undefined,
    });
  } catch {
    // Best effort cleanup.
  }
}

export function updateLocalClientHealth(
  cwd: string,
  patch: {
    companionStatus?: BridgeWorkerStatus;
    companionLastStateAt?: string;
    companionWorkerPid?: number;
  },
  instanceId?: string,
): void {
  try {
    const endpoint = readLocalClientEndpoint(cwd);
    if (!endpoint) {
      return;
    }

    if (instanceId && endpoint.instanceId !== instanceId) {
      return;
    }

    writeLocalClientEndpoint({
      ...endpoint,
      companionStatus: patch.companionStatus,
      companionLastStateAt: patch.companionLastStateAt,
      companionWorkerPid: patch.companionWorkerPid,
    });
  } catch {
    // Best effort cleanup.
  }
}

export function updateLocalClientOccupancy(
  cwd: string,
  patch: {
    companionPid?: number;
    companionConnectedAt?: string;
  },
  instanceId?: string,
): void {
  try {
    const endpoint = readLocalClientEndpoint(cwd);
    if (!endpoint) {
      return;
    }

    if (instanceId && endpoint.instanceId !== instanceId) {
      return;
    }

    writeLocalClientEndpoint({
      ...endpoint,
      companionPid: patch.companionPid,
      companionConnectedAt: patch.companionConnectedAt,
    });
  } catch {
    // Best effort cleanup.
  }
}
