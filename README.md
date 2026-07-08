# codex-wechat-bridge

从 `CLI-WeChat-Bridge` 按 Codex-only 口径机械抽取、改写和重组出的微信桥。

## 范围

- 微信消息进入 Codex。
- Codex final reply、审批请求、用户输入请求、线程切换、状态/notice 等事件转发回微信；普通 agent delta 默认聚合到 final reply，不逐 token 流式刷屏。
- 保留原版 Codex runtime / WeChat transport / visible TUI companion / daemon / MCP / doctor / update-checker 的 Codex 可用逻辑。
- 删除 Claude、OpenCode、Shell adapter、multi-CLI selector。
- 包含外部 `codex-wechat-send` 投递入口；不包含定时器或自动化调度层。

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
codex-wechat-send --cwd D:\path\to\project --text "hello"
```

## 入口

- `codex-wechat-bridge` / `wechat-bridge-codex`：启动单工作区微信 ↔ Codex 桥。
- `wechat-codex`：打开连接到当前桥的原生 Codex TUI。
- `wechat-codex-start`：启动/复用桥并打开原生 Codex TUI。
- `codex-wechat-daemon`：Codex-only 常驻模式，保留一个微信连接，自动启动/复用 Codex slot 和可见 TUI。
- `codex-wechat-mcp`：可选 MCP 入口，暴露原版 WeChat MCP 工具。
- `codex-wechat-send`：外部入口，把 prompt 投递到正在运行的 bridge，复用微信同一套队列、前台 thread 和转发逻辑；不包含定时器。
- `codex-wechat-doctor`：检查微信凭据、iLink、Codex CLI、锁、endpoint。
- `codex-wechat-check-update`：检查 npm/GitHub 新版本。

## 微信侧能力

- 普通文本：发送给 Codex。
- 图片/文件：下载到本地入站附件目录，并把本地路径传给 Codex。
- Codex 输出：转发 final reply、approval/user-input 请求、thread/session 切换、status/notice；agent delta 默认在 turn 完成后作为 final reply 发送。
- Codex final reply 尾部 `wechat-attachments` 代码块：支持发送 `image`、`file`、`voice`、`video`。
- `/stop`：中断当前 Codex turn。
- `/status`：查看桥或 daemon 状态。
- `/new`：新建 Codex thread。
- `/reset`：重置 Codex worker。
- `/resume`：微信侧恢复 thread；无参数列当前工作区候选，`/resume --all` 列所有工作区候选，`/resume <thread-id>` 直接切换。当前 Codex busy 时拒绝切换。
- `/confirm`、`/deny`：响应当前 Codex 权限请求。
- `/answer ...`：响应 Codex 用户输入请求。
- `//queue`、`//drop <n>`、`//clear-queue`：管理 bridge 普通消息队列。
- `//steer <text>`：对当前 active turn 发送 app-server `turn/steer` 引导。
- `//begin`、`//end`、`//cancel`：微信拼接模式，收集多条文本/图片/文件后作为一个 prompt 发送。
- `/bindings`、`/bind [emoji] cmd`、`/unbind [emoji]`：原版 emoji command binding。
- daemon 模式额外支持 `/codex` 和 `/daemon-stop`。

## 外部入口

```powershell
codex-wechat-send --cwd D:\path\to\project --text "hello"
codex-wechat-send --cwd D:\path\to\project --file prompt.md
codex-wechat-send --cwd D:\path\to\project --thread <thread-id> --foreground --text "run workflow"
```

- 不指定 `--thread`：等价于在微信向当前 foreground thread 发消息。
- 指定 `--thread` 且不同于当前 foreground：必须带 `--foreground`。
- 当前 Codex busy 时，外部入口进入同一套 bridge 队列。

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
