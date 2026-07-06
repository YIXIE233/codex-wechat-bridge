# V5 implementation plan after full upstream audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Objective

Create the next Codex-only version from upstream `CLI-WeChat-Bridge` using least-delete rules: remove only code that is completely unusable in a pure Codex workflow; Codex-useful shared behavior must be retained or mechanically narrowed.

## Non-negotiable rules

1. Do not write replacement lightweight implementations when upstream code exists.
2. Restore from upstream first, then narrow names/branches to Codex-only.
3. Every removed upstream feature must be listed as `DROP` or `DEFER_EXPLICITLY` in `docs/codex-only-retention-audit.md`.
4. Migrate upstream tests for every retained behavior.
5. Keep commits small and commit after each coherent change.

## Phase 1: align to latest upstream core

- Re-audit V4 mapped files against upstream `2f1ba83`.
- Apply upstream changes such as platform-independent WeChat attachment path resolution.
- Verify: existing tests plus targeted final reply/attachment tests.

## Phase 2: restore standalone shared UX

- Restore `src/daemon/emoji-bindings.ts` or move it to a Codex-neutral path such as `src/wechat/emoji-bindings.ts` while preserving logic.
- Integrate into `src/bridge/wechat-bridge.ts` exactly as upstream standalone bridge does.
- Codex-only default bindings: keep `[OK] -> /confirm`, `[闭嘴] -> /stop`; remove non-Codex defaults.
- Restore welcome message with bindings list.
- Restore tests from upstream binding-related behavior.

## Phase 3: restore diagnostics

- Restore `src/utils/doctor.ts` and i18n messages.
- Narrow CLI checks to Codex and Codex endpoint files.
- Add `codex-wechat-doctor` or support `codex-wechat-bridge --doctor` consistently.
- Verify with port/lock/endpoint fixture tests migrated from upstream `test/utils/doctor.test.ts`.

## Phase 4: restore update checker if package distribution needs it

- Restore `src/utils/version-checker.ts` and `src/commands/check-update.ts`.
- Retarget package name/repo to the fork if this package is published separately; otherwise document disabled update checks.
- Add/keep binary only if desired.

## Phase 5: process/state robustness

- Restore Codex-relevant parts of `bridge-process-reaper.ts`.
- Keep Windows/POSIX process parsing, peer bridge detection and kill tree.
- Remove OpenCode-specific orphan cleanup unless daemon/OpenCode is explicitly retained.

## Phase 6: explicit optional modes

Choose before coding:

- Codex-only daemon/lifecycle supervisor: implement only if we want persistent WeChat connection plus auto open/reuse Codex TUI.
- WeChat MCP server: implement only as separate optional mode with clear warning not to run concurrently with bridge on the same account/sync state.

## Validation gate

- `pnpm run lint`
- `pnpm run typecheck:src`
- `pnpm run test`
- `pnpm run build`
- Help checks for all retained bin entries.
- Manual smoke: setup status, bridge help, codex-start help, emoji binding parse, doctor report generation.

## Stop condition

Do not start feature restoration until the user accepts the retention matrix and chooses decisions for `DEFER_EXPLICITLY` items: Codex-only daemon, WeChat MCP server, update checker publishing behavior.
