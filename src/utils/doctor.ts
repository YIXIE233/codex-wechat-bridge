import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  normalizeBridgeLockPayload,
  shouldAutoReclaimBridgeLock,
  type BridgeLockPayload,
} from "../bridge/bridge-state.ts";
import { t } from "../i18n/index.ts";
import { readLocalClientEndpoint } from "../codex/local-client-link.ts";
import type { LocalClientEndpoint } from "../codex/runtime-types.ts";
import { DEFAULT_BASE_URL, resolveChannelDataDir } from "../wechat/channel-config.ts";

const STATE_OK = "[ok]";
const STATE_WARN = "[warn]";
const STATE_FAIL = "[fail]";
const RUNTIME_ENDPOINT_TIMEOUT_MS = 500;
const SERVER_DATE_TIMEOUT_MS = 3_000;
const CLOCK_SKEW_WARN_MS = 30_000;

type DoctorStatus = "ok" | "warn" | "fail";

export type DoctorCliOptions = {
  cwd: string;
};

type FileReadResult<T> =
  | { kind: "missing"; filePath: string }
  | { kind: "invalid"; filePath: string; error: string }
  | { kind: "ok"; filePath: string; value: T };

export type DoctorDeps = {
  platform?: NodeJS.Platform;
  arch?: string;
  nodeVersion?: string;
  osRelease?: () => string;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  getWindowsCodePage?: () => number | null;
  fetchServerDate?: () => Promise<Date | null>;
  findExecutable?: (name: string) => string | null;
  resolveDataDir?: () => string;
  exists?: (filePath: string) => boolean;
  readTextFile?: (filePath: string) => string;
  isProcessAlive?: (pid: number) => boolean;
  isTcpPortReachable?: (port: number, timeoutMs: number) => Promise<boolean>;
  readLocalClientEndpoint?: (cwd: string) => LocalClientEndpoint | null;
};

type ResolvedDoctorDeps = Required<DoctorDeps>;

type BuildDoctorReportOptions = {
  argv?: string[];
  cwd?: string;
};

function msg(key: string, params?: Record<string, string | number>): string {
  return t(`doctor.${key}`, params);
}

function section(lines: string[], title: string): void {
  if (lines.length > 0 && lines.at(-1) !== "") {
    lines.push("");
  }
  lines.push(title);
}

function row(status: string, label: string, value: string): string {
  return `  ${status} ${label} ${value}`;
}

function fieldRow(label: string, value: string): string {
  return `  ${label} ${value}`;
}

function detail(value: string): string {
  return `    ${value}`;
}

function detailField(label: string, value: string): string {
  return detail(`${label} ${value}`);
}

function findExecutable(name: string): string | null {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    return execFileSync(cmd, [name], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      windowsHide: true,
    }).trim().split(/\r?\n/)[0] ?? null;
  } catch {
    return null;
  }
}

function defaultGetWindowsCodePage(): number | null {
  try {
    const output = execFileSync("cmd.exe", ["/d", "/c", "chcp"], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      windowsHide: true,
    });
    const match = /(\d+)\s*\.?\s*$/.exec(output.trim());
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

async function defaultFetchServerDate(): Promise<Date | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVER_DATE_TIMEOUT_MS);
  try {
    const res = await fetch(DEFAULT_BASE_URL, {
      method: "GET",
      signal: controller.signal,
    });
    const dateHeader = res.headers.get("date");
    if (!dateHeader) {
      return null;
    }
    const parsed = new Date(dateHeader);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function containsNonAscii(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) > 0x7f);
}

function pickProxyEnvValue(env: NodeJS.ProcessEnv): string | undefined {
  return (
    env.HTTPS_PROXY ??
    env.https_proxy ??
    env.HTTP_PROXY ??
    env.http_proxy ??
    env.ALL_PROXY ??
    env.all_proxy
  )?.trim() || undefined;
}

