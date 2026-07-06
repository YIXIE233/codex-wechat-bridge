#!/usr/bin/env bun

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  createCodexRuntime,
  resolveDefaultCodexCommand,
} from "../codex/codex-runtime.ts";
import {
  clearLocalClientEndpoint,
  clearLocalClientOccupancy,
  readLocalClientEndpoint,
} from "../codex/local-client-link.ts";
import { delay, quoteWindowsCommandArg } from "../codex/codex-runtime-shared.ts";
import { BridgeController } from "../bridge/bridge-controller.ts";
import { forwardWechatFinalReply } from "../bridge/bridge-final-reply.ts";
import {
  readBridgeLockFile,
  type BridgeLockPayload,
} from "../bridge/bridge-state.ts";
import {
  type BridgeProcessRecord,
  getProcessRecordByPid,
  isWechatDaemonCommandLine,
  killProcessTreeSync,
  listWechatDaemonProcesses,
  reapPeerBridgeProcesses,
} from "../bridge/bridge-process-reaper.ts";
import type {
  BridgeEvent,
  BridgeSessionStartMode,
  CodexRuntime,
  PendingApproval,
  PendingUserInputRequest,
  UserInputRequest,
} from "../bridge/bridge-types.ts";
import {
  buildOneTimeCode,
  buildWechatInboundPrompt,
  formatApprovalMessage,
  formatDuration,
  formatMirroredUserInputMessage,
  formatPendingApprovalReminder,
  formatPendingUserInputReminder,
  formatSessionSwitchMessage,
  formatTaskFailedMessage,
  formatThinkingForWechat,
  formatUserInputRequestMessage,
  MESSAGE_START_GRACE_MS,
  nowIso,
  OutputBatcher,
  parsePendingUserInputAnswerCommand,
  parseWechatControlCommand,
  truncatePreview,
} from "../bridge/bridge-utils.ts";
import {
  formatUserFacingBridgeFatalError,
  formatUserFacingInboundError,
  formatWechatContextTokenStaleLogEntry,
  formatWechatSendFailureLogEntry,
  isRetryableWechatSendError,
  shouldForwardBridgeEventToWechat,
} from "../bridge/wechat-bridge.ts";
import {
  BRIDGE_LOCK_FILE,
  BRIDGE_LOG_FILE,
  appendBoundedLog,
  ensureChannelDataDir,
  migrateLegacyChannelFiles,
} from "../wechat/channel-config.ts";
import { ensureWechatCredentials } from "../wechat/setup.ts";
import {
  formatBindCommandUsage,
  formatBindingsListMessage,
  isBindCommandPrefix,
  listBindings,
  loadEmojiBindings,
  parseEmojiBindingsCommand,
  removeBinding,
  resolveEmojiCommand,
  setBinding,
  type EmojiBindingsCommand,
} from "../wechat/emoji-bindings.ts";
import {
  classifyWechatTransportError,
  DEFAULT_LONG_POLL_TIMEOUT_MS,
  describeWechatTransportError,
  isWechatContextTokenStaleError,
  type InboundWechatMessage,
  WeChatTransport,
} from "../wechat/wechat-transport.ts";
import {
  attachDaemonRequestListener,
  buildDaemonToken,
  clearDaemonEndpoint,
  DAEMON_PROTOCOL_VERSION,
  readDaemonEndpoint,
  sendDaemonRequest,
  sendDaemonResponse,
  writeDaemonEndpoint,
  type DaemonEndpoint,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonSlotSummary,
  type DaemonStatus,
} from "./daemon-link.ts";

type DaemonCliOptions = {
  command: string;
  cwd: string;
  profile?: string;
  openVisible: boolean;
  sessionStartMode: BridgeSessionStartMode;
};

type ActiveTask = {
  startedAt: number;
  inputPreview: string;
};

type WechatSendContext =
  | "final_reply"
  | "message"
  | "notice"
  | "approval_required"
  | "user_input_required"
  | "mirrored_user_input"
  | "session_switched"
  | "thread_switched"
  | "task_failed"
  | "fatal_error"
  | "inbound_error"
  | "thinking";

type DaemonSlot = {
  runtime: CodexRuntime;
  controller: BridgeController;
  outputBatcher: OutputBatcher;
  pendingConfirmations: PendingApproval[];
  pendingUserInput: PendingUserInputRequest | null;
  activeTask: ActiveTask | null;
  lastOutputAt: number;
};

const MODULE_FILE = fileURLToPath(import.meta.url);
const MODULE_DIR = path.dirname(MODULE_FILE);
const RUNTIME_ENTRY_EXTENSION = path.extname(MODULE_FILE) === ".ts" ? ".ts" : ".js";
const DAEMON_HOST = "127.0.0.1";
const POLL_RETRY_BASE_MS = 1_000;
const POLL_RETRY_MAX_MS = 30_000;
const WECHAT_SEND_MAX_ATTEMPTS = 3;
const WECHAT_SEND_RETRY_BASE_MS = 750;
const SINGLE_BRIDGE_STOP_TIMEOUT_MS = 10_000;
const SINGLE_BRIDGE_FORCE_STOP_TIMEOUT_MS = 3_000;
const SINGLE_BRIDGE_STOP_POLL_MS = 250;
const DAEMON_TAKEOVER_STOP_TIMEOUT_MS = 10_000;
const DAEMON_TAKEOVER_FORCE_STOP_TIMEOUT_MS = 3_000;
const DAEMON_TAKEOVER_STOP_POLL_MS = 250;
const VISIBLE_CLIENT_CONNECT_TIMEOUT_MS = 15_000;
const VISIBLE_CLIENT_CONNECT_POLL_MS = 250;

function log(message: string): void {
  process.stderr.write(`[codex-wechat-daemon] ${message}\n`);
}

function logError(message: string): void {
  process.stderr.write(`[codex-wechat-daemon] ERROR: ${message}\n`);
}

function appendDaemonLog(message: string): void {
  ensureChannelDataDir();
  appendBoundedLog(BRIDGE_LOG_FILE, `[${new Date().toISOString()}] daemon: ${message}\n`);
}

function computePollRetryDelayMs(consecutiveFailures: number): number {
  const normalizedFailures = Math.max(1, consecutiveFailures);
  const exponent = Math.min(normalizedFailures - 1, 5);
  return Math.min(POLL_RETRY_MAX_MS, POLL_RETRY_BASE_MS * 2 ** exponent);
}

function computeWechatSendRetryDelayMs(attempt: number): number {
  return WECHAT_SEND_RETRY_BASE_MS * attempt;
}

