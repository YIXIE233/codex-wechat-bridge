#!/usr/bin/env bun

import path from "node:path";

import {
  createCodexRuntime,
  resolveDefaultCodexCommand,
} from "../codex/codex-runtime.ts";
import { delay } from "../codex/codex-runtime-shared.ts";
import { BridgeController } from "./bridge-controller.ts";
import { forwardWechatFinalReply } from "./bridge-final-reply.ts";
import { startBridgeInletServer, type BridgeInletSendRequest } from "./bridge-inlet.ts";
import { reapPeerBridgeProcesses } from "./bridge-process-reaper.ts";
import { initLocaleFromEnv } from "../i18n/index.ts";
import { ensureWechatCredentials } from "../wechat/setup.ts";
import { BridgeStateStore } from "./bridge-state.ts";
import type {
  ApprovalRequest,
  CodexRuntime,
  BridgeEvent,
  BridgeLifecycleMode,
  BridgeSessionStartMode,
  BridgeTurnOrigin,
  BridgeWorkerStatus,
  PendingApproval,
  PendingUserInputRequest,
  UserInputRequest,
} from "./bridge-types.ts";
import {
  parseBridgeCommand,
  buildWechatInboundPrompt,
  buildOneTimeCode,
  formatApprovalMessage,
  formatDuration,
  formatPendingApprovalReminder,
  formatPendingUserInputReminder,
  formatMirroredUserInputMessage,
  formatSessionSwitchMessage,
  formatStatusReport,
  formatTaskFailedMessage,
  formatThinkingForWechat,
  formatUserInputRequestMessage,
  MESSAGE_START_GRACE_MS,
  nowIso,
  OutputBatcher,
  parsePendingUserInputAnswerCommand,
  parseWechatControlCommand,
  truncatePreview,
} from "./bridge-utils.ts";
import {
  classifyWechatTransportError,
  DEFAULT_LONG_POLL_TIMEOUT_MS,
  WeChatTransport,
  describeWechatTransportError,
  isWechatContextTokenStaleError,
  type InboundWechatMessage,
} from "../wechat/wechat-transport.ts";
import {
  checkForUpdate,
  formatUpdateMessage,
} from "../utils/version-checker.ts";
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
} from "../wechat/emoji-bindings.ts";

type BridgeCliOptions = {
  command: string;
  cwd: string;
  profile?: string;
  lifecycle: BridgeLifecycleMode;
  sessionStartMode: BridgeSessionStartMode;
};

type ActiveTask = {
  startedAt: number;
  inputPreview: string;
};

type DeferredInboundMessage = {
  message: InboundWechatMessage;
  targetThreadId?: string;
  foreground: boolean;
  source: "wechat" | "external";
  createdAt: string;
};

type DraftState = {
  startedAt: string;
  parts: InboundWechatMessage[];
};

