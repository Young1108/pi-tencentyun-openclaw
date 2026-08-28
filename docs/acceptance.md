# 验收记录

更新时间：2026-08-28 19:59 CST
执行者：Codex

| 检查项 | 预期 | 状态 | 证据 |
|---|---|---|---|
| Node/Pi/OpenClaw 已安装 | 指定版本可执行 | 待执行 | 部署命令输出 |
| Gateway 服务 | systemd 用户服务运行，回环监听 18789 | 待执行 | `openclaw gateway status` |
| 微信通道 | `openclaw-weixin` 已登录且 running | 待用户扫码 | `openclaw channels status` |
| 精确路由 | 微信私聊绑定到 `pi-wechat` | 待微信登录后写入 | `openclaw config get bindings` |
| 端到端回复 | 微信文字消息收到 Pi 回复 | 待用户发送测试消息 | 通道日志与微信结果 |
