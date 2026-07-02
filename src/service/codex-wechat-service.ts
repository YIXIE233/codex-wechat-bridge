import { CodexAppServerProcess } from "../codex/app-server-process.ts";
import { CodexClient } from "../codex/codex-client.ts";
import { CodexRpcClient } from "../codex/rpc-client.ts";
import type { CodexEvent } from "../codex/types.ts";
import {
  DEFAULT_LONG_POLL_TIMEOUT_MS,
  type InboundWechatMessage,
  WeChatTransport,
} from "../wechat/wechat-transport.ts";
import { ensureWechatCredentials } from "../wechat/setup.ts";
import { StateStore } from "./state-store.ts";

export type CodexWechatServiceOptions = {
  cwd: string;
  codexCommand?: string;
  profile?: string;
  approvalPolicy?: string;
  sandbox?: string;
};

export class CodexWechatService {
  private readonly options: CodexWechatServiceOptions;
  private readonly state: StateStore;
  private readonly wechat: WeChatTransport;
  private readonly appServer: CodexAppServerProcess;
  private readonly rpc = new CodexRpcClient();
  private codex: CodexClient | null = null;
  private stopping = false;

  constructor(options: CodexWechatServiceOptions) {
    this.options = options;
    this.state = new StateStore(options.cwd);
    this.wechat = new WeChatTransport({
      log: (message) => this.state.log(message),
      logError: (message) => this.state.log(`ERROR ${message}`),
    });
    this.appServer = new CodexAppServerProcess({
      command: options.codexCommand,
      cwd: options.cwd,
      profile: options.profile,
      log: (message) => this.state.log(message),
    });
  }

  async run(): Promise<void> {
    this.state.acquireLock();
    await ensureWechatCredentials({
      requireUserId: true,
      validateExisting: false,
      log: (message) => this.state.log(message),
    });

    const endpoint = await this.appServer.start();
    await this.rpc.connect(endpoint);

    const currentState = this.state.get();
    this.codex = new CodexClient(this.rpc, {
      cwd: this.options.cwd,
      approvalPolicy: this.options.approvalPolicy,
      sandbox: this.options.sandbox,
      initialThreadId: currentState.currentThreadId,
    });
    this.codex.onEvent((event) => void this.handleCodexEvent(event));

    process.once("SIGINT", () => void this.stop());
    process.once("SIGTERM", () => void this.stop());

    this.state.log(`codex-wechat-bridge started cwd=${this.options.cwd}`);
    await this.loop();
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }
    this.stopping = true;
    this.rpc.close();
    await this.appServer.stop();
    this.state.releaseLock();
  }

  private async loop(): Promise<void> {
    const minCreatedAtMs = Date.now();
    while (!this.stopping) {
      try {
        const result = await this.wechat.pollMessages({
          timeoutMs: DEFAULT_LONG_POLL_TIMEOUT_MS,
          minCreatedAtMs,
        });
        this.state.addIgnoredBacklog(result.ignoredBacklogCount);
        for (const message of result.messages) {
          await this.handleWechatMessage(message);
        }
      } catch (error) {
        this.state.log(`poll error: ${error instanceof Error ? error.message : String(error)}`);
        await delay(3_000);
      }
    }
  }

  private async handleWechatMessage(message: InboundWechatMessage): Promise<void> {
    const current = this.state.get();
    if (!current.authorizedUserId) {
      this.state.setAuthorizedUser(message.senderId);
    } else if (current.authorizedUserId !== message.senderId) {
      return;
    }

    const text = message.text.trim();
    try {
      if (await this.handleBridgeCommand(message.senderId, text)) {
        return;
      }
      const prompt = buildPrompt(message);
      await this.requireCodex().startTurn(prompt);
    } catch (error) {
      await this.wechat.sendText(message.senderId, error instanceof Error ? error.message : String(error));
    }
  }

  private async handleBridgeCommand(senderId: string, text: string): Promise<boolean> {
    if (!text.startsWith("/")) {
      return false;
    }
    const [command, ...rest] = text.split(/\s+/);
    const arg = rest.join(" ").trim();
    switch (command) {
      case "/status": {
        const state = this.state.get();
        await this.wechat.sendText(
          senderId,
          [
            `cwd: ${state.cwd}`,
            `thread: ${state.currentThreadId ?? "(none)"}`,
            `active_turn: ${state.activeTurnId ?? "(none)"}`,
            `authorized_user: ${state.authorizedUserId ?? "(none)"}`,
          ].join("\n"),
        );
        return true;
      }
      case "/stop":
        await this.requireCodex().interrupt();
        await this.wechat.sendText(senderId, "Codex task interrupted.");
        return true;
      case "/confirm":
      case "/yes":
        this.requireCodex().confirmApproval();
        return true;
      case "/deny":
      case "/no":
        this.requireCodex().denyApproval();
        return true;
      case "/answer":
        this.requireCodex().submitUserInput(arg);
        return true;
      case "/resume":
        if (!arg) {
          await this.wechat.sendText(senderId, "Usage: /resume <thread-id>");
          return true;
        }
        await this.requireCodex().resumeThread(arg);
        this.state.setThread(arg);
        await this.wechat.sendText(senderId, `Resumed Codex thread: ${arg}`);
        return true;
      default:
        return false;
    }
  }

  private async handleCodexEvent(event: CodexEvent): Promise<void> {
    const state = this.state.get();
    const recipient = state.authorizedUserId;
    if (event.type === "thread") {
      this.state.setThread(event.threadId);
      return;
    }
    if (event.type === "turn") {
      this.state.setThread(event.threadId);
      this.state.setActiveTurn(event.turnId);
      return;
    }
    if (event.type === "final") {
      this.state.setActiveTurn(null);
      if (recipient) {
        await this.sendText(recipient, event.text, "final");
      }
      return;
    }
    if (event.type === "approval" && recipient) {
      await this.sendText(
        recipient,
        `${event.request.summary}\n\nReply /confirm or /deny.`,
        "approval",
      );
      return;
    }
    if (event.type === "user_input" && recipient) {
      await this.sendText(recipient, `${event.request.summary}\n\nReply /answer <text>.`, "user_input");
      return;
    }
    if (event.type === "error" && recipient) {
      await this.sendText(recipient, event.message, "error");
    }
  }

  private async sendText(recipient: string, text: string, label: string): Promise<void> {
    try {
      await this.wechat.sendText(recipient, text);
      this.state.log(`wechat_send_ok label=${label} recipient=${recipient} chars=${text.length}`);
    } catch (error) {
      this.state.log(
        `wechat_send_failed label=${label} recipient=${recipient} error=${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private requireCodex(): CodexClient {
    if (!this.codex) {
      throw new Error("Codex is not ready.");
    }
    return this.codex;
  }
}

function buildPrompt(message: InboundWechatMessage): string {
  const attachmentLines = message.attachments.map(
    (attachment) => `- ${attachment.kind}: ${attachment.path} (${attachment.sizeBytes} bytes)`,
  );
  if (attachmentLines.length === 0) {
    return message.text;
  }
  return [
    message.text,
    "",
    "Wechat attachments saved locally:",
    ...attachmentLines,
  ].join("\n");
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
