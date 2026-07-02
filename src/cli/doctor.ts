#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  CHANNEL_DATA_DIR,
  CREDENTIALS_FILE,
  ensureChannelDataDir,
  SERVICE_LOCK_FILE,
} from "../wechat/channel-config.ts";
import { resolveCodexCommand } from "../codex/command.ts";

function main(): void {
  ensureChannelDataDir();
  const codexCommand = resolveCodexCommand(process.env.CODEX_WECHAT_CODEX_COMMAND);
  const codex = spawnSync(codexCommand, ["--version"], {
    encoding: "utf8",
    shell: false,
  });
  const lines = [
    "Codex WeChat Bridge doctor",
    `data_dir: ${CHANNEL_DATA_DIR}`,
    `credentials: ${fs.existsSync(CREDENTIALS_FILE) ? "present" : "missing"}`,
    `lock: ${fs.existsSync(SERVICE_LOCK_FILE) ? "present" : "none"}`,
    `node: ${process.version}`,
    `codex_command: ${codexCommand}`,
    `codex: ${codex.status === 0 ? (codex.stdout || codex.stderr).trim() : "unavailable"}`,
  ];
  console.log(lines.join("\n"));
}

main();