type PendingResumeSelection = {
  candidates: Array<{ threadId: string; title: string; lastUpdatedAt: string }>;
  createdAt: string;
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

const POLL_RETRY_BASE_MS = 1_000;
const POLL_RETRY_MAX_MS = 30_000;
const PARENT_PROCESS_POLL_MS = 5_000;
const WECHAT_SEND_MAX_ATTEMPTS = 3;
const WECHAT_SEND_RETRY_BASE_MS = 750;

function log(message: string): void {
  process.stderr.write(`[wechat-bridge] ${message}\n`);
}

function logError(message: string): void {
  process.stderr.write(`[wechat-bridge] ERROR: ${message}\n`);
}

function computePollRetryDelayMs(consecutiveFailures: number): number {
  const normalizedFailures = Math.max(1, consecutiveFailures);
  const exponent = Math.min(normalizedFailures - 1, 5);
  return Math.min(POLL_RETRY_MAX_MS, POLL_RETRY_BASE_MS * 2 ** exponent);
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

export function formatUserFacingBridgeFatalError(message: string): string {
  return `Bridge error: ${message.replace(/\s+Recent app-server log:.*$/s, "").trim()}`;
}

export function shouldForwardBridgeEventToWechat(
  _eventType: BridgeEvent["type"],
  _options: {
    text?: string;
  } = {},
): boolean {
  return true;
}

export function formatUserFacingInboundError(params: {
  cwd?: string;
  errorText: string;
}): string {
  const { errorText } = params;
  return `Bridge error: ${errorText}`;
}

export function formatWechatSendFailureLogEntry(params: {
  context: WechatSendContext;
  recipientId: string;
  error: unknown;
}): string {
  return `wechat_send_failed: context=${params.context} recipient=${params.recipientId} error=${truncatePreview(describeWechatTransportError(params.error), 400)}`;
}

export function formatWechatContextTokenStaleLogEntry(params: {
  context: WechatSendContext;
  recipientId: string;
  error: unknown;
}): string {
  return `wechat_context_token_stale: context=${params.context} recipient=${params.recipientId} action=wechat_message_required error=${truncatePreview(describeWechatTransportError(params.error), 400)}`;
}

function formatWechatSendRetryLogEntry(params: {
  context: WechatSendContext;
  recipientId: string;
  attempt: number;
  delayMs: number;
  error: unknown;
}): string {
  return `wechat_send_retry: context=${params.context} recipient=${params.recipientId} attempt=${params.attempt} delay_ms=${params.delayMs} error=${truncatePreview(describeWechatTransportError(params.error), 400)}`;
}

export function isRetryableWechatSendError(error: unknown): boolean {
  if (isWechatContextTokenStaleError(error)) {
    return false;
  }

  const classification = classifyWechatTransportError(error);
  if (classification.retryable) {
    return true;
  }

  const details = describeWechatTransportError(error);
  return /^(?:Error|WechatApiResponseError): sendmessage failed:/i.test(details) &&
    !/errcode=-14\b.*session timeout/i.test(details);
}

function computeWechatSendRetryDelayMs(attempt: number): number {
  return WECHAT_SEND_RETRY_BASE_MS * attempt;
}

export function shouldWatchParentProcess(options: {
  startupParentPid: number;
  attachedToTerminal: boolean;
  lifecycle: BridgeLifecycleMode;
}): boolean {
  return (
    options.startupParentPid > 1 &&
    (options.attachedToTerminal || options.lifecycle === "companion_bound")
  );
}

function toPendingApproval(request: ApprovalRequest | PendingApproval): PendingApproval {
  if (typeof (request as PendingApproval).code === "string") {
    return request as PendingApproval;
  }

  return {
    ...request,
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

export function shouldDeferCodexInboundMessage(params: {
  status: BridgeWorkerStatus;
  hasPendingConfirmation: boolean;
  hasPendingUserInput?: boolean;
  hasSystemCommand: boolean;
}): boolean {
  return (
    !params.hasPendingConfirmation &&
    !params.hasPendingUserInput &&
    !params.hasSystemCommand &&
    params.status === "busy"
  );
}

export function canDrainDeferredCodexInboundQueue(params: {
  deferredCount: number;
  status: BridgeWorkerStatus;
  activeTurnId?: string;
  hasPendingConfirmation: boolean;
  hasPendingUserInput: boolean;
  hasPendingApproval: boolean;
  hasActiveTask: boolean;
}): boolean {
  return (
    params.deferredCount > 0 &&
    !params.hasPendingConfirmation &&
    !params.hasPendingUserInput &&
    !params.hasPendingApproval &&
    !params.hasActiveTask &&
    !params.activeTurnId &&
    params.status !== "busy" &&
    params.status !== "awaiting_approval" &&
    params.status !== "awaiting_input"
  );
}

export function formatDeferredCodexInboundQueueMessage(queuePosition: number): string {
  return `Queued for delivery after the current Codex turn finishes. Queue position: ${queuePosition}.`;
}

export function isRetryableDeferredCodexDrainError(errorText: string): boolean {
  return /still working|approval request is pending|waiting for local terminal input/i.test(
    errorText,
  );
}

export function parseCliArgs(argv: string[]): BridgeCliOptions {
  let commandOverride: string | undefined;
  let cwd = process.cwd();
  let profile: string | undefined;
  let lifecycle: BridgeLifecycleMode = "persistent";
  let sessionStartMode: BridgeSessionStartMode = "restore";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--cmd":
        if (!next) {
          throw new Error("--cmd requires a value");
        }
        commandOverride = next;
        i += 1;
        break;
      case "--cwd":
        if (!next) {
          throw new Error("--cwd requires a value");
        }
        cwd = path.resolve(next);
        i += 1;
        break;
      case "--profile":
        if (!next) {
          throw new Error("--profile requires a value");
        }
        profile = next;
        i += 1;
        break;
      case "--lifecycle":
        if (!next || !["persistent", "companion_bound"].includes(next)) {
          throw new Error(`Invalid lifecycle: ${next ?? "(missing)"}`);
        }
        lifecycle = next as BridgeLifecycleMode;
        i += 1;
        break;
      case "--session-start-mode":
        if (!next || !["restore", "new"].includes(next)) {
          throw new Error(`Invalid session start mode: ${next ?? "(missing)"}`);
        }
        sessionStartMode = next as BridgeSessionStartMode;
        i += 1;
        break;
      case "--shutdown-on-parent-exit":
        lifecycle = "companion_bound";
        break;
      case "--help":
      case "-h":
        printUsageAndExit();
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const defaultCommand = resolveDefaultCodexCommand();
  return {
    command: commandOverride ?? defaultCommand,
    cwd,
    profile,
    lifecycle,
    sessionStartMode,
  };
}

function printUsageAndExit(): never {
  process.stdout.write(
    [
      "Usage: codex-wechat-bridge [--cmd <codex-executable>] [--cwd <path>] [--profile <name-or-path>] [--lifecycle <persistent|companion_bound>] [--session-start-mode <restore|new>]",
      "",
      "Examples:",
      "  codex-wechat-bridge",
      "  codex-wechat-bridge --cwd ~/work/my-project",
      "  codex-wechat-bridge --cmd codex",
      "  npm run bridge -- --cwd ~/work/my-project",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

async function main(): Promise<void> {
  initLocaleFromEnv();
  if (process.argv.includes("--doctor")) {
    const { runDoctorCheck } = await import("../utils/doctor.ts");
    await runDoctorCheck(process.argv.slice(2));
    process.exit(0);
  }
  const options = parseCliArgs(process.argv.slice(2));
  const credentials = await ensureWechatCredentials({
    requireUserId: true,
    validateExisting: true,
    log,
  });
  if (!credentials.userId) {
    throw new Error("Saved WeChat credentials are missing userId.");
  }
  const transport = new WeChatTransport({ log, logError });

  const updateCheckTimer = setTimeout(async () => {
    try {
      const versionInfo = await checkForUpdate();
      if (versionInfo?.hasUpdate) {
        log(formatUpdateMessage(versionInfo));
      }
    } catch {
      // Update checks are best-effort and must not affect bridge startup.
    }
  }, 3000);
  updateCheckTimer.unref?.();

  const stateStore = new BridgeStateStore({
    ...options,
    authorizedUserId: credentials.userId,
  });
  const reapedPeerPids = await reapPeerBridgeProcesses({
    logger: (message) => stateStore.appendLog(message),
  });
  if (reapedPeerPids.length > 0) {
    log(`Reaped ${reapedPeerPids.length} peer bridge process(es): ${reapedPeerPids.join(", ")}`);
  }

  let lockRehydratedLogged = false;
  const ensureRuntimeOwnership = (): boolean => {
    const ownership = stateStore.verifyRuntimeOwnership();
    if (!ownership.ok) {
      if (ownership.reason === "superseded") {
        requestShutdown(
          `Bridge instance ${stateStore.getState().instanceId} was superseded by ${ownership.activeInstanceId}. Stopping duplicate bridge.`,
        );
        return false;
      }

      requestShutdown(
        `Bridge instance ${stateStore.getState().instanceId} lost the global lock to pid=${ownership.activePid} (${ownership.activeInstanceId}). Stopping duplicate bridge.`,
      );
      return false;
    }

    if (ownership.rehydratedLock && !lockRehydratedLogged) {
      lockRehydratedLogged = true;
      stateStore.appendLog(
        `lock_rehydrated: pid=${process.pid} instanceId=${stateStore.getState().instanceId} runtime=codex cwd=${options.cwd}`,
      );
    }

    return true;
  };

  const codexRuntime = createCodexRuntime({
    kind: "codex",
    command: options.command,
    cwd: options.cwd,
    profile: options.profile,
    lifecycle: options.lifecycle,
    sessionStartMode: options.sessionStartMode,
    initialSharedSessionId:
      stateStore.getState().sharedSessionId ?? stateStore.getState().sharedThreadId,
    initialResumeConversationId: stateStore.getState().resumeConversationId,
    initialTranscriptPath: stateStore.getState().transcriptPath,
  });
  const controller = new BridgeController(codexRuntime, options.cwd);
  controller.clearLocalClientEndpoint();
  stateStore.appendLog(`Cleared stale companion endpoint for ${options.cwd} before runtime start.`);
  let textSendChain = Promise.resolve();
  let attachmentSendChain = Promise.resolve();
  const pendingWechatForwardTasks = new Set<Promise<void>>();
  let activeTask: ActiveTask | null = null;
  const deferredInboundMessages: DeferredInboundMessage[] = [];
  let drainingDeferredInboundMessages = false;
  let draftState: DraftState | null = null;
  const resumeSelectionsBySender = new Map<string, PendingResumeSelection>();
  let lastOutputAt = 0;
  let lastHeartbeatAt = 0;
  let consecutivePollFailures = 0;
  let backlogNoticeSent = false;

  const queueWechatTextAction = <T>(action: () => Promise<T>) => {
    const run = textSendChain.then(action);
    textSendChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const queueWechatAttachmentAction = <T>(action: () => Promise<T>) => {
    const run = attachmentSendChain.then(action);
    attachmentSendChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const queueWechatMessage = (
    senderId: string,
    text: string,
    context: WechatSendContext = "message",
  ) => {
    return queueWechatTextAction(async () => {
      for (let attempt = 1; attempt <= WECHAT_SEND_MAX_ATTEMPTS; attempt += 1) {
        try {
          await transport.sendText(senderId, text);
          return true;
        } catch (err) {
          if (isWechatContextTokenStaleError(err)) {
            transport.clearCachedContextToken(senderId);
            const hint =
              "WeChat conversation context is stale. Ask the WeChat owner to send any message first, then local terminal replies can sync back to WeChat.";
            logError(`Failed to send WeChat ${context}: ${hint}`);
            stateStore.appendLog(
              formatWechatContextTokenStaleLogEntry({
                context,
                recipientId: senderId,
                error: err,
              }),
            );
            return false;
          }

          if (attempt < WECHAT_SEND_MAX_ATTEMPTS && isRetryableWechatSendError(err)) {
            const delayMs = computeWechatSendRetryDelayMs(attempt);
            logError(
              `Failed to send WeChat ${context} (attempt ${attempt}). Retrying in ${formatDuration(delayMs)}. ${describeWechatTransportError(err)}`,
            );
            stateStore.appendLog(
              formatWechatSendRetryLogEntry({
                context,
                recipientId: senderId,
                attempt,
                delayMs,
                error: err,
              }),
            );
            await delay(delayMs);
            continue;
          }

          logError(`Failed to send WeChat ${context}: ${describeWechatTransportError(err)}`);
          stateStore.appendLog(
            formatWechatSendFailureLogEntry({
              context,
              recipientId: senderId,
              error: err,
            }),
          );
          return false;
        }
      }

      return false;
    });
  };

  const trackWechatForwardTask = (task: Promise<void>): void => {
    const tracked = task
      .catch((error) => {
        logError(`WeChat forward task failed: ${describeWechatTransportError(error)}`);
        stateStore.appendLog(
          `wechat_forward_failed: error=${truncatePreview(describeWechatTransportError(error), 400)}`,
        );
      })
      .finally(() => {
        pendingWechatForwardTasks.delete(tracked);
      });
    pendingWechatForwardTasks.add(tracked);
  };

  const waitForPendingWechatForwardTasks = async (): Promise<void> => {
    while (pendingWechatForwardTasks.size > 0) {
      await Promise.allSettled([...pendingWechatForwardTasks]);
    }
  };

  const outputBatcher = new OutputBatcher(async (text) => {
    await queueWechatMessage(stateStore.getState().authorizedUserId, text);
  });
  const enqueueDeferredInboundMessage = async (
    nextMessage: InboundWechatMessage,
    queueOptions: {
      targetThreadId?: string;
      foreground?: boolean;
      source?: DeferredInboundMessage["source"];
    } = {},
  ): Promise<void> => {
    deferredInboundMessages.push({
      message: nextMessage,
      targetThreadId: queueOptions.targetThreadId,
      foreground: queueOptions.foreground ?? false,
      source: queueOptions.source ?? "wechat",
      createdAt: nowIso(),
    });
    stateStore.appendLog(
      `deferred_inbound_input: source=${queueOptions.source ?? "wechat"} position=${deferredInboundMessages.length} text=${truncatePreview(nextMessage.text)}`,
    );
    await queueWechatMessage(
      nextMessage.senderId,
      formatDeferredCodexInboundQueueMessage(deferredInboundMessages.length),
    );
  };
  const maybeDrainDeferredInboundMessages = async (): Promise<void> => {
    if (drainingDeferredInboundMessages || !ensureRuntimeOwnership()) {
      return;
    }

    const codexRuntimeState = codexRuntime.getState();
    if (
      !canDrainDeferredCodexInboundQueue({
        deferredCount: deferredInboundMessages.length,
        status: codexRuntimeState.status,
        activeTurnId: codexRuntimeState.activeTurnId,
        hasPendingConfirmation: Boolean(stateStore.getState().pendingConfirmation),
        hasPendingUserInput: Boolean(stateStore.getState().pendingUserInput),
        hasPendingApproval: Boolean(codexRuntimeState.pendingApproval),
        hasActiveTask: Boolean(activeTask),
      })
    ) {
      return;
    }

    const nextDeferred = deferredInboundMessages.shift();
    if (!nextDeferred) {
      return;
    }

    drainingDeferredInboundMessages = true;
    try {
      const currentThreadId = codexRuntime.getState().sharedThreadId;
      if (
        nextDeferred.targetThreadId &&
        nextDeferred.targetThreadId !== currentThreadId
      ) {
        if (!nextDeferred.foreground) {
          throw new Error("Queued input targets a different thread without foreground switch.");
        }
        await codexRuntime.resumeSession(nextDeferred.targetThreadId);
      }
      stateStore.appendLog(
        `draining_deferred_inbound_input: source=${nextDeferred.source} remaining=${deferredInboundMessages.length} text=${truncatePreview(nextDeferred.message.text)}`,
      );
      const nextTask = await dispatchInboundWechatText({
        message: nextDeferred.message,
        options,
        stateStore,
        codexRuntime,
      });
      activeTask = nextTask;
      lastHeartbeatAt = 0;
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      if (isRetryableDeferredCodexDrainError(errorText)) {
        deferredInboundMessages.unshift(nextDeferred);
        stateStore.appendLog(
          `deferred_inbound_blocked: ${truncatePreview(errorText, 400)}`,
        );
        return;
      }

      logError(errorText);
      stateStore.appendLog(`deferred_inbound_error: ${errorText}`);
      await queueWechatMessage(
        nextDeferred.message.senderId,
            formatUserFacingInboundError({
              cwd: options.cwd,
              errorText,
            }),
        "inbound_error",
      );
    } finally {
      drainingDeferredInboundMessages = false;
    }
  };
  const handleExternalSend = async (request: BridgeInletSendRequest) => {
    const recipient = stateStore.getState().authorizedUserId;
    if (!recipient) {
      return { ok: false as const, error: "No authorized WeChat recipient is configured." };
    }
    const currentThreadId = codexRuntime.getState().sharedThreadId;
    if (request.threadId && request.threadId !== currentThreadId) {
      if (!request.foreground) {
        return { ok: false as const, error: "Target thread differs from foreground; pass --foreground to switch." };
      }
      const runtimeState = codexRuntime.getState();
      if (runtimeState.status === "busy" || runtimeState.status === "awaiting_approval" || runtimeState.status === "awaiting_input") {
        await enqueueDeferredInboundMessage(
          {
            senderId: recipient,
            sender: "external",
            sessionId: "external",
            text: request.text,
            attachments: request.attachments ?? [],
            createdAt: nowIso(),
            createdAtMs: Date.now(),
          },
          {
            source: "external",
            targetThreadId: request.threadId,
            foreground: true,
          },
        );
        return { ok: true as const, message: "Queued for foreground switch after current turn." };
      }
      await codexRuntime.resumeSession(request.threadId);
      stateStore.setSharedThreadId(request.threadId);
    }

    const message: InboundWechatMessage = {
      senderId: recipient,
      sender: "external",
      sessionId: "external",
      text: request.text,
      attachments: request.attachments ?? [],
      createdAt: nowIso(),
      createdAtMs: Date.now(),
    };
    const nextTask = await handleInboundMessage({
      message,
      options,
      stateStore,
      codexRuntime,
      queueWechatMessage,
      outputBatcher,
      deferInboundMessage: (nextMessage, queueOptions = {}) =>
        enqueueDeferredInboundMessage(nextMessage, { ...queueOptions, source: "external" }),
      getQueue: () => deferredInboundMessages,
      dropQueuedMessage: (index) => {
        if (index < 1 || index > deferredInboundMessages.length) {
          return false;
        }
        deferredInboundMessages.splice(index - 1, 1);
        return true;
      },
      clearQueue: () => {
        const count = deferredInboundMessages.length;
        deferredInboundMessages.splice(0, deferredInboundMessages.length);
        return count;
      },
      getDraft: () => draftState,
      setDraft: (draft) => {
        draftState = draft;
      },
      getResumeSelection: (senderId) => resumeSelectionsBySender.get(senderId),
      setResumeSelection: (senderId, selection) => {
        if (selection) {
          resumeSelectionsBySender.set(senderId, selection);
        } else {
          resumeSelectionsBySender.delete(senderId);
        }
      },
    });
    if (nextTask) {
      activeTask = nextTask;
      lastHeartbeatAt = 0;
    }
    syncSharedSessionState(stateStore, codexRuntime);
    await maybeDrainDeferredInboundMessages();
    return { ok: true as const, message: "Accepted." };
  };
  let closeBridgeInlet: (() => Promise<void>) | null = null;
  const startupParentPid = process.ppid;
  const attachedToTerminal = Boolean(
    process.stdin.isTTY || process.stdout.isTTY || process.stderr.isTTY,
  );
  let shutdownPromise: Promise<void> | null = null;
  let requestedExitCode = 0;
  let stdinDetached = false;
  const parentWatchTimer =
    shouldWatchParentProcess({
      startupParentPid,
      attachedToTerminal,
      lifecycle: options.lifecycle,
    })
      ? setInterval(() => {
          if (shutdownPromise || isPidAlive(startupParentPid)) {
            return;
          }
          log(`Parent process ${startupParentPid} exited. Stopping bridge.`);
          void shutdown(0);
        }, PARENT_PROCESS_POLL_MS)
      : null;
  parentWatchTimer?.unref();

  const cleanup = async () => {
    if (parentWatchTimer) {
      clearInterval(parentWatchTimer);
    }
    try {
      await outputBatcher.flushNow();
      await waitForPendingWechatForwardTasks();
    } catch {
      // Best effort flush.
    }
    try {
      await textSendChain;
      await attachmentSendChain;
      await waitForPendingWechatForwardTasks();
    } catch {
      // Best effort flush.
    }
    try {
      if (closeBridgeInlet) {
        await closeBridgeInlet();
        closeBridgeInlet = null;
      }
    } catch {
      // Best effort close.
    }
    try {
      await codexRuntime.dispose();
    } catch {
      // Best effort shutdown.
    }
    controller.clearLocalClientEndpoint();
    stateStore.releaseLock();
  };

  const shutdown = async (exitCode = 0): Promise<void> => {
    requestedExitCode = exitCode;
    if (!shutdownPromise) {
      shutdownPromise = cleanup().catch((error) => {
        logError(`Shutdown cleanup failed: ${describeWechatTransportError(error)}`);
      });
    }
    await shutdownPromise;
  };

  const requestShutdown = (message: string, exitCode = 0) => {
    if (shutdownPromise) {
      return;
    }
    log(message);
    void shutdown(exitCode).finally(() => process.exit(requestedExitCode));
  };

  process.once("SIGINT", () => {
    requestShutdown("Received SIGINT. Stopping bridge.");
  });
  process.once("SIGTERM", () => {
    requestShutdown("Received SIGTERM. Stopping bridge.");
  });
  process.once("SIGHUP", () => {
    requestShutdown("Terminal session closed. Stopping bridge.");
  });
  if (process.platform === "win32") {
    process.once("SIGBREAK", () => {
      requestShutdown("Received SIGBREAK. Stopping bridge.");
    });
  }
  if (attachedToTerminal) {
    process.stdin.on("close", () => {
      if (stdinDetached) {
        return;
      }
      stdinDetached = true;
      requestShutdown("Standard input closed. Stopping bridge.");
    });
    process.stdin.on("end", () => {
      if (stdinDetached) {
        return;
      }
      stdinDetached = true;
      requestShutdown("Standard input ended. Stopping bridge.");
    });
  }
  process.on("exit", () => {
    if (parentWatchTimer) {
      clearInterval(parentWatchTimer);
    }
    stateStore.releaseLock();
  });

  try {
    wireCodexRuntimeEvents({
      codexRuntime,
      options,
      transport,
      stateStore,
      outputBatcher,
      queueWechatAttachmentAction,
      queueWechatMessage,
      trackWechatForwardTask,
      maybeDrainDeferredInboundMessages,
      getActiveTask: () => activeTask,
      clearActiveTask: () => {
        activeTask = null;
        lastHeartbeatAt = 0;
      },
      updateLastOutputAt: () => {
        lastOutputAt = Date.now();
      },
      syncSharedSessionState: () => {
        syncSharedSessionState(stateStore, codexRuntime);
      },
      syncLocalClientEndpoint: () => {
        controller.syncLocalClientEndpoint();
      },
      requestShutdown,
    });

    await codexRuntime.start();
    if (!ensureRuntimeOwnership()) {
      return;
    }
    syncSharedSessionState(stateStore, codexRuntime);
    controller.syncLocalClientEndpoint();
    stateStore.appendLog(
      `Bridge started with runtime=codex command=${options.command} cwd=${options.cwd}`,
    );
    const inlet = await startBridgeInletServer({
      cwd: options.cwd,
      onSend: handleExternalSend,
    });
    closeBridgeInlet = inlet.close;
    stateStore.appendLog(`bridge_inlet_started: port=${inlet.endpoint.port}`);

    log("Codex WeChat bridge is ready.");
    log(`Working directory: ${options.cwd}`);
    if (options.profile) {
      log(`Profile: ${options.profile}`);
    }
    log(`Authorized WeChat user: ${credentials.userId}`);
    loadEmojiBindings();
    const welcomeText = [
      "Codex WeChat bridge is ready.",
      `CWD: ${options.cwd}`,
      "",
      "Commands: /stop, /confirm, /deny, /answer, /status, /new, /resume, /reset",
      "Bridge: //queue, //drop <n>, //clear-queue, //steer <text>, //begin, //end, //cancel",
      formatBindingsListMessage(listBindings()),
      "",
      "Send a message here to forward it to Codex.",
      'Use "wechat-codex" in this directory for the native Codex TUI when needed.',
    ].join("\n");
    await queueWechatMessage(credentials.userId, welcomeText);

    while (true) {
      if (!ensureRuntimeOwnership()) {
        break;
      }

      let pollResult: Awaited<ReturnType<WeChatTransport["pollMessages"]>>;
      try {
        pollResult = await transport.pollMessages({
          timeoutMs: DEFAULT_LONG_POLL_TIMEOUT_MS,
          minCreatedAtMs: stateStore.getState().bridgeStartedAtMs - MESSAGE_START_GRACE_MS,
        });
      } catch (err) {
        const classification = classifyWechatTransportError(err);
        if (!classification.retryable) {
          throw err;
        }

        consecutivePollFailures += 1;
        const delayMs = computePollRetryDelayMs(consecutivePollFailures);
        const errorText = describeWechatTransportError(err);
        const statusDetails =
          typeof classification.statusCode === "number"
            ? ` status=${classification.statusCode}`
            : "";
        logError(
          `WeChat long poll failed (${classification.kind}${statusDetails}, attempt ${consecutivePollFailures}). Retrying in ${formatDuration(delayMs)}. ${errorText}`,
        );
        stateStore.appendLog(
          `poll_retry: kind=${classification.kind}${statusDetails} attempt=${consecutivePollFailures} delay_ms=${delayMs} error=${truncatePreview(errorText, 400)}`,
        );
        await delay(delayMs);
        continue;
      }

      if (!ensureRuntimeOwnership()) {
        break;
      }

      if (consecutivePollFailures > 0) {
        const recoveredFailures = consecutivePollFailures;
        consecutivePollFailures = 0;
        log(`WeChat long poll recovered after ${recoveredFailures} transient error(s).`);
        stateStore.appendLog(`poll_recovered: failures=${recoveredFailures}`);
      }

      if (pollResult.ignoredBacklogCount > 0) {
        stateStore.incrementIgnoredBacklog(pollResult.ignoredBacklogCount);
        stateStore.appendLog(
          `ignored_startup_backlog: count=${pollResult.ignoredBacklogCount}`,
        );
        if (!backlogNoticeSent) {
          backlogNoticeSent = true;
          await queueWechatMessage(
            stateStore.getState().authorizedUserId,
            `Ignored ${pollResult.ignoredBacklogCount} startup backlog message(s) from the first ${Math.round(MESSAGE_START_GRACE_MS / 1000)} second(s).`,
            "notice",
          );
        }
      }

      for (const message of pollResult.messages) {
        if (!ensureRuntimeOwnership()) {
          break;
        }

        stateStore.touchActivity(message.createdAt);
        let nextTask: ActiveTask | null = null;
        try {
          nextTask = await handleInboundMessage({
            message,
            options,
            stateStore,
            codexRuntime,
            queueWechatMessage,
            outputBatcher,
            deferInboundMessage: enqueueDeferredInboundMessage,
            getQueue: () => deferredInboundMessages,
            dropQueuedMessage: (index) => {
              if (index < 1 || index > deferredInboundMessages.length) {
                return false;
              }
              deferredInboundMessages.splice(index - 1, 1);
              return true;
            },
            clearQueue: () => {
              const count = deferredInboundMessages.length;
              deferredInboundMessages.splice(0, deferredInboundMessages.length);
              return count;
            },
            getDraft: () => draftState,
            setDraft: (draft) => {
              draftState = draft;
            },
            getResumeSelection: (senderId) => resumeSelectionsBySender.get(senderId),
            setResumeSelection: (senderId, selection) => {
              if (selection) {
                resumeSelectionsBySender.set(senderId, selection);
              } else {
                resumeSelectionsBySender.delete(senderId);
              }
            },
          });
        } catch (err) {
          const errorText = err instanceof Error ? err.message : String(err);
          logError(errorText);
          stateStore.appendLog(`inbound_error: ${errorText}`);
          await queueWechatMessage(
            message.senderId,
            formatUserFacingInboundError({
              cwd: options.cwd,
              errorText,
            }),
            "inbound_error",
          );
        }
        if (nextTask) {
          activeTask = nextTask;
          lastHeartbeatAt = 0;
        }
        syncSharedSessionState(stateStore, codexRuntime);
        await maybeDrainDeferredInboundMessages();
      }

      void Math.max(lastHeartbeatAt, lastOutputAt || activeTask?.startedAt || 0);
    }
  } finally {
    await shutdown(requestedExitCode);
  }
}

function syncSharedSessionState(
  stateStore: BridgeStateStore,
  codexRuntime: CodexRuntime,
): void {
  const persistedState = stateStore.getState();
  const persistedSessionId = persistedState.sharedSessionId ?? persistedState.sharedThreadId;
  const codexRuntimeState = codexRuntime.getState();
  const runtimeSessionId = codexRuntimeState.sharedSessionId ?? codexRuntimeState.sharedThreadId;

  if (runtimeSessionId && runtimeSessionId !== persistedSessionId) {
    stateStore.setSharedSessionId(runtimeSessionId);
  } else if (!runtimeSessionId && persistedSessionId) {
    stateStore.clearSharedSessionId();
  }

}

function wireCodexRuntimeEvents(params: {
  codexRuntime: CodexRuntime;
  options: BridgeCliOptions;
  transport: WeChatTransport;
  stateStore: BridgeStateStore;
  outputBatcher: OutputBatcher;
  queueWechatAttachmentAction: <T>(action: () => Promise<T>) => Promise<T>;
  queueWechatMessage: (
    senderId: string,
    text: string,
    context?: WechatSendContext,
  ) => Promise<boolean>;
  trackWechatForwardTask: (task: Promise<void>) => void;
  maybeDrainDeferredInboundMessages: () => Promise<void>;
  getActiveTask: () => ActiveTask | null;
  clearActiveTask: () => void;
  updateLastOutputAt: () => void;
  syncSharedSessionState: () => void;
  syncLocalClientEndpoint: () => void;
  requestShutdown: (message: string, exitCode?: number) => void;
}): void {
  const {
    codexRuntime,
    options,
    transport,
    stateStore,
    outputBatcher,
    queueWechatAttachmentAction,
    queueWechatMessage,
    trackWechatForwardTask,
    maybeDrainDeferredInboundMessages,
    getActiveTask,
    clearActiveTask,
    updateLastOutputAt,
    syncSharedSessionState,
    syncLocalClientEndpoint,
    requestShutdown,
  } = params;

  codexRuntime.setEventSink((event) => {
    syncSharedSessionState();
    syncLocalClientEndpoint();
    const codexRuntimeState = codexRuntime.getState();
    const bridgeState = stateStore.getState();
    if (bridgeState.pendingConfirmation && !codexRuntimeState.pendingApproval) {
      stateStore.clearPendingConfirmation();
    }
    if (bridgeState.pendingUserInput && !codexRuntimeState.pendingUserInput) {
      stateStore.clearPendingUserInput();
    }
    const authorizedUserId = stateStore.getState().authorizedUserId;

    switch (event.type) {
      case "stdout":
      case "stderr":
        updateLastOutputAt();
        if (shouldForwardBridgeEventToWechat(event.type)) {
          outputBatcher.push(event.text);
        }
        break;
      case "final_reply":
        stateStore.appendLog(`final_reply: ${truncatePreview(event.text)}`);
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          await forwardWechatFinalReply({
            rawText: event.text,
            onEmptyVisibleReply: ({ rawVisibleText }) => {
              stateStore.appendLog(
                `empty_visible_final_reply: runtime=codex raw=${truncatePreview(rawVisibleText)}`,
              );
            },
            sender: {
              sendText: async (text) => {
                const sent = await queueWechatMessage(
                  authorizedUserId,
                  text,
                  "final_reply",
                );
                if (sent) {
                  stateStore.appendLog(
                    `final_reply_sent: chars=${Array.from(text).length}`,
                  );
                }
                return sent;
              },
              sendImage: (imagePath) =>
                queueWechatAttachmentAction(() =>
                  transport.sendImage(imagePath, { recipientId: authorizedUserId }),
                ),
              sendFile: (filePath) =>
                queueWechatAttachmentAction(() =>
                  transport.sendFile(filePath, { recipientId: authorizedUserId }),
                ),
              sendVoice: (voicePath) =>
                queueWechatAttachmentAction(() =>
                  transport.sendVoice(voicePath, authorizedUserId),
                ),
              sendVideo: (videoPath) =>
                queueWechatAttachmentAction(() =>
                  transport.sendVideo(videoPath, { recipientId: authorizedUserId }),
                ),
            },
          });
        }));
        break;
      case "status":
        if (event.message) {
          log(`${event.status}: ${event.message}`);
          stateStore.appendLog(`${event.status}: ${event.message}`);
        }
        void maybeDrainDeferredInboundMessages();
        break;
      case "notice":
        updateLastOutputAt();
        stateStore.appendLog(`${event.level}_notice: ${truncatePreview(event.text)}`);
        if (shouldForwardBridgeEventToWechat(event.type, { text: event.text })) {
          trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
            await queueWechatMessage(authorizedUserId, event.text, "notice");
          }));
        }
        break;
      case "thinking":
        updateLastOutputAt();
        if (event.text) {
          const thinkingPreview = formatThinkingForWechat(event.text, 500);
          if (thinkingPreview) {
            stateStore.appendLog(`thinking: ${thinkingPreview}`);
            trackWechatForwardTask((async () => {
              await queueWechatMessage(authorizedUserId, `思考: ${thinkingPreview}`, "thinking");
            })());
          }
        }
        break;
      case "approval_required":
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          const pending = toPendingApproval(event.request);
          stateStore.setPendingConfirmation(pending);
          stateStore.appendLog(
            `Approval requested (${pending.source}): ${pending.commandPreview}`,
          );
          await queueWechatMessage(
            authorizedUserId,
            formatApprovalMessage(pending, codexRuntimeState),
            "approval_required",
          );
        }));
        break;
      case "user_input_required":
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          const pending = toPendingUserInput(event.request);
          stateStore.setPendingUserInput(pending);
          stateStore.appendLog(
            `User input requested: questions=${pending.questions.length}`,
          );
          await queueWechatMessage(
            authorizedUserId,
            formatUserInputRequestMessage(pending, codexRuntimeState),
            "user_input_required",
          );
        }));
        break;
      case "mirrored_user_input":
        stateStore.appendLog(`mirrored_local_input: ${truncatePreview(event.text)}`);
        if (shouldForwardBridgeEventToWechat(event.type, { text: event.text })) {
          trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
            await queueWechatMessage(
              authorizedUserId,
              formatMirroredUserInputMessage(event.text),
              "mirrored_user_input",
            );
          }));
        }
        break;
      case "session_switched":
        stateStore.appendLog(
          `session_switched: ${event.sessionId} source=${event.source} reason=${event.reason}`,
        );
        if (shouldForwardBridgeEventToWechat(event.type)) {
          trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
            await queueWechatMessage(
              authorizedUserId,
              formatSessionSwitchMessage({
                sessionId: event.sessionId,
                source: event.source,
                reason: event.reason,
              }),
              "session_switched",
            );
          }));
        }
        break;
      case "thread_switched":
        stateStore.appendLog(
          `thread_switched: ${event.threadId} source=${event.source} reason=${event.reason}`,
        );
        if (shouldForwardBridgeEventToWechat(event.type)) {
          trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
            await queueWechatMessage(
              authorizedUserId,
              formatSessionSwitchMessage({
                sessionId: event.threadId,
                source: event.source,
                reason: event.reason,
              }),
              "thread_switched",
            );
          }));
        }
        void maybeDrainDeferredInboundMessages();
        break;
      case "task_complete":
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          stateStore.clearPendingConfirmation();
          stateStore.clearPendingUserInput();
          void event.exitCode;
          void getActiveTask;
          clearActiveTask();
          await maybeDrainDeferredInboundMessages();
        }));
        break;
      case "task_failed":
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          stateStore.clearPendingConfirmation();
          stateStore.clearPendingUserInput();
          clearActiveTask();
          await queueWechatMessage(
            authorizedUserId,
            formatTaskFailedMessage(event.message),
            "task_failed",
          );
          await maybeDrainDeferredInboundMessages();
        }));
        break;
      case "fatal_error":
        logError(event.message);
        stateStore.appendLog(`fatal_error: ${event.message}`);
        stateStore.clearPendingConfirmation();
        stateStore.clearPendingUserInput();
        clearActiveTask();
        trackWechatForwardTask(outputBatcher.flushNow().then(async () => {
          await queueWechatMessage(
            authorizedUserId,
            formatUserFacingBridgeFatalError(event.message),
            "fatal_error",
          );
          await maybeDrainDeferredInboundMessages();
        }));
        break;
      case "shutdown_requested":
        stateStore.appendLog(`shutdown_requested: ${event.reason}`);
        requestShutdown(event.message, event.exitCode ?? 0);
        break;
    }
  });
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

