# Codex 功能行为契约

本文件冻结从 fork 原版 `CLI-WeChat-Bridge` 继承下来的 Codex 相关行为。后续重构可以改文件结构、命名和内部嵌套，但不能丢失这些行为。

## 1. 微信入口

- 微信文本消息会被转成 Codex 用户输入。
- 桥启动前的历史 backlog 会被忽略。
- 只接受授权用户的消息。
- Codex 正忙时，新的微信消息不会打断当前 turn；桥按现有队列/延后逻辑处理。
- 支持当前 Codex 微信命令：
  - `/status`
  - `/stop`
  - `/new`
  - `/reset`
  - `/resume`（微信侧禁用；在 `wechat-codex` 原生 Codex TUI 中使用 `/resume`，桥跟随活动 thread）
  - `/confirm`
  - `/deny`
  - `/answer ...`

## 2. Codex runtime / app-server

- 启动 Codex 时启用 `tui_app_server`。
- 为 Codex 传入 remote app-server URL 和 remote auth token env。
- 支持 headless inline 运行，不依赖外部 inject/socket 入口。
- 维护 Codex app-server WebSocket RPC 连接。
- WebSocket 断开时按原版逻辑重连/失败上报。

## 3. Codex thread / turn

- 支持 `thread/start`。
- 支持 `thread/resume`。
- 支持 `turn/start`。
- 支持 `turn/interrupt`。
- 跟踪 active turn id、turn origin、thread/session id。
- 区分微信触发输入和本地 Codex 输入。
- 支持最终回复 settle，避免过早转发不完整 final reply。

## 4. Codex approval / user input

- 支持 command execution approval。
- 支持 file change approval。
- 支持 permissions approval。
- 支持 `/confirm` 和 `/deny` 响应当前 approval。
- 支持 Codex `request_user_input`，并通过 `/answer ...` 回传答案。

## 5. Codex 输出到微信

- 转发可见 stdout/stderr/notice/status。
- 转发 thinking 摘要。
- 转发 final reply。
- 转发 task failed / fatal error。
- 转发 thread/session switched。
- 长文本按微信限制分块发送。
- 发送失败需要记录日志，不静默吞掉。

## 6. 微信附件入站

- 能从微信消息中提取文本、语音转写、图片、文件。
- 能下载微信入站附件并保存到本地入站附件目录。
- 能把附件路径加入给 Codex 的 prompt。
- 当用户要求“看/发/处理图片或文件”时，prompt 中必须明确本地路径可读。

## 7. Codex 附件出站

- Codex final reply 中的尾部 `wechat-attachments` 代码块会被解析。
- 支持出站附件种类：
  - `image`
  - `file`
  - `video`
  - `voice`
- 支持从可见回复中抽取本地绝对路径附件。
- 不允许要求 Codex 复制文件到 outbound attachment staging 目录。

## 8. 状态、锁和恢复

- 保存 bridge state。
- 保存 lock，防止同一工作区重复启动。
- 可回收死进程留下的 stale lock。
- 保留 shared thread/session id，用于后续恢复。
- 读取旧格式状态/锁时，`adapter: "codex"` 应兼容；非 Codex 旧记录应忽略。

## 9. 明确不属于当前桥的范围

- 不包含 Claude。
- 不包含 OpenCode。
- 不包含 shell bridge。
- 不包含 daemon 多 CLI 切换。
- 不包含 daemon 托管的多 CLI companion 层；仅保留 Codex-only 的 `wechat-codex` 原生 TUI 连接入口。
- 不包含外部 inject/socket 自动化入口。
- 不包含定时器或自动化层。
