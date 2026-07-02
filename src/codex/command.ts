import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function resolveCodexCommand(command?: string): string {
  if (command?.trim()) {
    return command.trim();
  }

  const pluginAppServerCodex = path.join(
    os.homedir(),
    ".codex",
    "plugins",
    ".plugin-appserver",
    process.platform === "win32" ? "codex.exe" : "codex",
  );
  if (fs.existsSync(pluginAppServerCodex)) {
    return pluginAppServerCodex;
  }

  return "codex";
}
