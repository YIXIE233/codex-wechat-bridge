# Utils / diagnostics / update audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/utils/doctor.ts` | 888 | KEEP/CODEX_ONLY_REWRITE | Pure Codex deployments need environment, credential, iLink, clock, lock, endpoint and Codex CLI diagnostics. Remove Claude/OpenCode CLI checks unless daemon retained. |
| `src/utils/version-checker.ts` | 253 | KEEP/CODEX_ONLY_REWRITE | Package update checking is not adapter-specific. Retarget package/repo names if fork/package differs. |
| `src/commands/check-update.ts` | 63 | KEEP/CODEX_ONLY_REWRITE | User-facing update command; useful for Codex-only package if published/deployed. |
| `scripts/ensure-node-pty-permissions.mjs` | 73 | DROP or DEFER | Codex path does not depend on node-pty. Keep only if package still depends on node-pty for retained features. |
| `scripts/smoke-global-install.mjs` | 396 | KEEP/CODEX_ONLY_REWRITE | Packaging smoke test remains useful; remove non-Codex binary checks. |
| `scripts/publish-dual.mjs` | 311 | DEFER_EXPLICITLY | Publishing workflow may be useful only if maintaining dual package release. |

## Doctor capabilities to retain for Codex-only

- Node version and platform checks.
- Windows build/code page risk checks where paths may include non-ASCII.
- iLink connectivity and clock skew checks.
- Data dir and credentials checks.
- Codex CLI executable check.
- Bridge lock/stale lock/reclaimability checks.
- Workspace Codex endpoint reachability and owner/client health checks.
- Proxy hint when iLink cannot be reached behind proxy.

## Update checker capabilities to retain

- `wechat-check-update` or renamed Codex-only binary.
- Non-blocking startup check if desired.
- Cache under data dir.
- npm registry first, GitHub tags fallback, timeout-safe failure.
