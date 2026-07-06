# codex-wechat-bridge

从 `CLI-WeChat-Bridge` 按 Codex-only 口径机械抽取、改写和重组出的微信桥。

## 范围

- 微信消息进入 Codex。
- Codex 输出、thinking、审批请求、用户输入请求、最终回复转发回微信。
- 保留原版 Codex runtime / WeChat transport / visible TUI companion / daemon / MCP / doctor / update-checker 的 Codex 可用逻辑。
- 删除 Claude、OpenCode、Shell adapter、multi-CLI selector。
- 不包含外部 inject/socket 入口、定时器或自动化层。

## 常用命令

```powershell
pnpm install
pnpm run build
pnpm run setup
pnpm run bridge -- --cwd D:\path\to\project
```

发布后的 bin 名称：

```powershell
codex-wechat-setup
codex-wechat-bridge --cwd D:\path\to\project
wechat-bridge-codex --cwd D:\path\to\project
wechat-codex --cwd D:\path\to\project
wechat-codex-start --cwd D:\path\to\project
codex-wechat-daemon --cwd D:\path\to\project
codex-wechat-doctor --cwd D:\path\to\project
codex-wechat-check-update
codex-wechat-mcp --check
```

## 入口

- `codex-wechat-bridge` / `wechat-bridge-codex`：启动单工作区微信 ↔ Codex 桥。
- `wechat-codex`：打开连接到当前桥的原生 Codex TUI。
- `wechat-codex-start`：启动/复用桥并打开原生 Codex TUI。
- `codex-wechat-daemon`：Codex-only 常驻模式，保留一个微信连接，自动启动/复用 Codex slot 和可见 TUI。
- `codex-wechat-mcp`：可选 MCP 入口，暴露原版 WeChat MCP 工具。
- `codex-wechat-doctor`：检查微信凭据、iLink、Codex CLI、锁、endpoint。
- `codex-wechat-check-update`：检查 npm/GitHub 新版本。

## 微信侧能力

- 普通文本：发送给 Codex。
- 图片/文件：下载到本地入站附件目录，并把本地路径传给 Codex。
- Codex 输出：转发 stdout/stderr/status/notice/thinking/final reply。
- Codex final reply 尾部 `wechat-attachments` 代码块：支持发送 `image`、`file`、`voice`、`video`。
- `/stop`：中断当前 Codex turn。
- `/status`：查看桥或 daemon 状态。
- `/new`：新建 Codex thread。
- `/reset`：重置 Codex worker。
- `/confirm`、`/deny`：响应当前 Codex 权限请求。
- `/answer ...`：响应 Codex 用户输入请求。
- `/bindings`、`/bind [emoji] cmd`、`/unbind [emoji]`：原版 emoji command binding。
- `/resume`：微信侧禁用；请在 `wechat-codex` 原生 Codex TUI 中使用 `/resume`，桥会跟随当前活动 thread。
- daemon 模式额外支持 `/codex` 和 `/daemon-stop`。

## MCP 工具

`codex-wechat-mcp` 保留原版 WeChat MCP 能力：

- `wechat_get_status`
- `wechat_fetch_messages`
- `wechat_reply`
- `wechat_notify`
- `wechat_send_image`
- `wechat_send_file`
- `wechat_send_voice`
- `wechat_send_video`
- `wechat_reset_sync`

## 验证

```powershell
pnpm run lint
pnpm run typecheck:src
pnpm run test
pnpm run build
```
