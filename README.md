# Codex WeChat Bridge

一个最小但完整的纯 Codex 微信服务：微信消息进入本地 `codex app-server`，Codex 最终回复再发回微信。

## 特点

- 只支持 Codex。
- 使用 Codex 原生 `app-server` WebSocket JSON-RPC。
- 使用微信 iLink 机器人通道收发消息。
- 没有 Claude / OpenCode / Shell 后端。
- 没有多 agent daemon、companion、PTY、adapter factory。

## 安装

```bash
npm install
npm run build
```

## 登录微信

```bash
codex-wechat-setup
```

凭据默认保存在：

```text
~/.codex-wechat-bridge/account.json
```

可用环境变量修改数据目录：

```bash
CODEX_WECHAT_BRIDGE_DATA_DIR=/path/to/data
```

## 启动

```bash
codex-wechat-bridge --cwd /path/to/workspace
```

常用参数：

```text
--cwd <path>                 Codex 工作区
--codex <command>            Codex 命令；默认优先用 ~/.codex/plugins/.plugin-appserver/codex(.exe)，否则用 PATH 里的 codex
--profile <name>             Codex profile
--approval-policy <policy>   默认 on-request
--sandbox <mode>             默认 workspace-write
--authorized-user <id>       可选，预设唯一可交互的微信用户
```

## 微信侧基础命令

```text
/status
/stop
/confirm
/deny
/answer <text>
/resume <thread-id>
```

## 诊断

```bash
codex-wechat-doctor
```

## Codex 协议 smoke

用于验证 `codex app-server`、WebSocket RPC、`thread/start`、`turn/start` 和 final answer。

```bash
CODEX_WECHAT_CODEX_COMMAND=/path/to/codex npm run smoke:codex
```

## 许可

AGPL-3.0-or-later。项目基于 `UNLINEARITY/CLI-WeChat-Bridge` 改造。
