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

## 当前微信侧能力

- 普通文本：发送给 Codex。
- `/stop`：中断当前 Codex turn。
- `/status`：查看桥和 Codex 状态。
- `/new`：新建 Codex thread。
- `/confirm`、`/confirm all`、`/deny`：响应 Codex 权限请求。
- `/answer ...`：响应 Codex 用户输入请求。

## 验证

```powershell
pnpm run lint
pnpm run typecheck:src
pnpm run build
```
