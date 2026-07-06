# V4 gap analysis

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

This report compares the least-delete audit against current V4. “Present” means a plausible mapped file exists; it does not by itself prove behavior parity.

| Original feature/file | Audit decision | V4 status | Gap | Suggested source/action |
|---|---|---|---|---|
| `src/bridge/bridge-adapter-common.ts` | CODEX_ONLY_REWRITE | present as `src/codex/codex-runtime-common.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-adapters.codex.ts` | CODEX_ONLY_REWRITE | present as `src/codex/codex-runtime.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-adapters.shared.ts` | CODEX_ONLY_REWRITE | present as `src/codex/codex-runtime-shared.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-controller.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/bridge-controller.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-final-reply.ts` | KEEP | present as `src/bridge/bridge-final-reply.ts` | Need behavior-level diff/audit | Compare against upstream latest and re-apply platform-independent attachment path fix where relevant. |
| `src/bridge/bridge-process-reaper.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/bridge-process-reaper.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-state.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/bridge-state.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-types.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/bridge-types.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/bridge/bridge-utils.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/bridge-utils.ts` | Need behavior-level diff/audit | Compare against upstream latest and re-apply platform-independent attachment path fix where relevant. |
| `src/bridge/wechat-bridge.ts` | CODEX_ONLY_REWRITE | present as `src/bridge/wechat-bridge.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/commands/check-update.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/companion/codex-remote-client.ts` | KEEP | present as `src/codex/codex-remote-client.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/companion/local-companion-link.ts` | CODEX_ONLY_REWRITE | present as `src/codex/local-client-link.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/companion/local-companion-start.ts` | CODEX_ONLY_REWRITE | present as `src/codex/codex-start.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/daemon/daemon-link.ts` | DEFER_EXPLICITLY | missing | Feature absent from V4 | Document explicit deferral or drop. |
| `src/daemon/emoji-bindings.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/daemon/wechat-daemon.ts` | DEFER_EXPLICITLY | missing | Feature absent from V4 | Document explicit deferral or drop. |
| `src/i18n/index.ts` | KEEP | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/i18n/messages-en.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/i18n/messages-zh.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/runtime/runtime-types.ts` | CODEX_ONLY_REWRITE | present as `src/codex/runtime-types.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/utils/doctor.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/utils/version-checker.ts` | CODEX_ONLY_REWRITE | missing | Feature absent from V4 | Restore from upstream and Codex-only narrow. |
| `src/wechat/channel-config.ts` | CODEX_ONLY_REWRITE | present as `src/wechat/channel-config.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/wechat/setup.ts` | KEEP | present as `src/wechat/setup.ts` | Need behavior-level diff/audit | Keep mapped file, audit removed branches against retention matrix. |
| `src/wechat/wechat-channel.ts` | DEFER_EXPLICITLY | missing | Feature absent from V4 | Document explicit deferral or drop. |
| `src/wechat/wechat-transport.ts` | KEEP | present byte-identical | No file-level gap | Keep mapped file, audit removed branches against retention matrix. |

## High-priority V4 gaps

1. Restore `src/daemon/emoji-bindings.ts` and standalone bridge integration with Codex-only defaults.
2. Restore Codex-only doctor and a binary/script entry for it.
3. Restore i18n messages needed by bindings, welcome and doctor.
4. Restore/update Codex-relevant process reaper behavior.
5. Reconcile current V4 files against upstream latest `2f1ba83`, especially attachment path parsing changes.
6. Decide explicitly on Codex-only daemon and WeChat MCP server before implementing them.
