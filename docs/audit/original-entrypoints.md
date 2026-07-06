# Original entrypoints

Baseline: `2f1ba83`

## Published binaries

| Binary | Target | Codex-only decision | Notes |
|---|---|---|---|
| `wechat-bridge` | `bin/wechat-bridge.mjs` | DROP generic selector; keep codex-specific binary | Binary entrypoint |
| `wechat-bridge-codex` | `bin/wechat-bridge-codex.mjs` | KEEP | Binary entrypoint |
| `wechat-codex` | `bin/wechat-codex.mjs` | KEEP | Binary entrypoint |
| `wechat-codex-start` | `bin/wechat-codex-start.mjs` | KEEP | Binary entrypoint |
| `wechat-claude` | `bin/wechat-claude.mjs` | DROP | Binary entrypoint |
| `wechat-claude-start` | `bin/wechat-claude-start.mjs` | DROP | Binary entrypoint |
| `wechat-bridge-claude` | `bin/wechat-bridge-claude.mjs` | DROP | Binary entrypoint |
| `wechat-bridge-shell` | `bin/wechat-bridge-shell.mjs` | DROP | Binary entrypoint |
| `wechat-bridge-opencode` | `bin/wechat-bridge-opencode.mjs` | DROP | Binary entrypoint |
| `wechat-opencode` | `bin/wechat-opencode.mjs` | DROP | Binary entrypoint |
| `wechat-opencode-start` | `bin/wechat-opencode-start.mjs` | DROP | Binary entrypoint |
| `wechat-daemon` | `bin/wechat-daemon.mjs` | CODEX_ONLY_REWRITE or DEFER_EXPLICITLY | Binary entrypoint |
| `wechat-setup` | `bin/wechat-setup.mjs` | KEEP | Binary entrypoint |
| `wechat-check-update` | `bin/wechat-check-update.mjs` | KEEP | Binary entrypoint |

## Package scripts

| Script | Command | Codex-only decision |
|---|---|---|
| `postinstall` | `node scripts/ensure-node-pty-permissions.mjs` | KEEP/ADAPT |
| `clean` | `node -e "require('node:fs').rmSync('dist', { recursive: true, force: true })"` | KEEP/ADAPT |
| `build` | `npm run clean && tsc -p tsconfig.build.json` | KEEP/ADAPT |
| `prepack` | `npm run build` | KEEP/ADAPT |
| `lint` | `eslint bin src test` | KEEP/ADAPT |
| `lint:fix` | `eslint bin src test --fix` | KEEP/ADAPT |
| `typecheck:src` | `tsc -p tsconfig.typecheck.src.json --noEmit --pretty false` | KEEP/ADAPT |
| `quality` | `npm run lint && npm run typecheck:src && bun test test && npm run build` | KEEP/ADAPT |
| `smoke:global` | `node scripts/smoke-global-install.mjs` | KEEP/ADAPT |
| `publish:dual` | `node scripts/publish-dual.mjs` | DEFER_EXPLICITLY |
| `setup` | `node --no-warnings --experimental-strip-types src/wechat/setup.ts` | KEEP/ADAPT |
| `start` | `node --no-warnings --experimental-strip-types src/wechat/wechat-channel.ts` | DEFER_EXPLICITLY (WeChat MCP mode) |
| `check` | `node --no-warnings --experimental-strip-types src/wechat/wechat-channel.ts --check` | KEEP/ADAPT |
| `bridge` | `node --no-warnings --experimental-strip-types src/bridge/wechat-bridge.ts` | KEEP/ADAPT to Codex-only bridge |
| `daemon` | `node --no-warnings --experimental-strip-types src/daemon/wechat-daemon.ts` | CODEX_ONLY_REWRITE or DEFER_EXPLICITLY |
| `bridge:codex` | `node --no-warnings --experimental-strip-types src/bridge/wechat-bridge.ts --adapter codex` | KEEP/ADAPT |
| `codex:panel` | `node --no-warnings --experimental-strip-types src/companion/codex-remote-client.ts` | KEEP/ADAPT |
| `codex:start` | `node --no-warnings --experimental-strip-types src/companion/local-companion-start.ts` | KEEP/ADAPT |
| `claude:start` | `node --no-warnings --experimental-strip-types src/companion/local-companion-start.ts --adapter claude` | DROP |
| `claude:companion` | `node --no-warnings --experimental-strip-types src/companion/local-companion.ts --adapter claude` | DROP |
| `bridge:claude` | `node --no-warnings --experimental-strip-types src/bridge/wechat-bridge.ts --adapter claude` | DROP |
| `bridge:shell` | `node --no-warnings --experimental-strip-types src/bridge/wechat-bridge.ts --adapter shell` | DROP |
| `bridge:opencode` | `node --no-warnings --experimental-strip-types src/bridge/wechat-bridge.ts --adapter opencode` | DROP |
| `opencode:panel` | `node --no-warnings --experimental-strip-types src/companion/local-companion.ts --adapter opencode` | DROP |
| `opencode:start` | `node --no-warnings --experimental-strip-types src/companion/local-companion-start.ts --adapter opencode` | DROP |
| `bridge:bun` | `bun src/bridge/wechat-bridge.ts` | KEEP/ADAPT to Codex-only dev bridge |
| `test` | `bun test test` | KEEP/ADAPT to retained tests |
| `test:bridge` | `bun test test/bridge` | KEEP/ADAPT to retained bridge tests |
| `test:companion` | `bun test test/companion` | KEEP/ADAPT to retained Codex local-client tests |
| `test:wechat` | `bun test test/wechat` | KEEP/ADAPT |
| `test:watch` | `bun test --watch test` | KEEP/ADAPT |
