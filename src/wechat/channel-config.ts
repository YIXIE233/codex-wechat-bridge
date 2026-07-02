import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_BASE_URL =
  process.env.WECHAT_ILINK_BASE_URL?.trim() || "https://api-bot.wexin.qq.com";
export const BOT_TYPE = "3";

export function resolveChannelDataDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.CODEX_WECHAT_BRIDGE_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(os.homedir(), ".codex-wechat-bridge");
}

export const CHANNEL_DATA_DIR = resolveChannelDataDir();
export const CREDENTIALS_FILE = path.join(CHANNEL_DATA_DIR, "account.json");
export const SYNC_BUF_FILE = path.join(CHANNEL_DATA_DIR, "sync_buf.txt");
export const CONTEXT_CACHE_FILE = path.join(CHANNEL_DATA_DIR, "context_tokens.json");
export const SERVICE_STATE_FILE = path.join(CHANNEL_DATA_DIR, "state.json");
export const SERVICE_LOCK_FILE = path.join(CHANNEL_DATA_DIR, "service.lock.json");
export const SERVICE_LOG_FILE = path.join(CHANNEL_DATA_DIR, "service.log");
export const INBOUND_MESSAGE_CLAIMS_DIR = path.join(
  CHANNEL_DATA_DIR,
  "inbound-message-claims",
);
export const INBOUND_ATTACHMENTS_DIR = path.join(CHANNEL_DATA_DIR, "inbound-attachments");
export const CODEX_APP_SERVER_DIR = path.join(CHANNEL_DATA_DIR, "codex-app-server");

const LOG_MAX_BYTES = 5 * 1024 * 1024;

export function ensureChannelDataDir(): void {
  fs.mkdirSync(CHANNEL_DATA_DIR, { recursive: true });
  fs.mkdirSync(INBOUND_MESSAGE_CLAIMS_DIR, { recursive: true });
  fs.mkdirSync(INBOUND_ATTACHMENTS_DIR, { recursive: true });
  fs.mkdirSync(CODEX_APP_SERVER_DIR, { recursive: true });
}

export function appendBoundedLog(filePath: string, line: string): void {
  ensureChannelDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > LOG_MAX_BYTES) {
        const keepSize = Math.floor(LOG_MAX_BYTES / 2);
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(keepSize);
        fs.readSync(fd, buffer, 0, keepSize, Math.max(0, stat.size - keepSize));
        fs.closeSync(fd);
        fs.writeFileSync(filePath, buffer);
      }
    }
  } catch {
    // Logging must never block the bridge.
  }
  fs.appendFileSync(filePath, `${line}\n`);
}
