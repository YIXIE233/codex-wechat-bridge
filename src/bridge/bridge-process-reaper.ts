import { spawnSync } from "node:child_process";

function collectPosixDescendantsSync(rootPid: number): number[] {
  const descendants: number[] = [];
  const stack = [rootPid];
  while (stack.length > 0) {
    const parent = stack.pop();
    if (parent === undefined) {
      break;
    }
    try {
      const result = spawnSync("pgrep", ["-P", String(parent)], {
        encoding: "utf8",
        windowsHide: true,
      });
      if (result.error || result.status !== 0) {
        continue;
      }
      const stdout = result.stdout ?? "";
      for (const line of stdout.split(/\r?\n/)) {
        const childPid = Number.parseInt(line.trim(), 10);
        if (
          Number.isInteger(childPid) &&
          childPid > 0 &&
          childPid !== rootPid &&
          !descendants.includes(childPid)
        ) {
          descendants.push(childPid);
          stack.push(childPid);
        }
      }
    } catch {
      continue;
    }
  }
  return descendants;
}

export function killProcessTreeSync(pid: number): void {
  if (!Number.isInteger(pid) || pid <= 0) {
    return;
  }

  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/T", "/F", "/PID", String(pid)], {
        windowsHide: true,
        timeout: 5_000,
      });
    } catch {
      try {
        process.kill(pid);
      } catch {
        // Best effort.
      }
    }
    return;
  }

  try {
    process.kill(-pid);
  } catch {
    // Not a process group leader or already gone.
  }
  const descendants = collectPosixDescendantsSync(pid);
  for (let i = descendants.length - 1; i >= 0; i -= 1) {
    const descendantPid = descendants[i];
    if (descendantPid === undefined) {
      continue;
    }
    try {
      process.kill(descendantPid);
    } catch {
      // Best effort.
    }
  }
  try {
    process.kill(pid);
  } catch {
    // Best effort.
  }
}