function formatQueueReport(queue: DeferredInboundMessage[]): string {
  if (queue.length === 0) {
    return "Queue is empty.";
  }
  return [
    `Queued messages: ${queue.length}`,
    ...queue.map((item, index) => {
      const target = item.targetThreadId ? ` target=${item.targetThreadId.slice(0, 12)}` : "";
      const foreground = item.foreground ? " foreground" : "";
      return `${index + 1}. [${item.source}${foreground}${target}] ${truncatePreview(formatInboundMessagePreview(item.message), 120)}`;
    }),
  ].join("\n");
}

function mergeDraftMessages(messages: InboundWechatMessage[]): InboundWechatMessage | null {
  if (messages.length === 0) {
    return null;
  }
  const first = messages[0]!;
  const text = messages
    .map((message) => message.text.trim())
    .filter(Boolean)
    .join("\n\n");
  return {
    ...first,
    text,
    attachments: messages.flatMap((message) => message.attachments),
  };
}

function formatResumeCandidates(
  candidates: Array<{ threadId: string; title: string; lastUpdatedAt: string }>,
): string {
  if (candidates.length === 0) {
    return "No Codex threads found for resume.";
  }
  return [
    "Reply with a number to resume:",
    ...candidates.map((candidate, index) =>
      `${index + 1}. ${candidate.threadId.slice(0, 12)} ${candidate.title} (${candidate.lastUpdatedAt})`,
    ),
  ].join("\n");
}

