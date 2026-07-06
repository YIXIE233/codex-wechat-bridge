# WeChat layer audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/wechat/wechat-transport.ts` | 1842 | KEEP | Codex bridge depends on the exact iLink polling, sending, context-token, inbound attachment, outbound media, retry and error-classification behavior. V4 currently keeps this file byte-identical to upstream. |
| `src/wechat/setup.ts` | 380 | KEEP | WeChat login, credential validation, QR flow and owner identity are independent of adapter and required for Codex. |
| `src/wechat/channel-config.ts` | 325 | CODEX_ONLY_REWRITE | Data dir, state files, bounded logs, workspaces, legacy migration, inbound attachments, message claims and emoji binding file are Codex-relevant; daemon and multi-adapter endpoint names need Codex-only reduction rather than deletion of shared state features. |
| `src/wechat/wechat-channel.ts` | 623 | DEFER_EXPLICITLY | This is an independent WeChat MCP server. Pure Codex can use it as MCP tools, but it can compete with bridge polling/sync state. Keep as an explicit optional mode only if product scope includes direct WeChat MCP access. |

## Functional findings

- `wechat-transport.ts` is not merely a helper. It is the full iLink transport layer: long polling, sync cursor, context token cache, inbound de-dup claims, CDN upload/download, media encryption/decryption, send-text/media APIs and retry classification.
- Inbound media support is Codex-relevant: images/files are downloaded under `inbound-attachments/<date>/` and paths are passed into prompts. The bridge itself does not OCR/extract documents; Codex reads the paths.
- Outbound media support is Codex-relevant through `wechat-attachments` final reply protocol and direct transport upload APIs.
- `channel-config.ts` also owns `EMOJI_BINDINGS_FILE` upstream. V4 removed this because it removed emoji bindings; under least-delete rules that file path should return if bindings return.
- `wechat-channel.ts` exposes MCP tools: `wechat_get_status`, `wechat_fetch_messages`, `wechat_reply`, `wechat_notify`, `wechat_send_image`, `wechat_send_file`, `wechat_send_voice`, `wechat_send_video`, `wechat_reset_sync`. These are pure WeChat tools, not adapter-specific. They are useful with Codex but represent a second operation mode.

## Required Codex-only shape

- Keep login/setup/transport behavior as close to upstream as possible.
- Keep all media limits and environment variable support.
- Keep legacy data migration where it affects user credentials, sync state, attachments and workspaces.
- Restore `EMOJI_BINDINGS_FILE` if emoji bindings are restored.
- If MCP server is not retained, document it as `DEFER_EXPLICITLY`, not as “Codex cannot use it”.
