# 部署步骤

更新时间：2026-08-28 19:59 CST
执行者：Codex

## 已锁定版本

- Node.js：24.15.0
- OpenClaw：2026.7.1-2
- ACPX：2026.7.1-2
- Pi：0.84.3
- 腾讯微信插件：2.4.6

## 部署顺序

1. 在腾讯云安装 Pi 与 OpenClaw。
2. 安装 ACPX 和微信插件，应用 `configs/openclaw.server.patch.json5`。
3. 迁移 Pi 的非会话设置、DeepSeek 认证和 `deepseek-responses` 扩展。
4. 安装并启动 Gateway 的 systemd 用户服务。
5. 在腾讯云终端执行 `openclaw channels login --channel openclaw-weixin` 并扫码。
6. 读取新微信 accountId，写入 `account + channel + peer` binding。
7. 从微信发送测试消息，随后停止本机同账号通道，完成切换。

## 不迁移的运行状态

- 微信账号 token、同步游标与 context token
- Gateway token
- OpenClaw SQLite 数据库和历史 session
- 本机 macOS LaunchAgent 与旧 Python 轻量桥任务文件

这样可以避免把旧设备状态、重复长轮询或失效会话带入服务器。
