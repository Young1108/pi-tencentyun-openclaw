# 验收记录

更新时间：2026-08-28 19:59 CST
执行者：Codex

| 检查项 | 预期 | 状态 | 证据 |
|---|---|---|---|
| Node/Pi/OpenClaw 已安装 | 指定版本可执行 | ✅ 通过 | Node 24.15.0、Pi 0.84.3、OpenClaw 2026.7.1-2 |
| Gateway 服务 | systemd 用户服务运行，回环监听 18789 | ✅ 通过 | `openclaw gateway status` 显示 `Connectivity probe: ok` |
| Pi 模型调用 | Pi 可调用默认 DeepSeek 模型 | ✅ 通过 | `pi --no-tools -p` 返回预期文本 |
| 微信通道 | `openclaw-weixin` 已登录且 running | ⏳ 等待用户扫码 | `openclaw channels login --channel openclaw-weixin` 已输出二维码 |
| 精确路由 | 微信私聊绑定到 `pi-wechat` | ⏳ 待微信登录后写入 | 需要新 accountId |
| 端到端回复 | 微信文字消息收到 Pi 回复 | 待用户发送测试消息 | 通道日志与微信结果 |

## 已知启动恢复

首次 Gateway 安装时，紧接着的状态探针与启动迁移并发，导致 `state_leases` 中出现短期 `startup-migrations/global` 租约并触发自动重启。确认没有存活 Gateway 进程后，仅删除该单条过期前租约并重启服务；未重置配置、凭据或会话。恢复后 Gateway 连接探针正常。
