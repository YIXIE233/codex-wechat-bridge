# Codex-only faithful extraction source map

Hard rule: production code must be copied, mechanically rewritten, or recomposed from `D:\Users\Administrator\Desktop\定投\research\wechat-codex-bridges\CLI-WeChat-Bridge`. No from-scratch substitute implementations are allowed.

Allowed changes:
- remove non-Codex branches;
- fix imports and target paths;
- rename adapter abstractions to Codex-only names;
- keep original behavior and data formats where Codex uses them;
- add thin bin wrappers only.

Disallowed changes:
- new lightweight Codex client/service/endpoint implementations;
- inject/automation/socket entrypoints;
- daemon/emoji/multi-CLI behavior;
- Claude/OpenCode/Shell production paths.

| Target file | Original source | Required handling |
| --- | --- | --- |
| src/codex/codex-runtime.ts | src/bridge/bridge-adapters.codex.ts + bridge-adapters.core.ts PTY pieces | Already extracted; audit against original Codex behavior. |
| src/codex/codex-runtime-shared.ts | src/bridge/bridge-adapters.shared.ts | Already extracted; keep Codex helpers only. |
| src/codex/codex-runtime-common.ts | src/bridge/bridge-adapter-common.ts | Already extracted; keep Codex RPC/path helpers. |
| src/codex/runtime-types.ts | src/runtime/runtime-types.ts | Keep Codex runtime endpoint fields only. |
| src/bridge/wechat-bridge.ts | src/bridge/wechat-bridge.ts | Codex-only rewrite; restore lifecycle and endpoint sync from original. |
| src/bridge/bridge-controller.ts | src/bridge/bridge-controller.ts | Copy original logic, change BridgeAdapter to CodexRuntime only. |
| src/bridge/bridge-types.ts | src/bridge/bridge-types.ts | Keep Codex/WeChat state and event types only. |
| src/bridge/bridge-utils.ts | src/bridge/bridge-utils.ts | Keep Codex command mapping, forwarding text, approval, input, attachment, and safety helpers only. |
| src/bridge/bridge-state.ts | src/bridge/bridge-state.ts | Keep Codex state, lock, lifecycle, and legacy-Codex compatibility only. |
| src/bridge/bridge-final-reply.ts | src/bridge/bridge-final-reply.ts | Keep original final reply and attachment wrapping used by Codex forwarding. |
| src/codex/local-client-link.ts | src/companion/local-companion-link.ts | Copy original endpoint logic, remove non-Codex branches only. |
| src/codex/codex-remote-client.ts | src/companion/codex-remote-client.ts | Copy original logic, only import/path/name adjustments. |
| src/codex/codex-start.ts | src/companion/local-companion-start.ts | Copy original launcher logic, keep Codex path, remove daemon/non-Codex branches. |
| src/bridge/bridge-process-reaper.ts | src/bridge/bridge-process-reaper.ts | Restore generic/Codex bridge process cleanup; remove OpenCode-specific orphan cleanup. |
| src/wechat/channel-config.ts | src/wechat/channel-config.ts | Keep account/sync/state/workspace endpoint paths and migration needed by Codex bridge. |
| src/wechat/setup.ts | src/wechat/setup.ts | Keep WeChat login/setup flow, rename user-facing package commands. |
| src/wechat/wechat-transport.ts | src/wechat/wechat-transport.ts | Keep WeChat polling/sending/attachment transport used by Codex bridge. |
| src/types/qrcode-terminal.d.ts | src/types/qrcode-terminal.d.ts | Keep type shim. |
| scripts/ensure-node-pty-permissions.mjs | scripts/ensure-node-pty-permissions.mjs | Copy original. |
| bin/_run-entry.mjs | bin/_run-entry.mjs | Copy original runner, rename package messages. |
| bin/codex-wechat-bridge.mjs | bin/wechat-bridge-codex.mjs | Thin alias wrapper to dist bridge. |
| bin/codex-wechat-setup.mjs | bin/wechat-setup.mjs | Thin alias wrapper to dist setup. |
| bin/wechat-bridge-codex.mjs | bin/wechat-bridge-codex.mjs | Copy original wrapper, adapt dist target if needed. |
| bin/wechat-codex.mjs | bin/wechat-codex.mjs | Copy original wrapper, adapt dist target if needed. |
| bin/wechat-codex-start.mjs | bin/wechat-codex-start.mjs | Copy original wrapper, adapt dist target if needed. |
| bin/wechat-setup.mjs | bin/wechat-setup.mjs | Copy original wrapper. |
| package.json | package.json | Remove non-Codex bins/deps/scripts and add Codex-only aliases/postinstall. |
| README.md | README.md | Replace original broad docs with Codex-only usage. |
