# Contributing

本仓库目标是最小但完整的纯 Codex 微信服务。

## 不接受的方向

- 重新加入 Claude / OpenCode / Shell 后端。
- 重新加入 adapter factory / runtime host / daemon slot / companion / PTY。
- 为单一 Codex 后端新增一对一抽象壳。

## 开发检查

```bash
eslint bin src
tsc -p tsconfig.typecheck.src.json --noEmit --pretty false
tsc -p tsconfig.build.json
```

## 提交说明

保留 AGPL-3.0-or-later 许可和上游 `UNLINEARITY/CLI-WeChat-Bridge` 来源说明。
