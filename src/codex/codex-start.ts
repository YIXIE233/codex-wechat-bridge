#!/usr/bin/env node

import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { BRIDGE_LOG_FILE } from "../wechat/channel-config.ts";
import { ensureWechatCredentials } from "../wechat/setup.ts";
import {
  readBridgeLockFile,
  shouldAutoReclaimBridgeLock,
  type BridgeLockPayload,
} from "../bridge/bridge-state.ts";
import {
  clearLocalClientOccupancy,
  clearLocalClientEndpoint,
  readLocalClientEndpoint,
} from "./local-client-link.ts";
import type { BridgeSessionStartMode } from "../bridge/bridge-types.ts";
import type { LocalClientEndpoint } from "./runtime-types.ts";
import { runCodexRemoteClient } from "./codex-remote-client.ts";

type CodexStartCliOptions = {
  cwd: string;
  profile?: string;
  timeoutMs: number;
  sessionStartMode: BridgeSessionStartMode;
  cliArgs: string[];
};

type EndpointReadResult = {
  endpoint: LocalClientEndpoint | null;
};

type EnsureBridgeReadyResult = {
  shouldOpenVisibleClient: boolean;
};

export type CodexLaunchDecision =
  | { kind: "already_active"; message: string }
  | { kind: "open_companion"; message: string }
  | { kind: "restart_unhealthy"; message: string }
  | {
      kind: "switch_workspace";
      fromCwd: string;
      toCwd: string;
      message: string;
      failureMessage: string;
    }
  | { kind: "start_bridge"; message: string };

type DecideLaunchActionInput = {
  requestedCwd: string;
  runningLock: BridgeLockPayload;
  lockShouldAutoReclaim: boolean;
  endpoint: LocalClientEndpoint | null;
  endpointIsReachable: boolean;
  companionIsAlive: boolean;
};

type VisibleClientRunners = {
  codexRemoteClient?: typeof runCodexRemoteClient;
};

type EnsureWechatCredentialsFn = typeof ensureWechatCredentials;

const MODULE_FILE = fileURLToPath(import.meta.url);
const MODULE_DIR = path.dirname(MODULE_FILE);
const RUNTIME_ENTRY_EXTENSION = path.extname(MODULE_FILE) === ".ts" ? ".ts" : ".js";
const DEFAULT_WAIT_TIMEOUT_MS = 15_000;

function log(message: string): void {
  process.stderr.write(`[wechat-codex-start] ${message}\n`);
}

