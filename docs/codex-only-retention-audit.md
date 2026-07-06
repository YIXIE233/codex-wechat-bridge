# Codex-only retention audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Rule

Default decision is **keep**. Delete only when a feature is proven to be completely unusable in a pure Codex workflow. Multi-CLI structures must be narrowed to Codex-only instead of being deleted when they contain Codex-useful lifecycle, diagnostics or UX behavior.

Decision meanings:

- `KEEP`: retain behavior with only naming/path/package edits.
- `CODEX_ONLY_REWRITE`: keep the Codex-useful behavior while mechanically removing non-Codex branches.
- `DROP`: remove because it is purely Claude/OpenCode/Shell/generic selector code.
- `DEFER_EXPLICITLY`: useful for pure Codex, but optional enough that product scope must explicitly include or exclude it.

## Source file retention matrix

| Original file | Lines | Decision | Reason |
|---|---:|---|---|
| `src/bridge/bridge-adapter-common.ts` | 125 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-adapters.claude.ts` | 1434 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/bridge-adapters.codex.ts` | 3094 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-adapters.core.ts` | 1004 | DEFER_EXPLICITLY | Local companion proxy lifecycle is useful only if a Codex-only daemon/lifecycle supervisor is retained; otherwise current Codex standalone path does not need this adapter proxy. |
| `src/bridge/bridge-adapters.opencode.ts` | 3048 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/bridge-adapters.shared.ts` | 1925 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-adapters.shell.ts` | 456 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/bridge-adapters.ts` | 30 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/bridge-controller.ts` | 62 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-final-reply.ts` | 78 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |
| `src/bridge/bridge-process-reaper.ts` | 538 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-state.ts` | 544 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-types.ts` | 226 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/bridge-utils.ts` | 1802 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/bridge/claude-hook.ts` | 100 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/claude-hooks.ts` | 496 | DROP | Functionality is exclusively Claude/OpenCode/Shell/generic adapter selection and has no pure Codex use. |
| `src/bridge/wechat-bridge.ts` | 1661 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/commands/check-update.ts` | 63 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/companion/codex-remote-client.ts` | 185 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |
| `src/companion/local-companion-link.ts` | 410 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/companion/local-companion-start.ts` | 659 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/companion/local-companion.ts` | 566 | DEFER_EXPLICITLY | Pure Codex can use this, but it is an optional mode/lifecycle layer requiring explicit product decision. |
| `src/daemon/daemon-link.ts` | 302 | DEFER_EXPLICITLY | Pure Codex can use this, but it is an optional mode/lifecycle layer requiring explicit product decision. |
| `src/daemon/emoji-bindings.ts` | 141 | CODEX_ONLY_REWRITE | Shared by original standalone bridge and daemon; supports Codex /confirm, /stop and custom prompt shortcuts. |
| `src/daemon/wechat-daemon.ts` | 2387 | DEFER_EXPLICITLY | Contains multi-CLI selector plus Codex-useful lifecycle supervisor; split only after scope decision. |
| `src/i18n/index.ts` | 43 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |
| `src/i18n/messages-en.ts` | 142 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/i18n/messages-zh.ts` | 142 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/runtime/create-runtime-host.ts` | 16 | DEFER_EXPLICITLY | Pure Codex can use this, but it is an optional mode/lifecycle layer requiring explicit product decision. |
| `src/runtime/legacy-adapter-runtime.ts` | 66 | DEFER_EXPLICITLY | Pure Codex can use this, but it is an optional mode/lifecycle layer requiring explicit product decision. |
| `src/runtime/runtime-types.ts` | 51 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/types/qrcode-terminal.d.ts` | 15 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |
| `src/utils/doctor.ts` | 888 | CODEX_ONLY_REWRITE | Diagnostics are valuable for Codex-only deployments: credentials, iLink, clock, lock, endpoint and Codex CLI checks. |
| `src/utils/version-checker.ts` | 253 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/wechat/channel-config.ts` | 325 | CODEX_ONLY_REWRITE | Pure Codex still uses part/all of this file; remove non-Codex branches mechanically, do not replace with a lightweight substitute. |
| `src/wechat/setup.ts` | 380 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |
| `src/wechat/wechat-channel.ts` | 623 | DEFER_EXPLICITLY | MCP server is useful with Codex but competes with bridge sync cursor; keep only as explicit optional mode. |
| `src/wechat/wechat-transport.ts` | 1842 | KEEP | Adapter-independent or directly Codex runtime functionality; preserve behavior as close to upstream as possible. |

## Feature-level conclusions

### Must keep or restore

- WeChat login/setup and transport, including context token, sync cursor, inbound de-dup, media upload/download and send error classification.
- Codex app-server runtime, visible Codex TUI remote client, `wechat-codex-start` launcher and native TUI thread-follow behavior.
- Bridge state/lock/endpoint management, including stale/reclaimable lock behavior and workspace-specific state.
- Approval and `request_user_input` handling, strict approval environment switch and automatic low-risk approval logic.
- Final reply forwarding, long text chunking, inline/local attachment extraction and trailing `wechat-attachments` block.
- Original standalone bridge emoji bindings, Codex-only defaults and `/bind` `/unbind` `/bindings`.
- Codex-only doctor diagnostics.
- Update checker if this fork/package is distributed or deployed long-term.
- i18n layer for welcome/bindings/doctor/user-facing messages.
- Codex-relevant process reaper behavior.

### Drop

- Claude adapter, hooks and trust/config logic.
- OpenCode adapter, SDK/SSE/session logic.
- Shell adapter runtime.
- Generic adapter factory and non-Codex binary wrappers.

### Explicitly decide

- Codex-only daemon/lifecycle supervisor. It is not “just CLI switching”; it contains persistent WeChat connection, auto open/reuse Codex TUI, cleanup and status behavior.
- WeChat MCP server. It is useful with Codex but must not silently run alongside the bridge because both consume WeChat sync state.