function isSameWorkspaceCwd(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseDaemonCliArgs(argv: string[]): DaemonCliOptions {
  let commandOverride: string | undefined;
  let cwd = process.cwd();
  let profile: string | undefined;
  let openVisible = true;
  let sessionStartMode: BridgeSessionStartMode = "restore";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (!arg || arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        [
          "Usage: codex-wechat-daemon [--cmd <codex-executable>] [--cwd <path>] [--profile <name-or-path>] [--session-start-mode <restore|new>] [--no-open]",
          "",
          "Keeps one WeChat connection alive for Codex and opens/reuses the visible wechat-codex terminal.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    }

    if (arg === "--cmd") {
      if (!next) {
        throw new Error("--cmd requires a value");
      }
      commandOverride = next;
      i += 1;
      continue;
    }

    if (arg === "--cwd") {
      if (!next) {
        throw new Error("--cwd requires a value");
      }
      cwd = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg === "--adapter") {
      if (next !== "codex") {
        throw new Error(`Invalid adapter: ${next ?? "(missing)"}`);
      }
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

    if (arg === "--session-start-mode") {
      if (!next || !["restore", "new"].includes(next)) {
        throw new Error(`Invalid session start mode: ${next ?? "(missing)"}`);
      }
      sessionStartMode = next as BridgeSessionStartMode;
      i += 1;
      continue;
    }

    if (arg === "--no-open") {
      openVisible = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    command: commandOverride ?? resolveDefaultCodexCommand(),
    cwd,
    profile,
    openVisible,
    sessionStartMode,
  };
}

export function parseDaemonSwitchCommand(text: string): "codex" | null {
  return text.trim().toLowerCase() === "/codex" ? "codex" : null;
}

function toPendingApproval(request: BridgeEvent & { type: "approval_required" }): PendingApproval {
  const rawRequest = request.request;
  if (typeof (rawRequest as PendingApproval).code === "string") {
    return rawRequest as PendingApproval;
  }

  return {
    ...rawRequest,
    code: buildOneTimeCode(),
    createdAt: nowIso(),
  };
}

function toPendingUserInput(request: UserInputRequest | PendingUserInputRequest): PendingUserInputRequest {
  if (typeof (request as PendingUserInputRequest).createdAt === "string") {
    return request as PendingUserInputRequest;
  }

  return {
    ...request,
    createdAt: nowIso(),
  };
}

function prefixDaemonAdapterMessage(text: string): string {
  const trimmed = text.trim();
  return trimmed ? `[codex]\n${trimmed}` : "[codex]";
}

export function buildVisibleClientLaunchArgs(params: {
  cwd: string;
  sessionStartMode?: BridgeSessionStartMode;
  cliArgs?: string[];
}): string[] {
  const entryPath = path.resolve(
    MODULE_DIR,
    "..",
    "codex",
    `codex-remote-client${RUNTIME_ENTRY_EXTENSION}`,
  );
  const args = ["--no-warnings"];
  if (path.extname(entryPath) === ".ts") {
    args.push("--experimental-strip-types");
  }
  args.push(entryPath);
  if (params.sessionStartMode && params.sessionStartMode !== "restore") {
    args.push("--session-start-mode", params.sessionStartMode);
  }
  args.push("--cwd", params.cwd, ...(params.cliArgs ?? []));
  return args;
}

export function buildWindowsVisibleClientLaunchCommand(params: {
  cwd: string;
  args: string[];
}): string {
  return [
    "start",
    quoteWindowsCommandArg("wechat-codex"),
    "/D",
    quoteWindowsCommandArg(params.cwd),
    quoteWindowsCommandArg(process.execPath),
    ...params.args.map((arg) => quoteWindowsCommandArg(arg)),
  ].join(" ");
}

type LinuxTerminalEntry = { cmd: string; buildArgs: (title: string) => string[] };

const LINUX_TERMINALS: LinuxTerminalEntry[] = [
  { cmd: "gnome-terminal", buildArgs: (title) => ["--title", title, "--"] },
  { cmd: "konsole", buildArgs: (title) => ["-p", `tabtitle=${title}`, "-e"] },
  { cmd: "xfce4-terminal", buildArgs: (title) => ["--title", title, "-e"] },
  { cmd: "xterm", buildArgs: (title) => ["-title", title, "-e"] },
];

let cachedLinuxTerminal: LinuxTerminalEntry | null | undefined;

function detectLinuxTerminal(): LinuxTerminalEntry | null {
  if (cachedLinuxTerminal !== undefined) {
    return cachedLinuxTerminal;
  }
  for (const entry of LINUX_TERMINALS) {
    try {
      execFileSync("which", [entry.cmd], { stdio: "ignore" });
      cachedLinuxTerminal = entry;
      return entry;
    } catch {
      // Not found, try next.
    }
  }
  cachedLinuxTerminal = null;
  return null;
}

function shellQuotePosix(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

type VisibleClientLaunch = {
  command: string;
  args: string[];
  pid?: number;
};

function formatLaunchPreview(launch: VisibleClientLaunch): string {
  return [launch.command, ...launch.args].join(" ");
}

function openVisibleClient(params: {
  cwd: string;
  sessionStartMode?: BridgeSessionStartMode;
  cliArgs?: string[];
  onError?: (error: Error) => void;
}): VisibleClientLaunch {
  const args = buildVisibleClientLaunchArgs(params);
  if (process.platform === "win32") {
    const command = process.env.ComSpec || "cmd.exe";
    const launchArgs = [
      "/d",
      "/c",
      buildWindowsVisibleClientLaunchCommand({
        cwd: params.cwd,
        args,
      }),
    ];
    const child = spawn(command, launchArgs, {
      cwd: params.cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: true,
      windowsHide: false,
    });
    child.once("error", (error) => {
      params.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
    child.unref();
    return {
      command,
      args: launchArgs,
      pid: child.pid,
    };
  }

  const title = "wechat-codex";
  const fullArgs = [process.execPath, ...args];

  if (process.platform === "darwin") {
    const cmdLine = fullArgs.map(shellQuotePosix).join(" ");
    const script = `tell application "Terminal"
activate
do script "cd ${shellQuotePosix(params.cwd)} && exec ${cmdLine}"
end tell`;
    const child = spawn("osascript", ["-e", script], {
      cwd: params.cwd,
      detached: true,
      stdio: "ignore",
    });
    child.once("error", (error) => {
      params.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
    child.unref();
    return {
      command: "osascript",
      args: ["-e", script],
      pid: child.pid,
    };
  }

  const terminal = detectLinuxTerminal();
  if (terminal) {
    const termArgs = [...terminal.buildArgs(title), ...fullArgs];
    const child = spawn(terminal.cmd, termArgs, {
      cwd: params.cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
    });
    child.once("error", (error) => {
      params.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
    child.unref();
    return {
      command: terminal.cmd,
      args: termArgs,
      pid: child.pid,
    };
  }

  const child = spawn(process.execPath, args, {
    cwd: params.cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.once("error", (error) => {
    params.onError?.(error instanceof Error ? error : new Error(String(error)));
  });
  child.unref();
  return {
    command: process.execPath,
    args,
    pid: child.pid,
  };
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

function isVisibleClientAlive(cwd: string): boolean {
  const endpoint = readLocalClientEndpoint(cwd);
  if (!endpoint?.companionPid) {
    return false;
  }
  if (isPidAlive(endpoint.companionPid)) {
    return true;
  }

  clearLocalClientOccupancy(cwd, endpoint.instanceId);
  return false;
}

function cleanupVisibleClientLauncher(launch: VisibleClientLaunch): boolean {
  if (!launch.pid || !isPidAlive(launch.pid)) {
    return false;
  }

  try {
    killProcessTreeSync(launch.pid);
    return true;
  } catch {
    return false;
  }
}

export async function waitForVisibleClientConnection(
  params: {
    cwd: string;
    timeoutMs?: number;
    pollMs?: number;
  },
  deps: {
    isAlive?: (cwd: string) => boolean;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  } = {},
): Promise<boolean> {
  const timeoutMs = params.timeoutMs ?? VISIBLE_CLIENT_CONNECT_TIMEOUT_MS;
  const pollMs = params.pollMs ?? VISIBLE_CLIENT_CONNECT_POLL_MS;
  const isAlive = deps.isAlive ?? isVisibleClientAlive;
  const sleepFn = deps.sleep ?? sleep;
  const now = deps.now ?? (() => Date.now());
  const deadline = now() + timeoutMs;

  while (true) {
    if (isAlive(params.cwd)) {
      return true;
    }

    const remainingMs = deadline - now();
    if (remainingMs <= 0) {
      return false;
    }

    await sleepFn(Math.min(pollMs, remainingMs));
  }
}

function formatInboundMessagePreview(message: InboundWechatMessage): string {
  if (message.text.trim()) {
    return message.text;
  }

  if (message.attachments.length > 0) {
    return message.attachments
      .map((attachment) => `${attachment.kind}: ${attachment.path}`)
      .join("\n");
  }

  return "(empty)";
}

export function formatDaemonSwitchResultDetail(result: {
  created: boolean;
  openedVisible: boolean;
  visibleConnected: boolean;
  activated?: boolean;
}): string {
  if (result.activated === false) {
    if (result.openedVisible) {
      return result.created
        ? `Started the Codex bridge slot and tried to open the visible CLI, but it has not connected yet. Check ${BRIDGE_LOG_FILE}.`
        : `Tried to open a visible CLI for the existing Codex slot, but it has not connected yet. Check ${BRIDGE_LOG_FILE}.`;
    }

    return `The visible Codex CLI is not connected yet. Check ${BRIDGE_LOG_FILE}.`;
  }

  if (result.openedVisible && result.visibleConnected) {
    return result.created
      ? "Started a new visible Codex CLI."
      : "Opened a visible Codex CLI for the existing slot.";
  }

  if (result.openedVisible) {
    return result.created
      ? `Started the Codex bridge slot and tried to open the visible CLI, but it has not connected yet. Check ${BRIDGE_LOG_FILE}.`
      : `Tried to open a visible Codex CLI for the existing slot, but it has not connected yet. Check ${BRIDGE_LOG_FILE}.`;
  }

  if (result.visibleConnected) {
    return "Reused the existing visible Codex CLI.";
  }

  return result.created ? "Started the Codex bridge slot." : "Reused the Codex bridge slot.";
}

export function formatDaemonStatus(status: DaemonStatus): string {
  const lines = [
    "codex-wechat-daemon status",
    `cwd: ${status.cwd}`,
    `active: ${status.activeAdapter ?? "(none)"}`,
    `started_at: ${status.startedAt}`,
  ];

  const slot = status.slots.find((entry) => entry.adapter === "codex");
  if (!slot) {
    lines.push("codex: not started");
  } else {
    const flags = [
      slot.pendingApproval ? "pending_approval" : "",
      slot.pendingUserInput ? "pending_input" : "",
      slot.companionPid ? `companion_pid=${slot.companionPid}` : "",
    ].filter(Boolean);
    lines.push(`codex: ${slot.status}${flags.length ? ` (${flags.join(", ")})` : ""}`);
  }

  return lines.join("\n");
}

class CodexWechatDaemon {
  private readonly cwd: string;
  private readonly command: string;
  private readonly profile?: string;
  private readonly authorizedUserId: string;
  private readonly transport: WeChatTransport;
  private readonly startedAt = new Date().toISOString();
  private readonly bridgeStartedAtMs = Date.now();
  private readonly initialSessionStartMode: BridgeSessionStartMode;
  private slot: DaemonSlot | null = null;
  private backlogNoticeSent = false;
  private textSendChain = Promise.resolve();
  private attachmentSendChain = Promise.resolve();
  private readonly pendingWechatForwardTasks = new Set<Promise<void>>();
  private shutdownPromise: Promise<void> | null = null;
  private ipcServer: net.Server | null = null;
  private endpointToken = "";

  constructor(params: {
    command: string;
    cwd: string;
    profile?: string;
    authorizedUserId: string;
    transport: WeChatTransport;
    sessionStartMode: BridgeSessionStartMode;
  }) {
    this.command = params.command;
    this.cwd = params.cwd;
    this.profile = params.profile;
    this.authorizedUserId = params.authorizedUserId;
    this.transport = params.transport;
    this.initialSessionStartMode = params.sessionStartMode;
  }

  async startIpcServer(): Promise<void> {
    this.endpointToken = buildDaemonToken();
    await new Promise<void>((resolve, reject) => {
      const server = net.createServer((socket) => {
        socket.setNoDelay(true);
        let detach: (() => void) | null = null;
        detach = attachDaemonRequestListener(socket, (frame) => {
          if (frame.token !== this.endpointToken) {
            sendDaemonResponse(socket, frame.id, {
              ok: false,
              error: "Invalid daemon IPC token.",
            });
            return;
          }

          void this.handleDaemonRequest(frame.payload).then(
            (result) => {
              sendDaemonResponse(socket, frame.id, { ok: true, result });
            },
            (error) => {
              sendDaemonResponse(socket, frame.id, {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              });
            },
          );
        });
        socket.once("close", () => {
          detach?.();
          detach = null;
        });
        socket.once("error", () => {
          socket.destroy();
        });
      });
      this.ipcServer = server;
      server.once("error", reject);
      server.listen(0, DAEMON_HOST, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to allocate daemon IPC port."));
          return;
        }

        writeDaemonEndpoint({
          protocolVersion: DAEMON_PROTOCOL_VERSION,
          pid: process.pid,
          port: address.port,
          token: this.endpointToken,
          cwd: this.cwd,
          startedAt: this.startedAt,
        });
        resolve();
      });
    });
  }

  getStatus(): DaemonStatus {
    const slots: DaemonSlotSummary[] = [];
    if (this.slot) {
      const endpoint = readLocalClientEndpoint(this.cwd);
      slots.push({
        adapter: "codex",
        status: this.slot.runtime.getState().status,
        cwd: this.cwd,
        companionPid: endpoint?.companionPid,
        pendingApproval: this.slot.pendingConfirmations.length > 0,
        pendingUserInput: Boolean(this.slot.pendingUserInput),
      });
    }

    return {
      cwd: this.cwd,
      activeAdapter: this.slot ? "codex" : undefined,
      startedAt: this.startedAt,
      slots,
    };
  }

  async runInitialAdapter(options: DaemonCliOptions): Promise<void> {
    await this.ensureSlot({
      profile: options.profile,
      openVisible: options.openVisible,
      sessionStartMode: options.sessionStartMode,
    });
  }

  async runPollLoop(): Promise<void> {
    let consecutivePollFailures = 0;
    log("Codex WeChat daemon is ready.");
    log(`Working directory: ${this.cwd}`);
    appendDaemonLog(`started: cwd=${this.cwd}`);

    await this.queueWechatMessage(
      this.authorizedUserId,
      [
        "Codex WeChat daemon is ready.",
        `cwd: ${this.cwd}`,
        "Use /status, /stop, /reset, /new, /confirm, /deny, /answer, /daemon-stop.",
        formatBindingsListMessage(listBindings()),
      ].join("\n"),
    );

    while (!this.shutdownPromise) {
      let pollResult: Awaited<ReturnType<WeChatTransport["pollMessages"]>>;
      try {
        pollResult = await this.transport.pollMessages({
          timeoutMs: DEFAULT_LONG_POLL_TIMEOUT_MS,
          minCreatedAtMs: this.bridgeStartedAtMs - MESSAGE_START_GRACE_MS,
        });
      } catch (error) {
        const classification = classifyWechatTransportError(error);
        if (!classification.retryable) {
          throw error;
        }

        consecutivePollFailures += 1;
        const delayMs = computePollRetryDelayMs(consecutivePollFailures);
        const errorText = describeWechatTransportError(error);
        const statusDetails =
          typeof classification.statusCode === "number"
            ? ` status=${classification.statusCode}`
            : "";
        logError(
          `WeChat long poll failed (${classification.kind}${statusDetails}, attempt ${consecutivePollFailures}). Retrying in ${formatDuration(delayMs)}. ${errorText}`,
        );
        appendDaemonLog(
          `poll_retry: kind=${classification.kind}${statusDetails} attempt=${consecutivePollFailures} delay_ms=${delayMs} error=${truncatePreview(errorText, 400)}`,
        );
        await delay(delayMs);
        continue;
      }

      if (consecutivePollFailures > 0) {
        log(`WeChat long poll recovered after ${consecutivePollFailures} transient error(s).`);
        appendDaemonLog(`poll_recovered: failures=${consecutivePollFailures}`);
        consecutivePollFailures = 0;
      }

      if (pollResult.ignoredBacklogCount > 0) {
        appendDaemonLog(`ignored_startup_backlog: count=${pollResult.ignoredBacklogCount}`);
        if (!this.backlogNoticeSent) {
          this.backlogNoticeSent = true;
          await this.queueWechatMessage(
            this.authorizedUserId,
            `Ignored ${pollResult.ignoredBacklogCount} old WeChat message(s) from before bridge startup.`,
            "notice",
          );
        }
      }

      for (const message of pollResult.messages) {
        try {
          await this.handleInboundMessage(message);
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);
          logError(errorText);
          appendDaemonLog(`inbound_error: ${errorText}`);
          await this.queueWechatMessage(
            message.senderId,
            formatUserFacingInboundError({ cwd: this.cwd, errorText }),
            "inbound_error",
          );
        }
      }
    }
  }

  async shutdown(): Promise<void> {
    if (!this.shutdownPromise) {
      this.shutdownPromise = this.cleanup();
    }
    await this.shutdownPromise;
  }

  private async cleanup(): Promise<void> {
    appendDaemonLog("shutdown_started");
    if (this.slot) {
      try {
        await this.slot.outputBatcher.flushNow();
      } catch {
        // Best effort flush.
      }
    }
    await this.waitForPendingWechatForwardTasks();
    await this.textSendChain.catch(() => undefined);
    await this.attachmentSendChain.catch(() => undefined);

    if (this.slot) {
      try {
        await this.slot.runtime.dispose();
      } catch {
        // Best effort shutdown.
      }
      this.slot.controller.clearLocalClientEndpoint();
      this.slot = null;
    }

    if (this.ipcServer) {
      const server = this.ipcServer;
      this.ipcServer = null;
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    clearDaemonEndpoint();
    appendDaemonLog("shutdown_complete");
  }

  private async handleDaemonRequest(request: DaemonRequest): Promise<unknown> {
    switch (request.command) {
      case "status":
        return this.getStatus();
      case "shutdown":
        setTimeout(() => {
          void this.shutdown().finally(() => process.exit(0));
        }, 0);
        return { shuttingDown: true };
      case "ensure_slot":
        if (!isSameWorkspaceCwd(request.cwd, this.cwd)) {
          throw new Error(
            `codex-wechat-daemon is bound to ${this.cwd}; requested cwd was ${request.cwd}.`,
          );
        }
        if (request.adapter !== "codex") {
          throw new Error(`Unsupported adapter: ${request.adapter}`);
        }
        return await this.ensureSlot({
          profile: request.profile,
          cliArgs: request.cliArgs,
          openVisible: request.openVisible ?? true,
          sessionStartMode: request.sessionStartMode,
          reuseExistingVisible: request.reuseExistingVisible ?? true,
        });
      case "switch_adapter":
        if (request.adapter !== "codex") {
          throw new Error(`Unsupported adapter: ${request.adapter}`);
        }
        return await this.ensureSlot({
          profile: request.profile,
          cliArgs: request.cliArgs,
          openVisible: request.openVisible ?? true,
          sessionStartMode: request.sessionStartMode,
          reuseExistingVisible: request.reuseExistingVisible ?? true,
        });
    }
  }

  private async ensureSlot(options: {
    profile?: string;
    cliArgs?: string[];
    openVisible?: boolean;
    sessionStartMode?: BridgeSessionStartMode;
    reuseExistingVisible?: boolean;
  } = {}): Promise<{
    activeAdapter: "codex";
    created: boolean;
    openedVisible: boolean;
    visibleConnected: boolean;
    activated: boolean;
  }> {
    let created = false;
    if (!this.slot) {
      this.slot = await this.createSlot({
        profile: options.profile ?? this.profile,
        sessionStartMode: options.sessionStartMode ?? this.initialSessionStartMode,
      });
      created = true;
    }

    let openedVisible = false;
    let visibleConnected = isVisibleClientAlive(this.cwd);
    const sessionStartMode = options.sessionStartMode ?? this.initialSessionStartMode;
    if (options.openVisible !== false && !visibleConnected) {
      this.slot.controller.syncLocalClientEndpoint();
      const launch = openVisibleClient({
        cwd: this.cwd,
        sessionStartMode,
        cliArgs: options.cliArgs,
        onError: (error) => {
          appendDaemonLog(
            `visible_client_open_error: adapter=codex error=${truncatePreview(error.message, 400)}`,
          );
        },
      });
      openedVisible = true;
      appendDaemonLog(
        `visible_client_open_attempt: adapter=codex cwd=${this.cwd} pid=${launch.pid ?? "unknown"} command=${truncatePreview(formatLaunchPreview(launch), 400)}`,
      );
      visibleConnected = await waitForVisibleClientConnection({ cwd: this.cwd });
      if (visibleConnected) {
        appendDaemonLog(`visible_client_connected: adapter=codex cwd=${this.cwd}`);
      } else {
        log(
          `Codex visible CLI did not connect within ${formatDuration(VISIBLE_CLIENT_CONNECT_TIMEOUT_MS)}. Check ${BRIDGE_LOG_FILE}.`,
        );
        const cleanedLauncher = cleanupVisibleClientLauncher(launch);
        appendDaemonLog(
          `visible_client_connect_timeout: adapter=codex cwd=${this.cwd} timeout_ms=${VISIBLE_CLIENT_CONNECT_TIMEOUT_MS} cleaned_launcher=${cleanedLauncher}`,
        );
      }
    }

    const activated = options.openVisible === false || visibleConnected;
    appendDaemonLog(
      `switch_adapter: adapter=codex created=${created} opened_visible=${openedVisible} visible_connected=${visibleConnected} activated=${activated} session_start_mode=${sessionStartMode}`,
    );
    return {
      activeAdapter: "codex",
      created,
      openedVisible,
      visibleConnected,
      activated,
    };
  }

  private async createSlot(options: {
    profile?: string;
    sessionStartMode?: BridgeSessionStartMode;
  }): Promise<DaemonSlot> {
    clearLocalClientEndpoint(this.cwd);
    const runtime = createCodexRuntime({
      kind: "codex",
      command: this.command,
      cwd: this.cwd,
      profile: options.profile,
      lifecycle: "persistent",
      sessionStartMode: options.sessionStartMode,
    });
    const controller = new BridgeController(runtime, this.cwd);
    const slot: DaemonSlot = {
      runtime,
      controller,
      outputBatcher: new OutputBatcher(async (text) => {
        await this.queueWechatMessage(this.authorizedUserId, prefixDaemonAdapterMessage(text));
      }),
      pendingConfirmations: [],
      pendingUserInput: null,
      activeTask: null,
      lastOutputAt: 0,
    };

    runtime.setEventSink((event) => {
      this.handleSlotEvent(slot, event);
    });
    await runtime.start();
    controller.syncLocalClientEndpoint();
    appendDaemonLog(
      `slot_started: adapter=codex command=${this.command} cwd=${this.cwd} session_start_mode=${options.sessionStartMode ?? "restore"}`,
    );
    return slot;
  }

  private handleSlotEvent(slot: DaemonSlot, event: BridgeEvent): void {
    slot.controller.syncLocalClientEndpoint();
    const runtimeState = slot.runtime.getState();
    if (slot.pendingConfirmations.length > 0 && !runtimeState.pendingApproval) {
      slot.pendingConfirmations = [];
    }
    if (slot.pendingUserInput && !runtimeState.pendingUserInput) {
      slot.pendingUserInput = null;
    }

    switch (event.type) {
      case "stdout":
      case "stderr":
        slot.lastOutputAt = Date.now();
        if (shouldForwardBridgeEventToWechat(event.type)) {
          slot.outputBatcher.push(event.text);
        }
        break;
      case "thinking":
        slot.lastOutputAt = Date.now();
        if (shouldForwardBridgeEventToWechat(event.type, { text: event.text })) {
          const thinkingPreview = formatThinkingForWechat(event.text, 500);
          if (thinkingPreview) {
            appendDaemonLog(`thinking: ${thinkingPreview}`);
            this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
              await this.queueWechatMessage(
                this.authorizedUserId,
                prefixDaemonAdapterMessage(`思考: ${thinkingPreview}`),
                "thinking",
              );
            }));
          }
        }
        break;
      case "final_reply":
        appendDaemonLog(`final_reply: adapter=codex text=${truncatePreview(event.text)}`);
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
          await forwardWechatFinalReply({
            rawText: event.text,
            onEmptyVisibleReply: ({ rawVisibleText }) => {
              appendDaemonLog(
                `empty_visible_final_reply: adapter=codex raw=${truncatePreview(rawVisibleText)}`,
              );
            },
            sender: {
              sendText: async (text) => {
                const sent = await this.queueWechatMessage(
                  this.authorizedUserId,
                  prefixDaemonAdapterMessage(text),
                  "final_reply",
                );
                if (sent) {
                  appendDaemonLog(`final_reply_sent: adapter=codex chars=${Array.from(text).length}`);
                }
                return sent;
              },
              sendImage: (imagePath) =>
                this.queueWechatAttachmentAction(() =>
                  this.transport.sendImage(imagePath, {
                    recipientId: this.authorizedUserId,
                  }),
                ),
              sendFile: (filePath) =>
                this.queueWechatAttachmentAction(() =>
                  this.transport.sendFile(filePath, {
                    recipientId: this.authorizedUserId,
                  }),
                ),
              sendVoice: (voicePath) =>
                this.queueWechatAttachmentAction(() =>
                  this.transport.sendVoice(voicePath, this.authorizedUserId),
                ),
              sendVideo: (videoPath) =>
                this.queueWechatAttachmentAction(() =>
                  this.transport.sendVideo(videoPath, {
                    recipientId: this.authorizedUserId,
                  }),
                ),
            },
          });
        }));
        break;
      case "status":
        if (event.message) {
          log(`codex ${event.status}: ${event.message}`);
          appendDaemonLog(`codex_${event.status}: ${event.message}`);
        }
        break;
      case "notice":
        slot.lastOutputAt = Date.now();
        appendDaemonLog(`codex_${event.level}_notice: ${truncatePreview(event.text)}`);
        if (shouldForwardBridgeEventToWechat(event.type, { text: event.text })) {
          this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
            await this.queueWechatMessage(
              this.authorizedUserId,
              prefixDaemonAdapterMessage(event.text),
              "notice",
            );
          }));
        }
        break;
      case "approval_required":
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
          const pending = toPendingApproval(event);
          slot.pendingConfirmations.push(pending);
          appendDaemonLog(
            `approval_required: adapter=codex source=${pending.source} command=${truncatePreview(pending.commandPreview)}`,
          );
          await this.queueWechatMessage(
            this.authorizedUserId,
            prefixDaemonAdapterMessage(formatApprovalMessage(pending, runtimeState)),
            "approval_required",
          );
        }));
        break;
      case "user_input_required":
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
          const pending = toPendingUserInput(event.request);
          slot.pendingUserInput = pending;
          appendDaemonLog(`user_input_required: adapter=codex questions=${pending.questions.length}`);
          await this.queueWechatMessage(
            this.authorizedUserId,
            prefixDaemonAdapterMessage(formatUserInputRequestMessage(pending, runtimeState)),
            "user_input_required",
          );
        }));
        break;
      case "mirrored_user_input":
        appendDaemonLog(`mirrored_local_input: adapter=codex text=${truncatePreview(event.text)}`);
        if (shouldForwardBridgeEventToWechat(event.type, { text: event.text })) {
          this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
            await this.queueWechatMessage(
              this.authorizedUserId,
              prefixDaemonAdapterMessage(formatMirroredUserInputMessage(event.text)),
              "mirrored_user_input",
            );
          }));
        }
        break;
      case "session_switched":
        appendDaemonLog(
          `session_switched: adapter=codex session=${event.sessionId} source=${event.source} reason=${event.reason}`,
        );
        if (shouldForwardBridgeEventToWechat(event.type)) {
          this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
            await this.queueWechatMessage(
              this.authorizedUserId,
              prefixDaemonAdapterMessage(
                formatSessionSwitchMessage({
                  sessionId: event.sessionId,
                  source: event.source,
                  reason: event.reason,
                }),
              ),
              "session_switched",
            );
          }));
        }
        break;
      case "thread_switched":
        appendDaemonLog(
          `thread_switched: adapter=codex thread=${event.threadId} source=${event.source} reason=${event.reason}`,
        );
        if (shouldForwardBridgeEventToWechat(event.type)) {
          this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
            await this.queueWechatMessage(
              this.authorizedUserId,
              prefixDaemonAdapterMessage(
                formatSessionSwitchMessage({
                  sessionId: event.threadId,
                  source: event.source,
                  reason: event.reason,
                }),
              ),
              "thread_switched",
            );
          }));
        }
        break;
      case "task_complete":
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(() => {
          slot.pendingConfirmations = [];
          slot.pendingUserInput = null;
          slot.activeTask = null;
        }));
        break;
      case "task_failed":
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
          slot.pendingConfirmations = [];
          slot.pendingUserInput = null;
          slot.activeTask = null;
          await this.queueWechatMessage(
            this.authorizedUserId,
            prefixDaemonAdapterMessage(formatTaskFailedMessage(event.message)),
            "task_failed",
          );
        }));
        break;
      case "fatal_error":
        logError(`codex: ${event.message}`);
        appendDaemonLog(`fatal_error: adapter=codex message=${event.message}`);
        slot.pendingConfirmations = [];
        slot.pendingUserInput = null;
        slot.activeTask = null;
        this.trackWechatForwardTask(slot.outputBatcher.flushNow().then(async () => {
          await this.queueWechatMessage(
            this.authorizedUserId,
            prefixDaemonAdapterMessage(formatUserFacingBridgeFatalError(event.message)),
            "fatal_error",
          );
        }));
        break;
      case "shutdown_requested":
        appendDaemonLog(`slot_shutdown_requested: adapter=codex reason=${event.reason}`);
        break;
    }
  }

  private async handleInboundMessage(message: InboundWechatMessage): Promise<void> {
    if (message.senderId !== this.authorizedUserId) {
      await this.queueWechatMessage(
        message.senderId,
        "Unauthorized. This daemon only accepts messages from the configured WeChat owner.",
      );
      return;
    }

    const emojiMatch = resolveEmojiCommand(message.text);
    if (emojiMatch) {
      const switchTarget = parseDaemonSwitchCommand(emojiMatch.command);
      if (switchTarget && emojiMatch.remainder) {
        const result = await this.ensureSlot({
          openVisible: true,
          reuseExistingVisible: true,
        });
        if (result.activated) {
          message = { ...message, text: emojiMatch.remainder };
        } else {
          const detail = formatDaemonSwitchResultDetail(result);
          await this.queueWechatMessage(message.senderId, `Could not activate Codex.\n${detail}`);
          return;
        }
      } else {
        const rewritten = emojiMatch.remainder
          ? `${emojiMatch.command} ${emojiMatch.remainder}`
          : emojiMatch.command;
        message = { ...message, text: rewritten };
      }
    }

    if (parseDaemonSwitchCommand(message.text)) {
      const result = await this.ensureSlot({
        openVisible: true,
        reuseExistingVisible: true,
      });
      const detail = formatDaemonSwitchResultDetail(result);
      const heading = result.activated ? "Active terminal: codex." : "Could not activate Codex.";
      await this.queueWechatMessage(message.senderId, `${heading}\n${detail}`);
      return;
    }

    if (message.text.trim().toLowerCase() === "/daemon-stop") {
      await this.queueWechatMessage(message.senderId, "Stopping codex-wechat-daemon...");
      setTimeout(() => {
        void this.shutdown().finally(() => process.exit(0));
      }, 0);
      return;
    }

    const bindingsCmd = parseEmojiBindingsCommand(message.text);
    if (bindingsCmd) {
      await this.handleEmojiBindingsCommand(message.senderId, bindingsCmd);
      return;
    }

    if (isBindCommandPrefix(message.text)) {
      await this.queueWechatMessage(message.senderId, formatBindCommandUsage());
      return;
    }

    const slot = this.slot;
    if (!slot) {
      const result = await this.ensureSlot({ openVisible: true });
      if (!result.activated || !this.slot) {
        await this.queueWechatMessage(
          message.senderId,
          `No active Codex terminal.\n${formatDaemonSwitchResultDetail(result)}`,
        );
        return;
      }
    }

    const activeSlot = this.slot!;
    const command = parseWechatControlCommand(message.text, {
      hasPendingConfirmation: activeSlot.pendingConfirmations.length > 0,
      hasPendingUserInput: Boolean(activeSlot.pendingUserInput),
    });

    if (command) {
      await this.handleSystemCommand(message, activeSlot, command);
      return;
    }

    if (activeSlot.pendingConfirmations.length > 0) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage(
          formatPendingApprovalReminder(
            activeSlot.pendingConfirmations[0]!,
            activeSlot.runtime.getState(),
          ),
        ),
      );
      return;
    }

    if (activeSlot.pendingUserInput) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage(formatPendingUserInputReminder(activeSlot.pendingUserInput)),
      );
      return;
    }

    const runtimeState = activeSlot.runtime.getState();
    if (runtimeState.status === "busy" || runtimeState.status === "awaiting_approval") {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage("Codex is still working. Wait for the current reply or use /stop."),
      );
      return;
    }

    await this.dispatchInboundWechatText(message, activeSlot);
  }

  private async handleEmojiBindingsCommand(
    senderId: string,
    cmd: EmojiBindingsCommand,
  ): Promise<void> {
    switch (cmd.type) {
      case "list": {
        await this.queueWechatMessage(senderId, formatBindingsListMessage(listBindings()));
        return;
      }
      case "bind": {
        setBinding(cmd.emoji, cmd.command);
        await this.queueWechatMessage(senderId, `Bound ${cmd.emoji} → ${cmd.command}`);
        return;
      }
      case "unbind": {
        const removed = removeBinding(cmd.emoji);
        await this.queueWechatMessage(
          senderId,
          removed ? `Unbound ${cmd.emoji}` : `No binding found for ${cmd.emoji}`,
        );
        return;
      }
    }
  }

  private async handleSystemCommand(
    message: InboundWechatMessage,
    activeSlot: DaemonSlot,
    command: NonNullable<ReturnType<typeof parseWechatControlCommand>>,
  ): Promise<void> {
    switch (command.type) {
      case "status":
        await this.queueWechatMessage(message.senderId, formatDaemonStatus(this.getStatus()));
        return;
      case "resume":
        await this.queueWechatMessage(
          message.senderId,
          "WeChat /resume is disabled in daemon mode. Use /resume directly inside the visible Codex terminal; WeChat will follow that local session.",
        );
        return;
      case "new_session":
        if (!activeSlot.runtime.createSession) {
          await this.queueWechatMessage(message.senderId, "/new is not available in Codex mode.");
          return;
        }
        await activeSlot.outputBatcher.flushNow();
        activeSlot.outputBatcher.clear();
        activeSlot.pendingConfirmations = [];
        activeSlot.pendingUserInput = null;
        await activeSlot.runtime.createSession();
        appendDaemonLog("new_session: adapter=codex");
        return;
      case "stop": {
        const interrupted = await activeSlot.runtime.interrupt();
        await this.queueWechatMessage(
          message.senderId,
          prefixDaemonAdapterMessage(
            interrupted
              ? "Interrupt signal sent to the active worker."
              : "No running worker was available to interrupt.",
          ),
        );
        return;
      }
      case "reset":
        await activeSlot.outputBatcher.flushNow();
        activeSlot.outputBatcher.clear();
        activeSlot.pendingConfirmations = [];
        activeSlot.pendingUserInput = null;
        await activeSlot.runtime.reset();
        appendDaemonLog("reset: adapter=codex");
        await this.queueWechatMessage(
          message.senderId,
          prefixDaemonAdapterMessage("Worker session has been reset."),
        );
        return;
      case "confirm":
        await this.confirmPendingApproval(message, activeSlot);
        return;
      case "deny":
        await this.denyPendingApproval(message, activeSlot);
        return;
      case "answer":
        await this.answerPendingUserInput(message, activeSlot, command.raw);
        return;
    }
  }

  private async confirmPendingApproval(
    message: InboundWechatMessage,
    activeSlot: DaemonSlot,
  ): Promise<void> {
    if (activeSlot.pendingConfirmations.length === 0) {
      await this.queueWechatMessage(message.senderId, "No pending approval request.");
      return;
    }

    const count = await activeSlot.runtime.resolveAllApprovals("confirm");
    if (!count) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage("The worker could not apply this approval request."),
      );
      return;
    }
    const preview = activeSlot.pendingConfirmations[0]?.commandPreview ?? "";
    activeSlot.pendingConfirmations = [];
    activeSlot.activeTask = {
      startedAt: Date.now(),
      inputPreview: preview,
    };
    appendDaemonLog(`approval_confirmed: adapter=codex count=${count} command=${truncatePreview(preview)}`);
    await this.queueWechatMessage(
      message.senderId,
      prefixDaemonAdapterMessage(
        count > 1 ? `${count} approvals confirmed. Continuing...` : "Approval confirmed. Continuing...",
      ),
    );
  }

  private async denyPendingApproval(
    message: InboundWechatMessage,
    activeSlot: DaemonSlot,
  ): Promise<void> {
    if (activeSlot.pendingConfirmations.length === 0) {
      await this.queueWechatMessage(message.senderId, "No pending approval request.");
      return;
    }

    const count = await activeSlot.runtime.resolveAllApprovals("deny");
    if (!count) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage("The worker could not deny this approval request cleanly."),
      );
      return;
    }
    activeSlot.pendingConfirmations = [];
    appendDaemonLog(`approval_denied: adapter=codex count=${count}`);
    await this.queueWechatMessage(
      message.senderId,
      prefixDaemonAdapterMessage(count > 1 ? `${count} approvals denied.` : "Approval denied."),
    );
  }

  private async answerPendingUserInput(
    message: InboundWechatMessage,
    activeSlot: DaemonSlot,
    raw: string,
  ): Promise<void> {
    const pending = activeSlot.pendingUserInput;
    if (!pending) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage("No pending user input request."),
      );
      return;
    }

    const parsed = parsePendingUserInputAnswerCommand(raw, pending);
    if ("error" in parsed) {
      await this.queueWechatMessage(message.senderId, prefixDaemonAdapterMessage(parsed.error));
      return;
    }

    const submitted = await activeSlot.runtime.submitUserInput(parsed.answers);
    if (!submitted) {
      await this.queueWechatMessage(
        message.senderId,
        prefixDaemonAdapterMessage("The worker could not apply this answer."),
      );
      return;
    }

    activeSlot.pendingUserInput = null;
    activeSlot.activeTask = {
      startedAt: Date.now(),
      inputPreview: parsed.preview,
    };
    appendDaemonLog(`user_input_answered: adapter=codex preview=${parsed.preview}`);
    await this.queueWechatMessage(
      message.senderId,
      prefixDaemonAdapterMessage("Answer submitted. Continuing..."),
    );
  }

  private async dispatchInboundWechatText(
    message: InboundWechatMessage,
    slot: DaemonSlot,
  ): Promise<void> {
    const preview = formatInboundMessagePreview(message);
    slot.activeTask = {
      startedAt: Date.now(),
      inputPreview: truncatePreview(preview, 180),
    };
    appendDaemonLog(`forwarded_input: adapter=codex text=${truncatePreview(preview)}`);
    await slot.runtime.sendInput(buildWechatInboundPrompt(message.text, message.attachments));
  }

  private queueWechatTextAction<T>(action: () => Promise<T>): Promise<T> {
    const run = this.textSendChain.then(action);
    this.textSendChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private queueWechatAttachmentAction<T>(action: () => Promise<T>): Promise<T> {
    const run = this.attachmentSendChain.then(action);
    this.attachmentSendChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private queueWechatMessage(
    senderId: string,
    text: string,
    context: WechatSendContext = "message",
  ): Promise<boolean> {
    return this.queueWechatTextAction(async () => {
      for (let attempt = 1; attempt <= WECHAT_SEND_MAX_ATTEMPTS; attempt += 1) {
        try {
          await this.transport.sendText(senderId, text);
          return true;
        } catch (error) {
          if (isWechatContextTokenStaleError(error)) {
            this.transport.clearCachedContextToken(senderId);
            appendDaemonLog(
              formatWechatContextTokenStaleLogEntry({
                context,
                recipientId: senderId,
                error,
              }),
            );
            return false;
          }

          if (attempt < WECHAT_SEND_MAX_ATTEMPTS && isRetryableWechatSendError(error)) {
            const delayMs = computeWechatSendRetryDelayMs(attempt);
            appendDaemonLog(
              `wechat_send_retry: context=${context} recipient=${senderId} attempt=${attempt} delay_ms=${delayMs} error=${truncatePreview(describeWechatTransportError(error), 400)}`,
            );
            await delay(delayMs);
            continue;
          }

          logError(`Failed to send WeChat ${context}: ${describeWechatTransportError(error)}`);
          appendDaemonLog(
            formatWechatSendFailureLogEntry({
              context,
              recipientId: senderId,
              error,
            }),
          );
          return false;
        }
      }

      return false;
    });
  }

  private trackWechatForwardTask(task: Promise<void>): void {
    const tracked = task
      .catch((error) => {
        logError(`WeChat forward task failed: ${describeWechatTransportError(error)}`);
        appendDaemonLog(
          `wechat_forward_failed: error=${truncatePreview(describeWechatTransportError(error), 400)}`,
        );
      })
      .finally(() => {
        this.pendingWechatForwardTasks.delete(tracked);
      });
    this.pendingWechatForwardTasks.add(tracked);
  }

  private async waitForPendingWechatForwardTasks(): Promise<void> {
    while (this.pendingWechatForwardTasks.size > 0) {
      await Promise.allSettled([...this.pendingWechatForwardTasks]);
    }
  }
}

export type DaemonCleanupResult =
  | { action: "none" }
  | { action: "cleared_stale_endpoint"; endpoint: DaemonEndpoint }
  | { action: "stopped"; endpoint: DaemonEndpoint; forced: boolean };

type DaemonCleanupDeps = {
  cwd?: string;
  readEndpoint?: () => DaemonEndpoint | null;
  isAlive?: (pid: number) => boolean;
  sendRequest?: (
    endpoint: DaemonEndpoint,
    payload: DaemonRequest,
    options?: { timeoutMs?: number },
  ) => Promise<DaemonResponse>;
  killProcess?: (pid: number) => void;
  clearEndpoint?: (pid?: number) => void;
  clearWorkspaceEndpoints?: (endpoint: DaemonEndpoint) => void;
  isDaemonProcess?: (endpoint: DaemonEndpoint) => boolean;
  listDaemonProcesses?: (cwd: string) => BridgeProcessRecord[];
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  daemonLog?: (message: string) => void;
  stopTimeoutMs?: number;
  forceStopTimeoutMs?: number;
  pollMs?: number;
};

function clearDaemonWorkspaceEndpoints(endpoint: DaemonEndpoint): void {
  clearLocalClientEndpoint(endpoint.cwd);
}

function isEndpointDaemonProcess(endpoint: DaemonEndpoint): boolean {
  const record = getProcessRecordByPid(endpoint.pid);
  return Boolean(record && isWechatDaemonCommandLine(record.commandLine));
}

async function waitForProcessExit(params: {
  pid: number;
  timeoutMs: number;
  pollMs: number;
  isAlive: (pid: number) => boolean;
  sleep: (ms: number) => Promise<void>;
}): Promise<boolean> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() < deadline) {
    if (!params.isAlive(params.pid)) {
      return true;
    }
    await params.sleep(Math.min(params.pollMs, deadline - Date.now()));
  }
  return !params.isAlive(params.pid);
}