function defaultIsProcessAlive(pid: number): boolean {
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

async function defaultIsTcpPortReachable(port: number, timeoutMs: number): Promise<boolean> {
  if (!Number.isInteger(port) || port <= 0) {
    return false;
  }
  return await new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let done = false;
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function resolveDeps(deps: DoctorDeps = {}): ResolvedDoctorDeps {
  return {
    platform: deps.platform ?? process.platform,
    arch: deps.arch ?? process.arch,
    nodeVersion: deps.nodeVersion ?? process.version,
    osRelease: deps.osRelease ?? os.release,
    env: deps.env ?? process.env,
    now: deps.now ?? Date.now,
    getWindowsCodePage: deps.getWindowsCodePage ?? defaultGetWindowsCodePage,
    fetchServerDate: deps.fetchServerDate ?? defaultFetchServerDate,
    findExecutable: deps.findExecutable ?? findExecutable,
    resolveDataDir: deps.resolveDataDir ?? resolveChannelDataDir,
    exists: deps.exists ?? fs.existsSync,
    readTextFile: deps.readTextFile ?? ((filePath) => fs.readFileSync(filePath, "utf8")),
    isProcessAlive: deps.isProcessAlive ?? defaultIsProcessAlive,
    isTcpPortReachable: deps.isTcpPortReachable ?? defaultIsTcpPortReachable,
    readLocalClientEndpoint: deps.readLocalClientEndpoint ?? ((cwd) => readLocalClientEndpoint(cwd)),
  };
}

export function parseDoctorCliArgs(
  argv: string[],
  fallbackCwd = process.cwd(),
): DoctorCliOptions {
  let cwd = fallbackCwd;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--cwd" && next) {
      cwd = path.resolve(next);
      i += 1;
    }
  }
  return { cwd: path.resolve(cwd) };
}

function statusTag(status: DoctorStatus): string {
  if (status === "ok") return STATE_OK;
  if (status === "warn") return STATE_WARN;
  return STATE_FAIL;
}

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 100 ? `${message.slice(0, 100)}...` : message;
}

