# 验收记录

更新时间：2026-08-29 09:33 CST
执行者：Codex

| 检查项 | 预期 | 状态 | 证据 |
|---|---|---|---|
| Node/Pi/OpenClaw 已安装 | 指定版本可执行 | ✅ 通过 | Node 24.15.0、Pi 0.84.3、OpenClaw 2026.7.1-2 |
| Gateway 服务 | systemd 用户服务运行，回环监听 18789 | ✅ 通过 | `openclaw gateway status` 显示 `Connectivity probe: ok` |
| Pi 模型调用 | Pi 可调用默认 DeepSeek 模型 | ✅ 通过 | `pi --no-tools -p` 返回预期文本 |
| Pi 配置与用户包 | 本机配置、Skill/扩展包在远端可发现 | ✅ 通过 | `pi list` 显示 7/7 个用户包，版本与本机清单一致 |
| Pi 历史会话 | 本机 29 个会话在远端可读取，旧桥会话可单独查看 | ✅ 通过 | 本机缺失数 0；远端有效 JSONL 34 个，其中旧桥目录 4 个 |
| 备用 Pi profile | Qwen profile 的配置、Skill 仓库和会话可读取 | ✅ 通过 | `PI_CODING_AGENT_DIR=... pi list` 显示 3 个包；1 个会话导出 771041 bytes |
| Skill schema | Skill frontmatter 可解析，实际 Skill 可加载 | ✅ 通过 | 5 个 `SKILL.md` 的 `name`/`description` 有效；`eli5`、`skill-creator` 实际加载通过 |
| 扩展 schema | 本机用户扩展可注册 | ✅ 通过 | 5 个扩展使用 `pi --extension ... --help` 全部 PASS |
| 历史会话导出 | 远端可把迁移会话导出为 HTML | ✅ 通过 | 代表会话 `pi --export` 成功，输出 365289 bytes |
| 凭据边界 | 敏感文件不进入迁移包和仓库 | ⚠️ 按设计 | `.env`、`mcp.json`、微信/Gateway token 未复制；MCP 凭据需单独配置 |
| 微信通道 | `openclaw-weixin` 已登录且 running | ✅ 通过 | 扫码完成，`openclaw channels status` 显示 `enabled, configured, running` |
| 精确 binding 配置 | 指定微信私聊配置到 `pi-wechat` | ✅ 已写入 | `channel + accountId + peer + type: acp` 均已写入运行配置 |
| ACP matcher 契约 | 命中返回对象，未命中返回 `null`；旧 v1 可升级 | ✅ 通过 | `node scripts/patch-weixin-acp-binding.test.mjs` |
| 微信普通回复 | 私聊进入通道并得到回复 | ✅ 通过 | 入站后 DeepSeek 请求返回 HTTP 200，持久会话记录存在 assistant 回复 |
| 微信 ACP 适配 | 该私聊能物化为 ACPX/Pi session | ✅ v2 已修复并重启，⏳ 待触发 | matcher 契约测试通过；远端插件已从 v1 升级到 v2，Gateway 已重启 |
| 端到端 Pi 回复 | 微信文字由 Pi ACPX 处理并返回 | ⏳ 待用户发送补丁后的测试消息 | 需要 ACP session/Pi 日志与微信收到回复的双重证据 |

## 已知启动恢复

首次 Gateway 安装时，紧接着的状态探针与启动迁移并发，导致 `state_leases` 中出现短期 `startup-migrations/global` 租约并触发自动重启。确认没有存活 Gateway 进程后，仅删除该单条过期前租约并重启服务；未重置配置、凭据或会话。恢复后 Gateway 连接探针正常。

## 最后验收动作

从已扫码的微信私聊发送：`只回复：腾讯云 Pi ACPX 已接管。`。验收时同时检查：

1. 微信收到回应。
2. Gateway 日志出现 ACPX/Pi 会话创建或复用记录。
3. 新会话不再只是 `provider=deepseek` 的 OpenClaw 原生 transcript。
