import fs from "node:fs";

import {
  appendBoundedLog,
  ensureChannelDataDir,
  SERVICE_LOCK_FILE,
  SERVICE_LOG_FILE,
  SERVICE_STATE_FILE,
} from "../wechat/channel-config.ts";

export type ServiceState = {
  instanceId: string;
  cwd: string;
  authorizedUserId?: string;
  currentThreadId?: string;
  activeTurnId?: string;
  ignoredBacklogCount: number;
  startedAt: string;
  lastActivityAt?: string;
};

export class StateStore {
  private state: ServiceState;

  constructor(cwd: string, authorizedUserId?: string) {
    ensureChannelDataDir();
    const existing = readJson<ServiceState>(SERVICE_STATE_FILE);
    this.state = {
      instanceId: `${process.pid}-${Date.now()}`,
      cwd,
      authorizedUserId: authorizedUserId?.trim() || existing?.authorizedUserId,
      currentThreadId: existing?.currentThreadId,
      ignoredBacklogCount: 0,
      startedAt: new Date().toISOString(),
    };
    this.save();
  }

  get(): ServiceState {
    return { ...this.state };
  }

  setAuthorizedUser(userId: string): void {
    this.state.authorizedUserId = userId;
    this.touch();
  }

  setThread(threadId: string | null): void {
    if (threadId) {
      this.state.currentThreadId = threadId;
    } else {
      delete this.state.currentThreadId;
    }
    this.touch();
  }

  setActiveTurn(turnId: string | null): void {
    if (turnId) {
      this.state.activeTurnId = turnId;
    } else {
      delete this.state.activeTurnId;
    }
    this.touch();
  }

  addIgnoredBacklog(count: number): void {
    if (count <= 0) {
      return;
    }
    this.state.ignoredBacklogCount += count;
    this.touch();
  }

  log(message: string): void {
    appendBoundedLog(SERVICE_LOG_FILE, `${new Date().toISOString()} ${message}`);
  }

  acquireLock(): void {
    const current = readJson<{ pid?: number; cwd?: string }>(SERVICE_LOCK_FILE);
    if (current?.pid && current.pid !== process.pid && isPidAlive(current.pid)) {
      throw new Error(`codex-wechat-bridge is already running: pid=${current.pid} cwd=${current.cwd ?? ""}`);
    }
    fs.writeFileSync(
      SERVICE_LOCK_FILE,
      JSON.stringify({ pid: process.pid, cwd: this.state.cwd, startedAt: this.state.startedAt }, null, 2),
    );
  }

  releaseLock(): void {
    const current = readJson<{ pid?: number }>(SERVICE_LOCK_FILE);
    if (!current?.pid || current.pid === process.pid) {
      fs.rmSync(SERVICE_LOCK_FILE, { force: true });
    }
  }

  private touch(): void {
    this.state.lastActivityAt = new Date().toISOString();
    this.save();
  }

  private save(): void {
    fs.writeFileSync(SERVICE_STATE_FILE, JSON.stringify(this.state, null, 2));
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
