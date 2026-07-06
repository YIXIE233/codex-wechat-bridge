# Bridge layer audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/bridge/bridge-adapters.codex.ts` | 3094 | KEEP/CODEX_ONLY_REWRITE | This is the core Codex app-server runtime: RPC, thread/turn, approvals, local TUI following, final reply settlement and session log fallback. It should be moved/renamed only mechanically. |
| `src/bridge/bridge-adapters.shared.ts` | 1925 | CODEX_ONLY_REWRITE | Contains Codex shared constants/functions plus Claude/OpenCode helpers. Split or mechanically retain Codex-relevant pieces; do not rewrite lighter substitutes. |
| `src/bridge/bridge-adapter-common.ts` | 125 | CODEX_ONLY_REWRITE | Shared RPC/path/spawn helpers used by Codex. Keep Codex-used helpers. |
| `src/bridge/wechat-bridge.ts` | 1661 | CODEX_ONLY_REWRITE | Main event loop, welcome, polling, message routing, emoji bindings, output forwarding, deferred Codex queue and send retries. Remove non-Codex adapter branches but keep shared behavior. |
| `src/bridge/bridge-utils.ts` | 1802 | CODEX_ONLY_REWRITE | Status, slash command parsing, prompt building, final reply parsing, approval/user-input formatting, risk checks, chunking. Keep all Codex-useful utilities; remove Claude/OpenCode/Shell-only wording only when truly unused. |
| `src/bridge/bridge-final-reply.ts` | 78 | KEEP | Long text chunking and final attachment sending are Codex-relevant. |
| `src/bridge/bridge-state.ts` | 544 | CODEX_ONLY_REWRITE | State, lock, shared session restore, runtime ownership and bounded logs are Codex-relevant. Multi-adapter compatibility can be narrowed but not replaced with a light state model. |
| `src/bridge/bridge-controller.ts` | 62 | CODEX_ONLY_REWRITE | Endpoint sync and controller glue are Codex-relevant for visible TUI attachment. Remove provider abstraction only after behavior parity. |
| `src/bridge/bridge-process-reaper.ts` | 538 | CODEX_ONLY_REWRITE | Codex still needs peer bridge detection, stale lock/process cleanup, Windows/POSIX probing and kill tree. Remove only daemon/OpenCode-specific probes if daemon/OpenCode are excluded. |
| `src/bridge/bridge-types.ts` | 226 | CODEX_ONLY_REWRITE | Types should narrow to Codex runtime while preserving event/state semantics. |
| `src/bridge/bridge-adapters.claude.ts` | 1434 | DROP | Claude-specific PTY/hook adapter. |
| `src/bridge/claude-hooks.ts` | 496 | DROP | Claude hook protocol only. |
| `src/bridge/claude-hook.ts` | 100 | DROP | Claude hook runtime only. |
| `src/bridge/bridge-adapters.opencode.ts` | 3048 | DROP | OpenCode-specific server/SSE adapter. |
| `src/bridge/bridge-adapters.shell.ts` | 456 | DROP unless explicit debug scope | Shell adapter is not Codex. Some risk helpers may already live in `bridge-utils`; do not keep the shell runtime. |
| `src/bridge/bridge-adapters.core.ts` | 1004 | CODEX_ONLY_REWRITE/DEFER | Local companion proxy lifecycle is useful if Codex-only daemon/companion lifecycle is retained; otherwise retain only endpoint health/status behavior needed by `wechat-codex`. |
| `src/bridge/bridge-adapters.ts` | 30 | DROP generic factory | Replace with direct Codex runtime creation; no multi-adapter selector. |

## Codex-relevant behavior that must survive

- WebSocket JSON-RPC app-server lifecycle, reconnect and error reporting.
- Thread creation/resume, startup restoration, local thread follow after native `/resume`.
- Turn ownership: distinguish WeChat-origin and local-origin turns.
- Deferred inbound queue when local Codex is busy.
- Approval handling: command execution, file change, permissions, unsupported server tool fallbacks, strict approval env.
- User input handling: numeric/label/custom/multi-question `/answer` parsing.
- Final reply settlement and session log fallback to avoid premature or missing final replies.
- Output forwarding: stdout/stderr/status/notice/thinking/final/task failed/fatal/session/thread switch.
- Attachment guidance and `wechat-attachments` protocol.
- Welcome message and emoji binding management from upstream standalone bridge.
- Send retries and stale context token logging.

## Current V4 risk areas

- V4 has a smaller `bridge-process-reaper.ts` than upstream; audit suggests some Codex-relevant stale process cleanup was cut.
- V4 removed upstream emoji binding calls from `wechat-bridge.ts`.
- V4 removed update-check timer and doctor hook from bridge startup.
- V4 has no i18n layer, so upstream binding/doctor/welcome text is not mechanically retained.
