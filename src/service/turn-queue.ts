import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { ensureChannelDataDir, TURN_QUEUE_DIR } from "../wechat/channel-config.ts";

export type QueuedTurn = {
  id: string;
  createdAt: string;
  text: string;
  source: "cli" | "service";
  recipientId?: string;
};

export type EnqueueTurnOptions = {
  text: string;
  recipientId?: string;
};

export class TurnQueue {
  enqueue(options: EnqueueTurnOptions): QueuedTurn {
    const text = options.text.trim();
    if (!text) {
      throw new Error("Queued turn text cannot be empty.");
    }

    ensureChannelDataDir();
    const now = new Date();
    const id = `${formatQueueTimestamp(now)}-${crypto.randomBytes(4).toString("hex")}`;
    const item: QueuedTurn = {
      id,
      createdAt: now.toISOString(),
      text,
      source: "cli",
      recipientId: options.recipientId?.trim() || undefined,
    };
    const target = path.join(TURN_QUEUE_DIR, `${id}.json`);
    const temp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(item, null, 2));
    fs.renameSync(temp, target);
    return item;
  }

  peek(): QueuedTurn | null {
    ensureChannelDataDir();
    const filePath = this.nextFile();
    if (!filePath) {
      return null;
    }
    try {
      const item = JSON.parse(fs.readFileSync(filePath, "utf8")) as QueuedTurn;
      if (!item.id || !item.text) {
        this.remove(filePath);
        return null;
      }
      return item;
    } catch {
      this.remove(filePath);
      return null;
    }
  }

  complete(id: string): void {
    const filePath = path.join(TURN_QUEUE_DIR, `${id}.json`);
    this.remove(filePath);
  }

  private nextFile(): string | null {
    const files = fs
      .readdirSync(TURN_QUEUE_DIR)
      .filter((name) => name.endsWith(".json"))
      .sort();
    return files[0] ? path.join(TURN_QUEUE_DIR, files[0]) : null;
  }

  private remove(filePath: string): void {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Best effort queue cleanup.
    }
  }
}

function formatQueueTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
