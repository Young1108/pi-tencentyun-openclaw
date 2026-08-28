# 验收记录

更新时间：2026-08-29 02:19 CST
执行者：Codex

| 检查项 | 预期 | 状态 | 证据 |
|---|---|---|---|
| Node/Pi/OpenClaw 已安装 | 指定版本可执行 | ✅ 通过 | Node 24.15.0、Pi 0.84.3、OpenClaw 2026.7.1-2 |
| Gateway 服务 | systemd 用户服务运行，回环监听 18789 | ✅ 通过 | `openclaw gateway status` 显示 `Connectivity probe: ok` |
| Pi 模型调用 | Pi 可调用默认 DeepSeek 模型 | ✅ 通过 | `pi --no-tools -p` 返回预期文本 |
| 微信通道 | `openclaw-weixin` 已登录且 running | ✅ 通过 | 扫码完成，`openclaw channels status` 显示 `enabled, configured, running` |
| 精确 binding 配置 | 指定微信私聊配置到 `pi-wechat` | ✅ 已写入 | `channel + accountId + peer + type: acp` 均已写入运行配置 |
| 微信普通回复 | 私聊进入通道并得到回复 | ✅ 通过 | 入站后 DeepSeek 请求返回 HTTP 200，持久会话记录存在 assistant 回复 |
| 微信 ACP 适配 | 该私聊能物化为 ACPX/Pi session | ✅ 已部署，⏳ 待触发 | `scripts/patch-weixin-acp-binding.mjs` 已通过语法检查、远端已应用并重启 Gateway |
| 端到端 Pi 回复 | 微信文字由 Pi ACPX 处理并返回 | ⏳ 待用户发送补丁后的测试消息 | 需要 ACP session/Pi 日志与微信收到回复的双重证据 |

## 已知启动恢复

首次 Gateway 安装时，紧接着的状态探针与启动迁移并发，导致 `state_leases` 中出现短期 `startup-migrations/global` 租约并触发自动重启。确认没有存活 Gateway 进程后，仅删除该单条过期前租约并重启服务；未重置配置、凭据或会话。恢复后 Gateway 连接探针正常。

## 最后验收动作

从已扫码的微信私聊发送：`只回复：腾讯云 Pi ACPX 已接管。`。验收时同时检查：

1. 微信收到回应。
2. Gateway 日志出现 ACPX/Pi 会话创建或复用记录。
3. 新会话不再只是 `provider=deepseek` 的 OpenClaw 原生 transcript。