function selectDaemonProcessesToStop(
  records: BridgeProcessRecord[],
  excludedPids: Set<number>,
): BridgeProcessRecord[] {
  const recordPids = new Set(records.map((record) => record.pid));
  return records.filter((record) => {
    if (excludedPids.has(record.pid)) {
      return false;
    }

    return !records.some(
      (candidate) =>
        candidate.parentPid === record.pid &&
        recordPids.has(candidate.pid) &&
        !excludedPids.has(candidate.pid),
    );
  });
}

async function stopDaemonPeerProcesses(params: {
  cwd: string;
  listDaemonProcesses: (cwd: string) => BridgeProcessRecord[];
  killProcess: (pid: number) => void;
  isAlive: (pid: number) => boolean;
  sleep: (ms: number) => Promise<void>;
  timeoutMs: number;
  pollMs: number;
  daemonLog: (message: string) => void;
}): Promise<number[]> {
  const excludedPids = new Set([process.pid, process.ppid]);
  const peerRecords = selectDaemonProcessesToStop(
    params.listDaemonProcesses(params.cwd),
    excludedPids,
  );
  const stoppedPids: number[] = [];

  for (const peer of peerRecords) {
    params.daemonLog(
      `daemon_peer_takeover_attempt: pid=${peer.pid} cwd=${params.cwd} command=${truncatePreview(peer.commandLine, 400)}`,
    );
    params.killProcess(peer.pid);
    if (await waitForProcessExit({
      pid: peer.pid,
      timeoutMs: params.timeoutMs,
      pollMs: params.pollMs,
      isAlive: params.isAlive,
      sleep: params.sleep,
    })) {
      stoppedPids.push(peer.pid);
      params.daemonLog(`daemon_peer_takeover_complete: pid=${peer.pid}`);
    } else {
      params.daemonLog(`daemon_peer_takeover_timeout: pid=${peer.pid}`);
    }
  }

  return stoppedPids;
}

