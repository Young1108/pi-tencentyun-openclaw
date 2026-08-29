# 操作留痕

更新时间：2026-08-29 09:33 CST
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
| 2026-08-29 02:19 | 完成微信登录与运行时核验 | `openclaw channels status`、`openclaw gateway status` | 微信通道为 running，Gateway 连通探针通过 |
| 2026-08-29 02:19 | 识别 ACP 路由缺口 | 插件与会话记录只读检查 | 普通微信入站落到 OpenClaw 内置 DeepSeek 会话，未物化 Pi ACPX session |
| 2026-08-29 02:19 | 部署版本锁定的 ACP 适配 | `patch-weixin-acp-binding.mjs`、`systemctl --user restart` | 微信插件 2.4.6 源码已备份并补齐 binding/初始化；Gateway 探针恢复正常 |
| 2026-08-29 02:31 | 同步本机 Pi 状态 | 远端备份 `20260829-022734`、tar 流同步、npm 依赖安装 | 29 个本机会话缺失数 0；旧轻量桥 4 个会话隔离到独立目录；`pi list` 显示 7 个用户包 |
| 2026-08-29 02:31 | 同步辅助 Pi 资源 | tar 流同步 `qwen-agent`（排除 `auth.json`）、`remote`、`examples`、`mcp-cache.json` | 备用 profile 1 个会话可导出；remote-pi Skill 哈希与本机一致；未复制本机绝对路径 ACP map |
| 2026-08-29 02:31 | 验证 Skill/扩展 schema | 远端 `pi --skill`、`pi --extension ... --help` | 5 个 `SKILL.md` frontmatter 合法；2 个 Skill 实际加载通过；5 个扩展加载检查通过 |
| 2026-08-29 02:31 | 验证历史会话 | 远端 `pi --export` | 代表性迁移 JSONL 成功导出为 365289 bytes HTML |
| 2026-08-29 02:31 | 清理同步旁车文件 | 精确查找并删除远端 `.pi` 下 `._*` | AppleDouble 文件从 12 个清理为 0；未触碰其他文件 |
| 2026-08-29 09:33 | 修复 ACP binding matcher | 本地契约测试、远端 v1→v2 补丁升级、`systemctl --user restart` | matcher 返回对象/null；Pi agent 回归返回 `ACP_HEALTH_OK`；Gateway 探针恢复正常 |
