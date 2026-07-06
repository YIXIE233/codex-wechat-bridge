# codex-wechat-bridge

从 `CLI-WeChat-Bridge` 机械抽取出的 Codex-only 微信桥。

## 范围

- 微信消息进入 Codex。
- Codex 输出、审批请求、用户输入请求、最终回复转发回微信。
- 保留原版 Codex runtime / WeChat transport 核心逻辑。
- 不包含外部 inject/socket 入口、定时器、自动化层或非 Codex CLI。

## 命令

```powershell
pnpm install
pnpm run build
pnpm run bridge -- --cwd D:\path\to\project
```

首次登录或登录失效时：

```powershell
pnpm run setup
```

发布后的 bin 名称：

```powershell
codex-wechat-setup
codex-wechat-bridge --cwd D:\path\to\project
```

## 当前能力边界

这是 Codex-only standalone bridge，不包含原版 `wechat-daemon`、非 Codex
adapter、外部 inject/socket 入口或定时器自动化层。

它保留原版 Codex 路径的三个入口：

- `codex-wechat-bridge` / `wechat-bridge-codex`：启动微信 ↔ Codex 桥。
- `wechat-codex`：打开连接到当前桥的原生 Codex TUI。
- `wechat-codex-start`：启动/复用桥并打开原生 Codex TUI。

`wechat-codex` 里的 `/resume`、模型选择等能力走 Codex 原生 TUI；微信侧不重造
这些 picker。

## 当前微信侧能力

- 普通文本：发送给 Codex。
- 图片/文件：下载到本地入站附件目录，并把本地路径传给 Codex。
- Codex 输出：转发 stdout/stderr/status/notice/thinking/final reply。
- Codex final reply 尾部 `wechat-attachments` 代码块：支持发送
  `image`、`file`、`voice`、`video`。
- `/stop`：中断当前 Codex turn。
- `/status`：查看桥和 Codex 状态。
- `/new`：新建 Codex thread。
- `/reset`：重置 Codex worker。
- `/confirm`、`/deny`：响应当前 Codex 权限请求。
- `/answer ...`：响应 Codex 用户输入请求。
- `/resume`：微信侧禁用；请在 `wechat-codex` 的原生 Codex TUI 中使用
  `/resume`，桥会跟随当前活动 thread。

## 验证

```powershell
pnpm run lint
pnpm run typecheck:src
pnpm run build
```