export async function cleanupDaemonBeforeStart(
  deps: DaemonCleanupDeps = {},
): Promise<DaemonCleanupResult> {
  const readEndpoint = deps.readEndpoint ?? readDaemonEndpoint;
  const isAlive = deps.isAlive ?? isPidAlive;
  const sendRequest = deps.sendRequest ?? sendDaemonRequest;
  const killProcess = deps.killProcess ?? killProcessTreeSync;
  const clearEndpoint = deps.clearEndpoint ?? clearDaemonEndpoint;
  const clearWorkspaceEndpoints =
    deps.clearWorkspaceEndpoints ?? clearDaemonWorkspaceEndpoints;
  const isDaemonProcess = deps.isDaemonProcess ?? isEndpointDaemonProcess;
  const listDaemonProcesses =
    deps.listDaemonProcesses ??
    ((cwd: string) =>
      listWechatDaemonProcesses({
        cwd,
        excludePids: [process.pid, process.ppid],
      }));
  const sleepFn = deps.sleep ?? sleep;
  const cleanupLog = deps.log ?? log;
  const daemonLog = deps.daemonLog ?? appendDaemonLog;
  const stopTimeoutMs = deps.stopTimeoutMs ?? DAEMON_TAKEOVER_STOP_TIMEOUT_MS;
  const forceStopTimeoutMs = deps.forceStopTimeoutMs ?? DAEMON_TAKEOVER_FORCE_STOP_TIMEOUT_MS;
  const pollMs = deps.pollMs ?? DAEMON_TAKEOVER_STOP_POLL_MS;
  const endpoint = readEndpoint();
  const cleanupCwd = endpoint?.cwd ?? deps.cwd;

  if (!endpoint) {
    if (cleanupCwd) {
      await stopDaemonPeerProcesses({
        cwd: cleanupCwd,
        listDaemonProcesses,
        killProcess,
        isAlive,
        sleep: sleepFn,
        timeoutMs: forceStopTimeoutMs,
        pollMs,
        daemonLog,
      });
    }
    return { action: "none" };
  }

  const clearDaemonArtifacts = () => {
    clearWorkspaceEndpoints(endpoint);
    clearEndpoint(endpoint.pid);
  };

  if (endpoint.pid === process.pid || !isAlive(endpoint.pid)) {
    cleanupLog(
      `Found stale codex-wechat-daemon endpoint for ${endpoint.cwd} (pid=${endpoint.pid}). Cleaning it before daemon startup.`,
    );
    daemonLog(`daemon_stale_endpoint_cleanup: pid=${endpoint.pid} cwd=${endpoint.cwd}`);
    clearDaemonArtifacts();
    await stopDaemonPeerProcesses({
      cwd: endpoint.cwd,
      listDaemonProcesses,
      killProcess,
      isAlive,
      sleep: sleepFn,
      timeoutMs: forceStopTimeoutMs,
      pollMs,
      daemonLog,
    });
    return { action: "cleared_stale_endpoint", endpoint };
  }

  cleanupLog(
    `Found existing codex-wechat-daemon for ${endpoint.cwd} (pid=${endpoint.pid}). Stopping it before daemon startup...`,
  );
  daemonLog(`daemon_takeover_attempt: pid=${endpoint.pid} cwd=${endpoint.cwd}`);

  let shutdownAcknowledged = false;
  try {
    const response = await sendRequest(endpoint, { command: "shutdown" }, { timeoutMs: 1_000 });
    if (response.ok) {
      shutdownAcknowledged = true;
    }
  } catch {
    // Fall back to forced process cleanup.
  }

  let stopped = false;
  let forced = false;
  if (shutdownAcknowledged) {
    stopped = await waitForProcessExit({
      pid: endpoint.pid,
      timeoutMs: stopTimeoutMs,
      pollMs,
      isAlive,
      sleep: sleepFn,
    });
  }

  if (!stopped && isAlive(endpoint.pid)) {
    if (isDaemonProcess(endpoint)) {
      forced = true;
      killProcess(endpoint.pid);
      stopped = await waitForProcessExit({
        pid: endpoint.pid,
        timeoutMs: forceStopTimeoutMs,
        pollMs,
        isAlive,
        sleep: sleepFn,
      });
    } else {
      cleanupLog(
        `Daemon endpoint pid=${endpoint.pid} is alive but no longer looks like codex-wechat-daemon. Clearing stale endpoint only.`,
      );
      stopped = true;
    }
  }

  if (!stopped && isAlive(endpoint.pid)) {
    throw new Error(`Could not stop existing codex-wechat-daemon automatically (pid=${endpoint.pid}).`);
  }

  clearDaemonArtifacts();
  await stopDaemonPeerProcesses({
    cwd: endpoint.cwd,
    listDaemonProcesses,
    killProcess,
    isAlive,
    sleep: sleepFn,
    timeoutMs: forceStopTimeoutMs,
    pollMs,
    daemonLog,
  });
  daemonLog(`daemon_takeover_complete: pid=${endpoint.pid} cwd=${endpoint.cwd} forced=${forced}`);
  return { action: "stopped", endpoint, forced };
}

