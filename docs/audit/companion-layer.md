# Companion / local client layer audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/companion/codex-remote-client.ts` | 185 | KEEP | Pure Codex visible TUI connector; builds remote args and env token. |
| `src/companion/local-companion-start.ts` | 659 | CODEX_ONLY_REWRITE | Start/reuse/switch/auto-heal launcher is useful for Codex. Remove Claude/OpenCode adapter branches but keep decision logic, daemon delegation decision only if daemon is retained. |
| `src/companion/local-companion-link.ts` | 410 | CODEX_ONLY_REWRITE | Endpoint file protocol, occupancy, health and IPC are Codex-relevant for `wechat-codex` and launcher auto-heal. Narrow multi-adapter endpoint naming but keep metadata. |
| `src/companion/local-companion.ts` | 566 | DROP for current standalone Codex, or CODEX_ONLY_REWRITE if daemon/lifecycle supervisor retained | It is mainly Claude/OpenCode companion entry; Codex uses `codex-remote-client`. Reconnection concepts may be relevant only if Codex-only daemon keeps local client supervision. |
| `src/runtime/runtime-types.ts` | 51 | CODEX_ONLY_REWRITE | Local client endpoint protocol and auth token env are Codex-relevant. |
| `src/runtime/create-runtime-host.ts` | 16 | CODEX_ONLY_REWRITE | Small runtime host wrapper; keep only if architecture still needs host abstraction. |
| `src/runtime/legacy-adapter-runtime.ts` | 66 | DROP or CODEX_ONLY_REWRITE | Adapter wrapper exists for multi-adapter daemon integration. Pure Codex can call runtime directly unless Codex-only daemon reuses runtime interface. |

## Findings

- The Codex visible-client path is a first-class original feature, not a V4 invention. It must remain the official way to use Codex native TUI commands such as `/resume`.
- `local-companion-start.ts` contains important behavior beyond adapter selection: same-workspace idempotency, different-workspace switch, visible-client health auto-restart, timeout handling, forwarded CLI args and credential preflight.
- Least-delete extraction should not replace the launcher with a minimal script. It should mechanically narrow the original launcher to Codex.
