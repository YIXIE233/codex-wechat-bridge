# Daemon layer audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/daemon/emoji-bindings.ts` | 141 | KEEP/CODEX_ONLY_REWRITE | Despite living under daemon, it is shared by standalone bridge and daemon. Pure Codex uses `/confirm`, `/stop`, custom prompt shortcuts. Defaults must be Codex-only. |
| `src/daemon/wechat-daemon.ts` | 2387 | DEFER_EXPLICITLY or CODEX_ONLY_REWRITE | Contains multi-CLI slots, but also Codex-useful lifecycle supervision: persistent WeChat connection, auto open/reuse visible Codex, stale lock cleanup, status, approval all, send retries, output prefixes. Decide product scope explicitly. |
| `src/daemon/daemon-link.ts` | 302 | DEFER_EXPLICITLY or CODEX_ONLY_REWRITE | IPC endpoint protocol for daemon delegation. Needed only if Codex-only daemon/supervisor is retained. |

## Sub-feature decisions

| Sub-feature | Pure Codex usefulness | Decision |
|---|---|---|
| `/codex` active terminal command | Useful in daemon mode as “open/reuse Codex” | CODEX_ONLY_REWRITE if daemon retained |
| `/claude`, `/opencode` | Not useful | DROP |
| Multi-slot map for different adapters | Not useful as multi-adapter; single Codex slot may be useful | CODEX_ONLY_REWRITE |
| Persistent WeChat connection | Useful | DEFER_EXPLICITLY if not implemented now |
| Auto open/reuse visible Codex TUI | Useful | DEFER_EXPLICITLY or CODEX_ONLY_REWRITE |
| Cleanup live/stale single bridge before daemon start | Useful if daemon retained | CODEX_ONLY_REWRITE |
| `/daemon-stop` | Useful only if daemon retained | CODEX_ONLY_REWRITE/DEFER |
| `resolveAllApprovals` on `/confirm` | Codex runtime supports it; standalone does not expose it | DEFER_EXPLICITLY; decide desired semantics |
| Emoji bindings | Useful outside daemon | KEEP |
| Daemon doctor mode | Useful diagnostics | Fold into Codex-only doctor if daemon absent |

## Key correction

Do not classify the whole daemon as “just CLI switching”. It is a lifecycle supervisor plus multi-adapter selector. The selector can be deleted; the supervisor capability is pure-Codex useful but may be explicitly deferred for product simplicity.