export type SingleBridgeCleanupResult =
  | { action: "none" }
  | { action: "cleared_stale_lock"; lock: BridgeLockPayload }
  | { action: "stopped"; lock: BridgeLockPayload; forced: boolean };

type SingleBridgeCleanupDeps = {
  readLock?: () => BridgeLockPayload | null;
  isAlive?: (pid: number) => boolean;
  killProcess?: (pid: number) => void;
  clearLock?: () => void;
  clearWorkspaceEndpoint?: (lock: BridgeLockPayload) => void;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  daemonLog?: (message: string) => void;
  stopTimeoutMs?: number;
  forceStopTimeoutMs?: number;
  pollMs?: number;
};

export async function cleanupSingleBridgeBeforeDaemon(
  deps: SingleBridgeCleanupDeps = {},
): Promise<SingleBridgeCleanupResult> {
  const readLock = deps.readLock ?? readBridgeLockFile;
  const isAlive = deps.isAlive ?? isPidAlive;
  const killProcess = deps.killProcess ?? killProcessTreeSync;
  const clearLock =
    deps.clearLock ??
    (() => {
      try {
        fs.rmSync(BRIDGE_LOCK_FILE, { force: true });
      } catch {
        // Best effort cleanup.
      }
    });
  const clearWorkspaceEndpoint =
    deps.clearWorkspaceEndpoint ?? ((lock: BridgeLockPayload) => clearLocalClientEndpoint(lock.cwd));
  const sleepFn = deps.sleep ?? sleep;
  const cleanupLog = deps.log ?? log;
  const daemonLog = deps.daemonLog ?? appendDaemonLog;
  const stopTimeoutMs = deps.stopTimeoutMs ?? SINGLE_BRIDGE_STOP_TIMEOUT_MS;
  const forceStopTimeoutMs = deps.forceStopTimeoutMs ?? SINGLE_BRIDGE_FORCE_STOP_TIMEOUT_MS;
  const pollMs = deps.pollMs ?? SINGLE_BRIDGE_STOP_POLL_MS;
  const lock = readLock();

  if (!lock) {
    return { action: "none" };
  }

  const clearBridgeArtifacts = () => {
    clearWorkspaceEndpoint(lock);
    clearLock();
  };

  if (lock.pid === process.pid || !isAlive(lock.pid)) {
    cleanupLog(
      `Found stale single bridge lock for ${lock.cwd} (pid=${lock.pid}). Cleaning it before daemon startup.`,
    );
    daemonLog(`single_bridge_stale_lock_cleanup: pid=${lock.pid} cwd=${lock.cwd}`);
    clearBridgeArtifacts();
    return { action: "cleared_stale_lock", lock };
  }

  cleanupLog(
    `Found existing single bridge for ${lock.cwd} (pid=${lock.pid}). Stopping it before daemon startup...`,
  );
  daemonLog(`single_bridge_takeover_attempt: pid=${lock.pid} cwd=${lock.cwd}`);

  let forced = false;
  killProcess(lock.pid);
  let stopped = await waitForProcessExit({
    pid: lock.pid,
    timeoutMs: stopTimeoutMs,
    pollMs,
    isAlive,
    sleep: sleepFn,
  });

  if (!stopped && isAlive(lock.pid)) {
    forced = true;
    killProcess(lock.pid);
    stopped = await waitForProcessExit({
      pid: lock.pid,
      timeoutMs: forceStopTimeoutMs,
      pollMs,
      isAlive,
      sleep: sleepFn,
    });
  }

  if (!stopped && isAlive(lock.pid)) {
    throw new Error(`Could not stop existing single bridge automatically (pid=${lock.pid}, cwd=${lock.cwd}).`);
  }

  clearBridgeArtifacts();
  cleanupLog(`Cleaned previous single bridge for ${lock.cwd}; daemon startup can continue.`);
  daemonLog(`single_bridge_takeover_complete: pid=${lock.pid} cwd=${lock.cwd} forced=${forced}`);
  return { action: "stopped", lock, forced };
}