export function normalizeComparablePath(cwd: string): string {
  const normalized = path.resolve(cwd);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function isSameWorkspaceCwd(left: string, right: string): boolean {
  return normalizeComparablePath(left) === normalizeComparablePath(right);
}

export function formatAlreadyActiveMessage(cwd: string): string {
  return `Current workspace is already active: ${cwd}. Visible companion is already running, so nothing else was opened.`;
}

export function formatSwitchMessage(fromCwd: string, toCwd: string): string {
  return `Detected active workspace ${fromCwd}. Switching to ${toCwd}...`;
}

export function formatSwitchFailureMessage(cwd: string): string {
  return `Failed to stop the previous workspace bridge. Switch canceled; current workspace remains ${cwd}.`;
}

export function formatRestartUnhealthyMessage(cwd: string): string {
  return `Detected unhealthy companion state for ${cwd}. Restarting bridge...`;
}

export function decideLaunchAction(
  input: DecideLaunchActionInput,
): CodexLaunchDecision {
  if (input.lockShouldAutoReclaim) {
    return {
      kind: "start_bridge",
      message: `Detected reclaimable bridge lock for ${input.runningLock.cwd}. Replacing it for ${input.requestedCwd}...`,
    };
  }

  const sameWorkspace = isSameWorkspaceCwd(input.runningLock.cwd, input.requestedCwd);

  if (!sameWorkspace) {
    return {
      kind: "switch_workspace",
      fromCwd: input.runningLock.cwd,
      toCwd: input.requestedCwd,
      message: formatSwitchMessage(input.runningLock.cwd, input.requestedCwd),
      failureMessage: formatSwitchFailureMessage(input.runningLock.cwd),
    };
  }

  if (!input.endpoint || !input.endpointIsReachable) {
    return {
      kind: "restart_unhealthy",
      message: formatRestartUnhealthyMessage(input.requestedCwd),
    };
  }

  if (
    input.companionIsAlive &&
    (input.endpoint.companionStatus === "stopped" ||
      input.endpoint.companionStatus === "error")
  ) {
    return {
      kind: "restart_unhealthy",
      message: formatRestartUnhealthyMessage(input.requestedCwd),
    };
  }

  if (input.endpoint && input.endpointIsReachable && input.companionIsAlive) {
    return {
      kind: "already_active",
      message: formatAlreadyActiveMessage(input.requestedCwd),
    };
  }

  return {
    kind: "open_companion",
    message: `Found running bridge for ${input.requestedCwd}. Opening companion...`,
  };
}

export function parseCliArgs(argv: string[]): CodexStartCliOptions {
  let cwd = process.cwd();
  let profile: string | undefined;
  let timeoutMs = DEFAULT_WAIT_TIMEOUT_MS;
  let sessionStartMode: BridgeSessionStartMode = "restore";
  const cliArgs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    const next = argv[i + 1];

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        [
          "Usage: wechat-codex-start [--cwd <path>] [--profile <name-or-path>] [--timeout-ms <ms>] [--session-start-mode <restore|new>] [...codex args]",
          "",
          "Starts a bridge for the current directory, waits for the local endpoint, then opens the visible Codex client.",
          "Unknown arguments are forwarded to the visible Codex client.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    }

    if (arg === "--cwd") {
      if (!next) {
        throw new Error("--cwd requires a value");
      }
      cwd = resolveCliCwd(next);
      i += 1;
      continue;
    }

    if (arg === "--profile") {
      if (!next) {
        throw new Error("--profile requires a value");
      }
      profile = next;
      i += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      if (!next) {
        throw new Error("--timeout-ms requires a value");
      }
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed < 1000) {
        throw new Error("--timeout-ms must be a number >= 1000");
      }
      timeoutMs = Math.trunc(parsed);
      i += 1;
      continue;
    }

    if (arg === "--session-start-mode") {
      if (!next || !["restore", "new"].includes(next)) {
        throw new Error(`Invalid session start mode: ${next ?? "(missing)"}`);
      }
      sessionStartMode = next as BridgeSessionStartMode;
      i += 1;
      continue;
    }

    cliArgs.push(arg);
  }

  return {
    cwd,
    profile,
    timeoutMs,
    sessionStartMode,
    cliArgs,
  };
}

function resolveCliCwd(value: string): string {
  if (process.platform !== "win32" && /^[A-Za-z]:[\\/]/.test(value)) {
    return value;
  }
  return path.resolve(value);
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !isPidAlive(pid);
}

