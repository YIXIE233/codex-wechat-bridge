# Original inventory

Baseline: `2f1ba83` fix(bridge): resolve WeChat attachment paths platform-independently

| File | Lines | Area | Codex-only relevance (initial) |
|---|---:|---|---|
| `package.json` | 102 | Project config | Partial/needs review |
| `bin/_run-entry.mjs` | 59 | Binary entrypoint | Partial/needs review |
| `bin/wechat-bridge-claude.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-bridge-codex.mjs` | 5 | Binary entrypoint | Partial/needs review |
| `bin/wechat-bridge-opencode.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-bridge-shell.mjs` | 5 | Binary entrypoint | No/debug-only |
| `bin/wechat-bridge.mjs` | 5 | Binary entrypoint | Partial/needs review |
| `bin/wechat-check-update.mjs` | 5 | Binary entrypoint | Yes |
| `bin/wechat-claude-start.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-claude.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-codex-start.mjs` | 5 | Binary entrypoint | Yes |
| `bin/wechat-codex.mjs` | 5 | Binary entrypoint | Yes |
| `bin/wechat-daemon.mjs` | 5 | Binary entrypoint | Partial/needs review |
| `bin/wechat-opencode-start.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-opencode.mjs` | 5 | Binary entrypoint | No/adapter-specific unless shared tests mention Codex |
| `bin/wechat-setup.mjs` | 5 | Binary entrypoint | Yes |
| `src/bridge/bridge-adapter-common.ts` | 125 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-adapters.claude.ts` | 1434 | Non-Codex adapter | No/adapter-specific unless shared tests mention Codex |
| `src/bridge/bridge-adapters.codex.ts` | 3094 | Codex core | Yes |
| `src/bridge/bridge-adapters.core.ts` | 1004 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-adapters.opencode.ts` | 3048 | Non-Codex adapter | No/adapter-specific unless shared tests mention Codex |
| `src/bridge/bridge-adapters.shared.ts` | 1925 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-adapters.shell.ts` | 456 | Non-Codex adapter | No/debug-only |
| `src/bridge/bridge-adapters.ts` | 30 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-controller.ts` | 62 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-final-reply.ts` | 78 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-process-reaper.ts` | 538 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-state.ts` | 544 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-types.ts` | 226 | Bridge shared/core | Partial/needs review |
| `src/bridge/bridge-utils.ts` | 1802 | Bridge shared/core | Partial/needs review |
| `src/bridge/claude-hook.ts` | 100 | Non-Codex adapter | No/adapter-specific unless shared tests mention Codex |
| `src/bridge/claude-hooks.ts` | 496 | Non-Codex adapter | No/adapter-specific unless shared tests mention Codex |
| `src/bridge/wechat-bridge.ts` | 1661 | Bridge shared/core | Partial/needs review |
| `src/commands/check-update.ts` | 63 | Project config | Partial/needs review |
| `src/companion/codex-remote-client.ts` | 185 | Codex core | Yes |
| `src/companion/local-companion-link.ts` | 410 | Companion/launcher shared | Partial/needs review |
| `src/companion/local-companion-start.ts` | 659 | Companion/launcher shared | Partial/needs review |
| `src/companion/local-companion.ts` | 566 | Companion/launcher shared | Partial/needs review |
| `src/daemon/daemon-link.ts` | 302 | Daemon/emoji | Partial |
| `src/daemon/emoji-bindings.ts` | 141 | Daemon/emoji | Yes |
| `src/daemon/wechat-daemon.ts` | 2387 | Daemon/emoji | Partial |
| `src/i18n/index.ts` | 43 | I18n | Yes |
| `src/i18n/messages-en.ts` | 142 | I18n | Yes |
| `src/i18n/messages-zh.ts` | 142 | I18n | Yes |
| `src/runtime/create-runtime-host.ts` | 16 | Runtime shared | Partial/needs review |
| `src/runtime/legacy-adapter-runtime.ts` | 66 | Runtime shared | Partial/needs review |
| `src/runtime/runtime-types.ts` | 51 | Runtime shared | Partial/needs review |
| `src/types/qrcode-terminal.d.ts` | 15 | Project config | Partial/needs review |
| `src/utils/doctor.ts` | 888 | Diagnostics/update | Yes |
| `src/utils/version-checker.ts` | 253 | Diagnostics/update | Yes |
| `src/wechat/channel-config.ts` | 325 | WeChat layer | Yes |
| `src/wechat/setup.ts` | 380 | WeChat layer | Yes |
| `src/wechat/wechat-channel.ts` | 623 | WeChat layer | Yes |
| `src/wechat/wechat-transport.ts` | 1842 | WeChat layer | Yes |
| `test/bridge/bridge-adapters.codex.test.ts` | 38 | Tests | Partial/needs review |
| `test/bridge/bridge-adapters.core.test.ts` | 197 | Tests | Partial/needs review |
| `test/bridge/bridge-adapters.opencode.test.ts` | 3139 | Tests | No/adapter-specific unless shared tests mention Codex |
| `test/bridge/bridge-adapters.test.ts` | 3718 | Tests | Partial/needs review |
| `test/bridge/bridge-controller.test.ts` | 159 | Tests | Partial/needs review |
| `test/bridge/bridge-final-reply.test.ts` | 315 | Tests | Partial/needs review |
| `test/bridge/bridge-process-reaper.test.ts` | 170 | Tests | Partial/needs review |
| `test/bridge/bridge-state.test.ts` | 245 | Tests | Partial/needs review |
| `test/bridge/bridge-utils.test.ts` | 857 | Tests | Partial/needs review |
| `test/bridge/claude-hooks.test.ts` | 462 | Tests | No/adapter-specific unless shared tests mention Codex |
| `test/bridge/wechat-bridge.test.ts` | 320 | Tests | Partial/needs review |
| `test/companion/codex-remote-client.test.ts` | 111 | Tests | Partial/needs review |
| `test/companion/local-companion-link.test.ts` | 207 | Tests | Partial/needs review |
| `test/companion/local-companion-start.test.ts` | 658 | Tests | Partial/needs review |
| `test/companion/local-companion.test.ts` | 35 | Tests | Partial/needs review |
| `test/companion/opencode-entrypoints.test.ts` | 40 | Tests | No/adapter-specific unless shared tests mention Codex |
| `test/daemon/wechat-daemon.test.ts` | 581 | Tests | Partial/needs review |
| `test/README.md` | 13 | Tests | Partial/needs review |
| `test/utils/doctor.test.ts` | 413 | Tests | Partial/needs review |
| `test/utils/version-checker.test.ts` | 143 | Tests | Partial/needs review |
| `test/wechat/channel-config.test.ts` | 244 | Tests | Partial/needs review |
| `test/wechat/setup.test.ts` | 62 | Tests | Partial/needs review |
| `test/wechat/wechat-transport.test.ts` | 310 | Tests | Partial/needs review |
| `docs/architecture.md` | 281 | Docs | Partial/needs review |
| `docs/configuration.md` | 58 | Docs | Partial/needs review |
| `docs/development.md` | 185 | Docs | Partial/needs review |
| `docs/images/animation.webp` | 4084 | Docs | Partial/needs review |
| `docs/images/image-0.png` | 187 | Docs | Partial/needs review |
| `docs/images/image-1.png` | 135 | Docs | Partial/needs review |
| `docs/images/image-10.png` | 1280 | Docs | Partial/needs review |
| `docs/images/image-2.png` | 148 | Docs | Partial/needs review |
| `docs/images/image-3.png` | 1251 | Docs | Partial/needs review |
| `docs/images/image-4.png` | 1253 | Docs | Partial/needs review |
| `docs/images/image-6.png` | 1912 | Docs | Partial/needs review |
| `docs/images/image-7.png` | 1738 | Docs | Partial/needs review |
| `docs/images/image-8.png` | 3453 | Docs | Partial/needs review |
| `docs/images/image-9.png` | 1205 | Docs | Partial/needs review |
| `docs/images/logo.png` | 1519 | Docs | Partial/needs review |
| `docs/images/wechat-tip.png` | 821 | Docs | Partial/needs review |
| `docs/releases/0.2.0.md` | 120 | Docs | Partial/needs review |
| `docs/releases/0.2.0_CN.md` | 119 | Docs | Partial/needs review |
| `docs/releases/0.3.0.md` | 119 | Docs | Partial/needs review |
| `docs/releases/0.3.0_CN.md` | 119 | Docs | Partial/needs review |
| `docs/releases/0.4.0.md` | 92 | Docs | Partial/needs review |
| `docs/releases/0.4.0_CN.md` | 92 | Docs | Partial/needs review |
| `docs/releases/0.5.0.md` | 426 | Docs | Partial/needs review |
| `docs/releases/0.5.0_CN.md` | 426 | Docs | Partial/needs review |
| `docs/releases/0.6.0.md` | 60 | Docs | Partial/needs review |
| `docs/releases/0.6.0_CN.md` | 60 | Docs | Partial/needs review |
| `docs/releases/0.7.0.md` | 132 | Docs | Partial/needs review |
| `docs/releases/0.7.0_CN.md` | 132 | Docs | Partial/needs review |
| `docs/releases/0.8.0.md` | 441 | Docs | Partial/needs review |
| `docs/releases/0.8.0_CN.md` | 418 | Docs | Partial/needs review |
| `docs/releases/0.9.0.md` | 165 | Docs | Partial/needs review |
| `docs/releases/0.9.0_CN.md` | 165 | Docs | Partial/needs review |
| `docs/releases/1.0.0.md` | 153 | Docs | Partial/needs review |
| `docs/releases/1.0.0_CN.md` | 153 | Docs | Partial/needs review |
| `docs/releases/1.0.2.md` | 73 | Docs | Partial/needs review |
| `docs/releases/1.0.2_CN.md` | 73 | Docs | Partial/needs review |
| `docs/releases/1.0.3.md` | 59 | Docs | Partial/needs review |
| `docs/releases/1.0.3_CN.md` | 59 | Docs | Partial/needs review |
| `docs/releases/1.0.4.md` | 93 | Docs | Partial/needs review |
| `docs/releases/1.0.4_CN.md` | 93 | Docs | Partial/needs review |
| `docs/releases/1.0.5.md` | 123 | Docs | Partial/needs review |
| `docs/releases/1.0.5_CN.md` | 123 | Docs | Partial/needs review |
| `docs/releases/1.0.6.md` | 73 | Docs | Partial/needs review |
| `docs/releases/1.0.6_CN.md` | 73 | Docs | Partial/needs review |
| `docs/releases/1.0.7.md` | 88 | Docs | Partial/needs review |
| `docs/releases/1.0.7_CN.md` | 88 | Docs | Partial/needs review |
| `docs/releases/1.0.9.md` | 113 | Docs | Partial/needs review |
| `docs/releases/1.0.9_CN.md` | 113 | Docs | Partial/needs review |
| `docs/releases/1.1.0.md` | 91 | Docs | Partial/needs review |
| `docs/releases/1.1.0_CN.md` | 91 | Docs | Partial/needs review |
| `docs/releases/1.1.1.md` | 59 | Docs | Partial/needs review |
| `docs/releases/1.1.1_CN.md` | 59 | Docs | Partial/needs review |
| `docs/releases/README.md` | 181 | Docs | Partial/needs review |
| `docs/troubleshooting.md` | 234 | Docs | Partial/needs review |
| `scripts/ensure-node-pty-permissions.mjs` | 73 | Release/dev scripts | Partial/needs review |
| `scripts/publish-dual.mjs` | 311 | Release/dev scripts | Partial/needs review |
| `scripts/smoke-global-install.mjs` | 396 | Release/dev scripts | Partial/needs review |
| `AGENTS.md` | 184 | Project config | Partial/needs review |
| `CONTRIBUTING.md` | 225 | Project config | Partial/needs review |
| `LICENSE.txt` | 661 | Project config | Partial/needs review |
| `tsconfig.json` | 30 | Project config | Partial/needs review |
| `tsconfig.build.json` | 17 | Project config | Partial/needs review |
| `tsconfig.typecheck.src.json` | 8 | Project config | Partial/needs review |
| `eslint.config.mjs` | 48 | Project config | Partial/needs review |