export async function runDaemon(options: DaemonCliOptions): Promise<void> {
  migrateLegacyChannelFiles((message) => log(message));
  loadEmojiBindings();
  await cleanupDaemonBeforeStart({ cwd: options.cwd });
  await cleanupSingleBridgeBeforeDaemon();
  const reapedPeerPids = await reapPeerBridgeProcesses({
    logger: (message) => appendDaemonLog(message),
  });
  if (reapedPeerPids.length > 0) {
    log(`Cleaned ${reapedPeerPids.length} peer bridge process(es): ${reapedPeerPids.join(", ")}`);
  }
  const credentials = await ensureWechatCredentials({
    requireUserId: true,
    validateExisting: true,
    log,
  });
  if (!credentials.userId) {
    throw new Error("Saved WeChat credentials are missing userId.");
  }

  const daemon = new CodexWechatDaemon({
    command: options.command,
    cwd: options.cwd,
    profile: options.profile,
    authorizedUserId: credentials.userId,
    transport: new WeChatTransport({ log, logError }),
    sessionStartMode: options.sessionStartMode,
  });
  await daemon.startIpcServer();
  await daemon.runInitialAdapter(options);

  let shutdownInProgress = false;
  const handleSignal = (signal: string) => {
    if (shutdownInProgress) {
      log(`Received ${signal} during shutdown, forcing exit.`);
      process.exit(1);
    }
    shutdownInProgress = true;
    log(`Received ${signal}. Stopping daemon.`);
    void daemon.shutdown().finally(() => process.exit(0));
  };
  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGHUP", () => handleSignal("SIGHUP"));
  if (process.platform === "win32") {
    process.on("SIGBREAK", () => handleSignal("SIGBREAK"));
  }
  process.on("exit", () => {
    clearDaemonEndpoint();
  });

  await daemon.runPollLoop();
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.includes("--doctor")) {
    const { runDoctorCheck } = await import("../utils/doctor.ts");
    await runDoctorCheck(argv);
    process.exit(0);
  }
  try {
    await runDaemon(parseDaemonCliArgs(argv));
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) {
  void main();
}
