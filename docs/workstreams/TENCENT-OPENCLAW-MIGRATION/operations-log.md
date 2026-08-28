# 操作留痕

更新时间：2026-08-28 20:07 CST
执行者：Codex

| 时间（CST） | 动作 | 工具/命令 | 结果摘要 |
|---|---|---|---|
| 19:59 | 校验配置模板 | `openclaw config patch --dry-run` | schema 与 SecretRef 校验通过 |
| 20:00 | 安装运行时 | 腾讯云 `npm install -g` | Pi 0.84.3、OpenClaw 2026.7.1-2 完成 |
| 20:01 | 迁移最小 Pi 运行配置 | `rsync` / `scp` | 迁移 DeepSeek 配置、认证与扩展，不迁移会话 |
| 20:02 | 安装插件 | `openclaw plugins install` | ACPX 2026.7.1、微信插件 2.4.6 loaded |
| 20:03 | 验证模型调用 | `pi --no-tools -p` | 返回“Pi 模型链路正常。” |
| 20:04 | 安装 Gateway 服务 | `openclaw gateway install/start` | 用户级 systemd 服务已启用 |
| 20:05 | 恢复启动迁移租约 | SQLite 精确删除 `startup-migrations/global` | Gateway 连接探针恢复正常 |
| 20:06 | 发起微信登录 | `openclaw channels login` | 二维码已生成，等待用户扫码 |