function sameWorkspacePath(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function readNormalizedJsonFile<T>(
  filePath: string,
  deps: ResolvedDoctorDeps,
  normalize: (value: unknown) => T | null,
): FileReadResult<T> {
  if (!deps.exists(filePath)) {
    return { kind: "missing", filePath };
  }
  try {
    const parsed = JSON.parse(deps.readTextFile(filePath)) as unknown;
    const normalized = normalize(parsed);
    if (!normalized) {
      return { kind: "invalid", filePath, error: msg("invalidShape") };
    }
    return { kind: "ok", filePath, value: normalized };
  } catch (error) {
    return { kind: "invalid", filePath, error: shortError(error) };
  }
}

function formatAlive(value: boolean | undefined): string {
  if (value === undefined) return msg("unknown");
  return value ? msg("yes") : msg("no");
}

function appendLockDetailLines(lines: string[], lock: BridgeLockPayload): void {
  lines.push(detailField(msg("lock.detail.pid"), String(lock.pid)));
  lines.push(detailField(msg("lock.detail.adapter"), "codex"));
  lines.push(detailField(msg("lock.detail.cwd"), lock.cwd));
  lines.push(detailField(msg("lock.detail.lifecycle"), lock.lifecycle));
  lines.push(detailField(msg("lock.detail.startedAt"), lock.startedAt));
}

function appendBridgeLockLines(
  lines: string[],
  options: DoctorCliOptions,
  dataDir: string,
  deps: ResolvedDoctorDeps,
): BridgeLockPayload | null {
  const lockFile = path.join(dataDir, "bridge.lock.json");
  const lockResult = readNormalizedJsonFile(lockFile, deps, normalizeBridgeLockPayload);
  const label = msg("label.bridgeLock");
  if (lockResult.kind === "missing") {
    lines.push(row(STATE_OK, label, msg("none")));
    return null;
  }
  if (lockResult.kind === "invalid") {
    lines.push(row(STATE_WARN, label, msg("lock.invalid", { error: lockResult.error })));
    lines.push(detail(msg("file", { file: lockResult.filePath })));
    return null;
  }
  const lock = lockResult.value;
  const lockAlive = deps.isProcessAlive(lock.pid);
  const parentAlive = lock.parentPid > 1 ? deps.isProcessAlive(lock.parentPid) : undefined;
  const reclaimable = lockAlive ? shouldAutoReclaimBridgeLock(lock, deps.isProcessAlive) : false;

  if (!lockAlive) {
    lines.push(row(STATE_WARN, label, msg("lock.stale")));
    appendLockDetailLines(lines, lock);
    lines.push(detailField(msg("lock.detail.startup"), msg("lock.staleBridgeStartup")));
  } else if (reclaimable) {
    lines.push(row(STATE_WARN, label, msg("lock.reclaimable")));
    appendLockDetailLines(lines, lock);
    lines.push(detailField(msg("lock.detail.parent"), msg("lock.parent", {
      pid: lock.parentPid,
      alive: formatAlive(parentAlive),
    })));
    lines.push(detailField(msg("lock.detail.startup"), msg("lock.reclaimableBridgeStartup")));
  } else {
    lines.push(row(STATE_FAIL, label, msg("lock.live")));
    appendLockDetailLines(lines, lock);
    lines.push(detailField(msg("lock.detail.startup"), msg("lock.liveBridgeStartup")));
  }

  if (!sameWorkspacePath(lock.cwd, options.cwd)) {
    lines.push(detailField(msg("lock.detail.note"), msg("lock.cwdDifferent", { cwd: options.cwd })));
  }
  return lock;
}

async function appendEndpointSummary(
  lines: string[],
  label: string,
  endpoint: LocalClientEndpoint | null,
  options: DoctorCliOptions,
  lock: BridgeLockPayload | null,
  deps: ResolvedDoctorDeps,
): Promise<void> {
  if (!endpoint) {
    lines.push(row(STATE_OK, label, msg("none")));
    return;
  }
  const port = endpoint.serverPort ?? endpoint.port;
  const reachable = await deps.isTcpPortReachable(port, RUNTIME_ENDPOINT_TIMEOUT_MS);
  const bridgeOwnerAlive = endpoint.bridgeOwnerPid ? deps.isProcessAlive(endpoint.bridgeOwnerPid) : undefined;
  const companionAlive = endpoint.companionPid ? deps.isProcessAlive(endpoint.companionPid) : undefined;
  const issues: string[] = [];
  if (endpoint.kind !== "codex") {
    issues.push(msg("endpoint.issue.kind", { kind: endpoint.kind, adapter: "codex" }));
  }
  if (!sameWorkspacePath(endpoint.cwd, options.cwd)) {
    issues.push(msg("endpoint.issue.cwd", { cwd: options.cwd }));
  }
  if (!reachable) {
    issues.push(msg("endpoint.issue.port", { port }));
  }
  if (bridgeOwnerAlive === false) {
    issues.push(msg("endpoint.issue.ownerDead", { pid: endpoint.bridgeOwnerPid ?? msg("none") }));
  }
  if (companionAlive === false) {
    issues.push(msg("endpoint.issue.companionDead", { pid: endpoint.companionPid ?? msg("none") }));
  }
  if (endpoint.companionStatus === "stopped" || endpoint.companionStatus === "error") {
    issues.push(msg("endpoint.issue.workerStatus", { status: endpoint.companionStatus }));
  }
  const status: DoctorStatus = issues.length > 0 ? "warn" : "ok";
  lines.push(row(statusTag(status), label, msg("endpoint.summary", {
    instanceId: endpoint.instanceId,
    kind: endpoint.kind,
    port,
    reachable: reachable ? msg("yes") : msg("no"),
  })));
  lines.push(detail(msg("endpoint.owner", {
    ownerPid: endpoint.bridgeOwnerPid ?? msg("none"),
    ownerAlive: formatAlive(bridgeOwnerAlive),
    companionPid: endpoint.companionPid ?? msg("none"),
    companionAlive: formatAlive(companionAlive),
    status: endpoint.companionStatus ?? msg("unknown"),
  })));
  for (const issue of issues) {
    lines.push(detail(msg("issue", { issue })));
  }
}

export async function buildDoctorReport(
  options: BuildDoctorReportOptions = {},
  rawDeps: DoctorDeps = {},
): Promise<string[]> {
  const deps = resolveDeps(rawDeps);
  const doctorOptions = parseDoctorCliArgs(options.argv ?? process.argv.slice(2), options.cwd ?? process.cwd());
  const lines: string[] = [];

  lines.push(msg("title"));
  section(lines, msg("section.environment"));
  lines.push(row(STATE_OK, msg("label.node"), deps.nodeVersion));
  lines.push(row(STATE_OK, msg("label.platform"), `${deps.platform}-${deps.arch}`));

  if (deps.platform === "win32") {
    const release = deps.osRelease();
    const build = parseInt(release.split(".").pop() ?? "0", 10);
    const ok = build >= 18309;
    lines.push(row(ok ? STATE_OK : STATE_FAIL, msg("label.winBuild"), ok ? String(build) : `${build} ${msg("winBuildConpty")}`));
    const codePage = deps.getWindowsCodePage();
    if (codePage !== null) {
      const dataDirHasNonAscii = containsNonAscii(deps.resolveDataDir());
      const risky = codePage !== 65001 && dataDirHasNonAscii;
      lines.push(row(risky ? STATE_WARN : STATE_OK, msg("label.codePage"), risky ? msg("codePage.nonAsciiWarning", { codePage }) : String(codePage)));
    }
  }

  const proxyUrl = pickProxyEnvValue(deps.env);
  const serverDate = await deps.fetchServerDate();
  if (serverDate) {
    lines.push(row(STATE_OK, msg("label.connectivity"), msg("connectivity.ok", { baseUrl: DEFAULT_BASE_URL })));
    const skewMs = deps.now() - serverDate.getTime();
    const skewSeconds = Math.round(Math.abs(skewMs) / 1000);
    const clockOk = Math.abs(skewMs) <= CLOCK_SKEW_WARN_MS;
    lines.push(row(clockOk ? STATE_OK : STATE_WARN, msg("label.clock"), clockOk ? msg("clock.ok", { skewSeconds }) : msg("clock.skewWarning", { skewSeconds })));
  } else {
    lines.push(row(STATE_WARN, msg("label.connectivity"), proxyUrl && deps.env.NODE_USE_ENV_PROXY !== "1" ? msg("connectivity.proxyHint", { baseUrl: DEFAULT_BASE_URL, proxy: proxyUrl }) : msg("connectivity.unreachable", { baseUrl: DEFAULT_BASE_URL })));
  }

  section(lines, msg("section.adapterCli"));
  const codexPath = deps.findExecutable("codex");
  lines.push(row(codexPath ? STATE_OK : STATE_FAIL, "Codex CLI", codexPath ?? msg("adapterCli.notFound", { optional: "" })));

  section(lines, msg("section.data"));
  const dataDir = deps.resolveDataDir();
  const dataDirExists = deps.exists(dataDir);
  lines.push(row(dataDirExists ? STATE_OK : STATE_FAIL, msg("label.dataDir"), dataDirExists ? dataDir : `${dataDir} ${msg("dataDirMissing")}`));
  const credFile = path.join(dataDir, "account.json");
  const credExists = deps.exists(credFile);
  lines.push(row(credExists ? STATE_OK : STATE_FAIL, msg("label.credentials"), credExists ? msg("credentialsFound") : msg("credentialsMissing")));

  section(lines, msg("section.runtime"));
  lines.push(fieldRow(msg("label.mode"), msg("mode.bridge")));
  lines.push(fieldRow(msg("label.cwd"), doctorOptions.cwd));
  lines.push(fieldRow(msg("label.adapter"), "codex"));
  lines.push("");

  const lock = appendBridgeLockLines(lines, doctorOptions, dataDir, deps);
  await appendEndpointSummary(
    lines,
    msg("label.workspaceEndpoint", { adapter: "codex" }),
    deps.readLocalClientEndpoint(doctorOptions.cwd),
    doctorOptions,
    lock,
    deps,
  );
  lines.push("");
  return lines;
}

export async function runDoctorCheck(argv: string[] = process.argv.slice(2)): Promise<void> {
  const lines = await buildDoctorReport({ argv });
  process.stdout.write(lines.join("\n") + "\n");
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(
      [
        "Usage: codex-wechat-doctor [--cwd <path>]",
        "",
        "Checks Codex WeChat bridge environment, credentials, lock and endpoint state.",
        "",
      ].join("\n"),
    );
    return;
  }
  await runDoctorCheck(process.argv.slice(2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