async function stopExistingBridge(lock: BridgeLockPayload): Promise<void> {
  const { pid, cwd } = lock;
  log(`Stopping existing bridge for ${cwd} (pid=${pid})...`);

  try {
    process.kill(pid);
  } catch (error) {
    if (isPidAlive(pid)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop existing bridge pid=${pid}: ${message}`, {
        cause: error,
      });
    }
  }

  if (!(await waitForProcessExit(pid, 10_000))) {
    throw new Error(`Timed out waiting for existing bridge pid=${pid} to exit.`);
  }

  clearLocalClientEndpoint(cwd);
  log(`Cleared stale local companion endpoint for previous workspace ${cwd}.`);
}

async function isEndpointReachable(endpoint: LocalClientEndpoint): Promise<boolean> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  return await new Promise<boolean>((resolve) => {
    const port = endpoint.serverPort ?? endpoint.port;
    const socket = net.connect({
      host: "127.0.0.1",
      port,
    });

    let done = false;
    const finish = (result: boolean) => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(400);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function readUsableEndpoint(cwd: string): Promise<EndpointReadResult> {
  const endpoint = readLocalClientEndpoint(cwd);
  if (!endpoint || endpoint.kind !== "codex") {
    return { endpoint: null };
  }

  if (await isEndpointReachable(endpoint)) {
    return { endpoint };
  }

  clearLocalClientEndpoint(cwd, endpoint.instanceId);
  log(`Removed stale local companion endpoint for ${cwd}.`);
  return { endpoint: null };
}

function isCompanionAlive(endpoint: LocalClientEndpoint | null): boolean {
  if (!endpoint?.companionPid) {
    return false;
  }

  if (isPidAlive(endpoint.companionPid)) {
    return true;
  }

  clearLocalClientOccupancy(endpoint.cwd, endpoint.instanceId);
  return false;
}

export function buildBackgroundBridgeArgs(
  entryPath: string,
  options: CodexStartCliOptions,
): string[] {
  const lifecycle = "companion_bound";
  const args = ["--no-warnings"];
  if (path.extname(entryPath) === ".ts") {
    args.push("--experimental-strip-types");
  }
  args.push(
    entryPath,
    "--cwd",
    options.cwd,
    "--lifecycle",
    lifecycle,
  );

  if (options.sessionStartMode !== "restore") {
    args.push("--session-start-mode", options.sessionStartMode);
  }

  if (options.profile) {
    args.push("--profile", options.profile);
  }

  return args;
}

function startBridgeInBackground(options: CodexStartCliOptions): void {
  const entryPath = path.resolve(
    MODULE_DIR,
    "..",
    "bridge",
    `wechat-bridge${RUNTIME_ENTRY_EXTENSION}`,
  );
  const args = buildBackgroundBridgeArgs(entryPath, options);

  const child = spawn(process.execPath, args, {
    cwd: options.cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("error", () => {
    /* best effort: background bridge failed to detach */
  });

  child.unref();
}

async function waitForEndpoint(
  cwd: string,
  timeoutMs: number,
): Promise<LocalClientEndpoint> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await readUsableEndpoint(cwd);
    if (result.endpoint) {
      return result.endpoint;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for the codex bridge endpoint for ${cwd}. Check ${BRIDGE_LOG_FILE}.`,
  );
}

async function ensureBridgeReady(
  options: CodexStartCliOptions,
): Promise<EnsureBridgeReadyResult> {
  const lock = readBridgeLockFile();
  const lockProcessAlive = lock ? isPidAlive(lock.pid) : false;
  if (!lock || !lockProcessAlive) {
    if (lock && !lockProcessAlive) {
      log(`Found stale lock for ${options.cwd} (pid=${lock.pid} dead). Clearing.`);
      clearLocalClientEndpoint(options.cwd);
    }

    log(`Starting bridge in background for ${options.cwd}...`);
    startBridgeInBackground(options);
    await waitForEndpoint(options.cwd, options.timeoutMs);
    return { shouldOpenVisibleClient: true };
  }

  const endpointResult = await readUsableEndpoint(options.cwd);
  const decision = decideLaunchAction({
    requestedCwd: options.cwd,
    runningLock: lock,
    lockShouldAutoReclaim: shouldAutoReclaimBridgeLock(lock),
    endpoint: endpointResult.endpoint,
    endpointIsReachable: Boolean(endpointResult.endpoint),
    companionIsAlive: isCompanionAlive(endpointResult.endpoint),
  });

  log(decision.message);

  if (decision.kind === "already_active") {
    return { shouldOpenVisibleClient: false };
  }

  if (decision.kind === "open_companion") {
    if (!endpointResult.endpoint) {
      await waitForEndpoint(options.cwd, options.timeoutMs);
    }
    return { shouldOpenVisibleClient: true };
  }

  if (decision.kind === "switch_workspace") {
    try {
      await stopExistingBridge(lock);
    } catch (error) {
      log(decision.failureMessage);
      throw error;
    }
  } else {
    await stopExistingBridge(lock);
  }

  log(`Starting replacement bridge in background for ${options.cwd}...`);
  startBridgeInBackground(options);
  await waitForEndpoint(options.cwd, options.timeoutMs);
  return { shouldOpenVisibleClient: true };
}

export async function runVisibleClient(
  options: CodexStartCliOptions,
  runners: VisibleClientRunners = {},
): Promise<number> {
  return await (runners.codexRemoteClient ?? runCodexRemoteClient)({
    cwd: options.cwd,
    cliArgs: options.cliArgs,
  });
}

export async function ensureCodexStartWechatCredentials(
  ensureCredentials: EnsureWechatCredentialsFn = ensureWechatCredentials,
): Promise<void> {
  await ensureCredentials({
    requireUserId: true,
    validateExisting: true,
    log,
  });
}

export async function runCodexStart(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const options = parseCliArgs(argv);
  await ensureCodexStartWechatCredentials();

  const ready = await ensureBridgeReady(options);
  if (!ready.shouldOpenVisibleClient) {
    return 0;
  }
  return await runVisibleClient(options);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  try {
    const exitCode = await runCodexStart(argv);
    process.exit(exitCode);
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const isDirectRun = Boolean((import.meta as ImportMeta & { main?: boolean }).main);
if (isDirectRun) {
  void main();
}
