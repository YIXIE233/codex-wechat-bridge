# I18n layer audit

Baseline: upstream `2f1ba83` (fix(bridge): resolve WeChat attachment paths platform-independently), package v1.1.1; V4 `45cc780`.

## Files reviewed

| File | Lines | Codex-only decision | Reason |
|---|---:|---|---|
| `src/i18n/index.ts` | 43 | KEEP | Locale selection by `CLI_BRIDGE_LANG` is adapter-independent. |
| `src/i18n/messages-en.ts` | 142 | CODEX_ONLY_REWRITE | English strings for bridge welcome, bindings and doctor should be retained with non-Codex strings removed. |
| `src/i18n/messages-zh.ts` | 142 | CODEX_ONLY_REWRITE | Chinese strings same as above. |

## Finding

V4 currently inlines many messages. Under least-delete extraction, i18n should be restored because it supports doctor, bindings and user-facing startup diagnostics, all of which are pure-Codex useful.