async function handleInboundMessage(params: {
  message: InboundWechatMessage;
  options: BridgeCliOptions;
  stateStore: BridgeStateStore;
  codexRuntime: CodexRuntime;
  queueWechatMessage: (
    senderId: string,
    text: string,
    context?: WechatSendContext,
  ) => Promise<boolean>;
  outputBatcher: OutputBatcher;
  deferInboundMessage: (message: InboundWechatMessage, options?: {
    targetThreadId?: string;
    foreground?: boolean;
    source?: DeferredInboundMessage["source"];
  }) => Promise<void>;
  getQueue: () => DeferredInboundMessage[];
  dropQueuedMessage: (index: number) => boolean;
  clearQueue: () => number;
  getDraft: () => DraftState | null;
  setDraft: (draft: DraftState | null) => void;
  getResumeSelection: (senderId: string) => PendingResumeSelection | undefined;
  setResumeSelection: (senderId: string, selection: PendingResumeSelection | null) => void;
}): Promise<ActiveTask | null> {
  let { message } = params;
  const {
    options,
    stateStore,
    codexRuntime,
    queueWechatMessage,
    outputBatcher,
    deferInboundMessage,
    getQueue,
    dropQueuedMessage,
    clearQueue,
    getDraft,
    setDraft,
    getResumeSelection,
    setResumeSelection,
  } = params;
  const state = stateStore.getState();
  let forcePromptDispatch = false;

  if (message.senderId !== state.authorizedUserId) {
    await queueWechatMessage(
      message.senderId,
      "Unauthorized. This bridge only accepts messages from the configured WeChat owner.",
    );
    return null;
  }

  codexRuntime.recoverStaleState();

  const pendingResume = getResumeSelection(message.senderId);
  if (pendingResume && /^\d+$/.test(message.text.trim())) {
    const index = Number.parseInt(message.text.trim(), 10);
    const candidate = pendingResume.candidates[index - 1];
    setResumeSelection(message.senderId, null);
    if (!candidate) {
      await queueWechatMessage(message.senderId, "Invalid resume selection.");
      return null;
    }
    const runtimeState = codexRuntime.getState();
    if (runtimeState.status === "busy" || runtimeState.status === "awaiting_approval" || runtimeState.status === "awaiting_input") {
      await queueWechatMessage(message.senderId, "Codex is busy. Wait for it to finish or use /stop before /resume.");
      return null;
    }
    await outputBatcher.flushNow();
    outputBatcher.clear();
    stateStore.clearPendingConfirmation();
    stateStore.clearPendingUserInput();
    await codexRuntime.resumeSession(candidate.threadId);
    stateStore.setSharedThreadId(candidate.threadId);
    await queueWechatMessage(message.senderId, `Resumed Codex thread: ${candidate.threadId}`);
    return null;
  }

  const bridgeCommand = parseBridgeCommand(message.text);
  if (bridgeCommand) {
    switch (bridgeCommand.type) {
      case "queue":
        await queueWechatMessage(message.senderId, formatQueueReport(getQueue()));
        return null;
      case "drop": {
        const dropped = dropQueuedMessage(bridgeCommand.index);
        await queueWechatMessage(
          message.senderId,
          dropped ? `Dropped queued message #${bridgeCommand.index}.` : `No queued message #${bridgeCommand.index}.`,
        );
        return null;
      }
      case "clear_queue": {
        const count = clearQueue();
        await queueWechatMessage(message.senderId, `Cleared ${count} queued message(s).`);
        return null;
      }
      case "steer": {
        if (!codexRuntime.steerInput) {
          await queueWechatMessage(message.senderId, "Codex steer is not available.");
          return null;
        }
        const steered = await codexRuntime.steerInput(bridgeCommand.raw);
        await queueWechatMessage(
          message.senderId,
          steered ? "Steer submitted." : "No active Codex turn to steer.",
        );
        return null;
      }
      case "begin":
        setDraft({ startedAt: nowIso(), parts: [] });
        await queueWechatMessage(message.senderId, "Compose mode started. Send text/files, then //end or //cancel.");
        return null;
      case "cancel": {
        const hadDraft = Boolean(getDraft());
        setDraft(null);
        setResumeSelection(message.senderId, null);
        await queueWechatMessage(message.senderId, hadDraft ? "Compose mode cancelled." : "Cancelled.");
        return null;
      }
      case "end": {
        const draft = getDraft();
        if (!draft) {
          await queueWechatMessage(message.senderId, "No active compose draft.");
          return null;
        }
        setDraft(null);
        const merged = mergeDraftMessages(draft.parts);
        if (!merged) {
          await queueWechatMessage(message.senderId, "Compose draft was empty.");
          return null;
        }
        message = merged;
        forcePromptDispatch = true;
        break;
      }
    }
  } else if (message.text.trim().startsWith("//")) {
    await queueWechatMessage(message.senderId, "Unknown or invalid bridge command.");
    return null;
  } else if (getDraft()) {
    const draft = getDraft()!;
    draft.parts.push(message);
    await queueWechatMessage(message.senderId, `Added to compose draft. Items: ${draft.parts.length}. Send //end or //cancel.`);
    return null;
  }

  let systemCommand: ReturnType<typeof parseWechatControlCommand> = null;
  if (!forcePromptDispatch) {
    const emojiMatch = resolveEmojiCommand(message.text);
    if (emojiMatch) {
      const rewritten = emojiMatch.remainder
        ? `${emojiMatch.command} ${emojiMatch.remainder}`
        : emojiMatch.command;
      message = { ...message, text: rewritten };
    }

    const bindingsCmd = parseEmojiBindingsCommand(message.text);
    if (bindingsCmd) {
      switch (bindingsCmd.type) {
        case "list":
          await queueWechatMessage(message.senderId, formatBindingsListMessage(listBindings()));
          break;
        case "bind":
          setBinding(bindingsCmd.emoji, bindingsCmd.command);
          await queueWechatMessage(message.senderId, `Bound ${bindingsCmd.emoji} → ${bindingsCmd.command}`);
          break;
        case "unbind": {
          const removed = removeBinding(bindingsCmd.emoji);
          await queueWechatMessage(
            message.senderId,
            removed ? `Unbound ${bindingsCmd.emoji}` : `No binding found for ${bindingsCmd.emoji}`,
          );
          break;
        }
      }
      return null;
    }

    if (isBindCommandPrefix(message.text)) {
      await queueWechatMessage(message.senderId, formatBindCommandUsage());
      return null;
    }

    systemCommand = parseWechatControlCommand(message.text, {
      hasPendingConfirmation: Boolean(state.pendingConfirmation),
      hasPendingUserInput: Boolean(state.pendingUserInput),
    });
  }

  switch (systemCommand?.type) {
    case "status":
      await queueWechatMessage(
        message.senderId,
        formatStatusReport(stateStore.getState(), codexRuntime.getState()),
      );
      return null;
    case "resume": {
      const runtimeState = codexRuntime.getState();
      if (runtimeState.status === "busy" || runtimeState.status === "awaiting_approval" || runtimeState.status === "awaiting_input") {
        await queueWechatMessage(message.senderId, "Codex is busy. Wait for it to finish or use /stop before /resume.");
        return null;
      }

      if (systemCommand.target) {
        if (systemCommand.target === "--all") {
          const candidates = (codexRuntime.listAllResumeSessions ?? codexRuntime.listResumeSessions).call(codexRuntime, 20);
          const resolvedCandidates = await candidates;
          const normalized = resolvedCandidates
            .filter((candidate) => candidate.threadId)
            .map((candidate) => ({
              threadId: candidate.threadId!,
              title: candidate.title,
              lastUpdatedAt: candidate.lastUpdatedAt,
            }));
          setResumeSelection(message.senderId, { candidates: normalized, createdAt: nowIso() });
          await queueWechatMessage(message.senderId, formatResumeCandidates(normalized));
          return null;
        }

        await outputBatcher.flushNow();
        outputBatcher.clear();
        stateStore.clearPendingConfirmation();
        stateStore.clearPendingUserInput();
        await codexRuntime.resumeSession(systemCommand.target);
        stateStore.setSharedThreadId(systemCommand.target);
        await queueWechatMessage(message.senderId, `Resumed Codex thread: ${systemCommand.target}`);
        return null;
      }

      const candidates = await codexRuntime.listResumeSessions(10);
      const normalized = candidates
        .filter((candidate) => candidate.threadId)
        .map((candidate) => ({
          threadId: candidate.threadId!,
          title: candidate.title,
          lastUpdatedAt: candidate.lastUpdatedAt,
        }));
      setResumeSelection(message.senderId, { candidates: normalized, createdAt: nowIso() });
      await queueWechatMessage(message.senderId, formatResumeCandidates(normalized));
      return null;
    }
    case "new_session": {
      if (!codexRuntime.createSession) {
        await queueWechatMessage(
          message.senderId,
          "/new is not available in Codex mode.",
        );
        return null;
      }
      await outputBatcher.flushNow();
      outputBatcher.clear();
      stateStore.clearPendingConfirmation();
      stateStore.clearPendingUserInput();
      stateStore.clearSharedSessionId();
      await codexRuntime.createSession();
      stateStore.appendLog("New Codex session requested by owner.");
      return null;
    }
    case "stop": {
      const interrupted = await codexRuntime.interrupt();
      await queueWechatMessage(
        message.senderId,
        interrupted
          ? "Interrupt signal sent to the active worker."
          : "No running worker was available to interrupt.",
      );
      return null;
    }
    case "reset":
      await outputBatcher.flushNow();
      outputBatcher.clear();
      stateStore.clearPendingConfirmation();
      stateStore.clearPendingUserInput();
      stateStore.clearSharedSessionId();
      await codexRuntime.reset();
      stateStore.appendLog("Worker reset by owner.");
      await queueWechatMessage(message.senderId, "Worker session has been reset.");
      return null;
    case "confirm": {
      const pending = state.pendingConfirmation;
      if (!pending) {
        await queueWechatMessage(message.senderId, "No pending approval request.");
        return null;
      }
      const confirmed = await codexRuntime.resolveApproval("confirm");
      if (!confirmed) {
        await queueWechatMessage(
          message.senderId,
          "The worker could not apply this approval request.",
        );
        return null;
      }
      stateStore.clearPendingConfirmation();
      stateStore.appendLog(`Approval confirmed: ${pending.commandPreview}`);
      await queueWechatMessage(message.senderId, "Approval confirmed. Continuing...");
      return {
        startedAt: Date.now(),
        inputPreview: pending.commandPreview,
      };
    }
    case "deny": {
      const pending = state.pendingConfirmation;
      if (!pending) {
        await queueWechatMessage(message.senderId, "No pending approval request.");
        return null;
      }
      const denied = await codexRuntime.resolveApproval("deny");
      if (!denied) {
        await queueWechatMessage(
          message.senderId,
          "The worker could not deny this approval request cleanly.",
        );
        return null;
      }
      stateStore.clearPendingConfirmation();
      stateStore.appendLog(`Approval denied: ${pending.commandPreview}`);
      await queueWechatMessage(message.senderId, "Approval denied.");
      return null;
    }
    case "answer": {
      const pending = state.pendingUserInput;
      if (!pending) {
        await queueWechatMessage(message.senderId, "No pending user input request.");
        return null;
      }

      const parsed = parsePendingUserInputAnswerCommand(systemCommand.raw, pending);
      if ("error" in parsed) {
        await queueWechatMessage(message.senderId, parsed.error);
        return null;
      }

      const submitted = await codexRuntime.submitUserInput(parsed.answers);
      if (!submitted) {
        await queueWechatMessage(
          message.senderId,
          "The worker could not apply this answer.",
        );
        return null;
      }

      stateStore.clearPendingUserInput();
      stateStore.appendLog(`User input answered: ${parsed.preview}`);
      await queueWechatMessage(message.senderId, "Answer submitted. Continuing...");
      return {
        startedAt: Date.now(),
        inputPreview: parsed.preview,
      };
    }
  }

  if (state.pendingConfirmation) {
    await queueWechatMessage(
      message.senderId,
      formatPendingApprovalReminder(state.pendingConfirmation, codexRuntime.getState()),
    );
    return null;
  }

  if (state.pendingUserInput) {
    await queueWechatMessage(
      message.senderId,
      formatPendingUserInputReminder(state.pendingUserInput),
    );
    return null;
  }

  const codexRuntimeState = codexRuntime.getState();
  if (
    shouldDeferCodexInboundMessage({
      status: codexRuntimeState.status,
      hasPendingConfirmation: Boolean(state.pendingConfirmation),
      hasPendingUserInput: Boolean(state.pendingUserInput),
      hasSystemCommand: Boolean(systemCommand),
    })
  ) {
    await deferInboundMessage(message);
    return null;
  }

  if (codexRuntimeState.status === "awaiting_approval") {
    await queueWechatMessage(
      message.senderId,
      "Codex is waiting for approval. Reply /confirm or /deny, or use /stop.",
    );
    return null;
  }

  if (codexRuntimeState.status === "awaiting_input") {
    await queueWechatMessage(
      message.senderId,
      "Codex is waiting for input. Reply /answer <text>, or use /stop.",
    );
    return null;
  }

  if (codexRuntimeState.status === "busy") {
    await queueWechatMessage(
      message.senderId,
      "Codex is still working. Wait for the current reply or use /stop.",
    );
    return null;
  }

  return dispatchInboundWechatText({
    message,
    options,
    stateStore,
    codexRuntime,
  });
}

async function dispatchInboundWechatText(params: {
  message: InboundWechatMessage;
  options: BridgeCliOptions;
  stateStore: BridgeStateStore;
  codexRuntime: CodexRuntime;
}): Promise<ActiveTask> {
  const { message, options, stateStore, codexRuntime } = params;
  const preview = formatInboundMessagePreview(message);
  const activeTask = {
    startedAt: Date.now(),
    inputPreview: truncatePreview(preview, 180),
  };
  stateStore.appendLog(`Forwarded input to ${"codex"}: ${truncatePreview(preview)}`);
  await codexRuntime.sendInput(buildWechatInboundPrompt(message.text, message.attachments));
  return activeTask;
}

const isDirectRun = Boolean((import.meta as ImportMeta & { main?: boolean }).main);
if (isDirectRun) {
  main().catch((err) => {
    logError(describeWechatTransportError(err));
    process.exit(1);
  });
}

