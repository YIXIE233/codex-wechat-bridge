# AGENTS.md

## 项目边界

这是纯 Codex 微信桥：

- 微信侧使用 iLink 机器人通道。
- Codex 侧只使用 `codex app-server` WebSocket JSON-RPC。
- 不支持 Claude、OpenCode、Shell。
- 不保留 adapter factory、runtime host、daemon slot、companion、PTY。

## 目录

- `src/cli`: 命令入口。
- `src/service`: 微信消息循环、状态、Codex/微信编排。
- `src/codex`: Codex app-server 子进程、WebSocket RPC、thread/turn/approval 处理。
- `src/wechat`: 微信登录、轮询、收发、附件。

## 开发要求

- 不重新引入多后端抽象。
- 不增加一对一工厂或 adapter 壳子。
- 真实边界才允许独立模块：微信 API、Codex RPC、子进程、磁盘状态。
- 改完运行：
  - `tsc -p tsconfig.typecheck.src.json --noEmit --pretty false`
  - `tsc -p tsconfig.build.json`
  - `eslint bin src`
