# Codex-only parity checklist

Must pass before goal completion:

- [x] No production file without an original source-map entry.
- [x] `wechat-bridge-codex --help` works.
- [x] `wechat-codex --help` works.
- [x] `wechat-codex-start --help` works.
- [x] `codex-wechat-bridge --help` works.
- [x] `codex-wechat-setup --help` works.
- [x] `codex-wechat-daemon --help` works.
- [x] `codex-wechat-doctor --help` works.
- [x] `codex-wechat-mcp --check` works without starting MCP stdio loop.
- [x] bridge writes a Codex endpoint for the current workspace.
- [x] `wechat-codex` reads that endpoint and builds original remote Codex args.
- [x] `wechat-codex-start` starts/reuses bridge, waits for endpoint, and opens visible Codex.
- [x] Codex-only daemon keeps original useful lifecycle behavior: IPC endpoint, stale daemon cleanup, single-bridge takeover, visible Codex launch, approval/input/final forwarding.
- [x] WeChat MCP keeps original useful tools for status/fetch/reply/notify/send media/reset.
- [x] Codex CLI args after launcher options pass through to visible Codex.
- [x] `companion_bound` lifecycle and parent-watch behavior match original Codex usage.
- [x] WeChat `/resume` remains disabled and points to visible Codex native `/resume`.
- [x] Emoji bindings retain original binding behavior with Codex-only defaults.
- [x] No Claude/OpenCode/Shell/inject/automation production paths.
- [x] No new lightweight substitute service/client/endpoint implementation.
- [x] `pnpm run lint` passes.
- [x] `pnpm run typecheck:src` passes.
- [x] `pnpm run test` passes.
- [x] `pnpm run build` passes.
- [x] `pnpm pack` succeeds and package bin entries target `dist`.

Evidence: lint/typecheck/test/build/pack and bin help checks passed on 2026-07-07.
