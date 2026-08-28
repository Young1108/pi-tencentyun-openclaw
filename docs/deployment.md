# 部署步骤

更新时间：2026-08-29 02:31 CST
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
3. 迁移 Pi 的非敏感配置、历史会话、用户包、Skill 和扩展；DeepSeek 认证沿用服务器已有凭据。
4. 安装并启动 Gateway 的 systemd 用户服务。
5. 在腾讯云终端执行 `openclaw channels login --channel openclaw-weixin` 并扫码。
6. 读取新微信 accountId，写入 `account + channel + peer` binding。
7. 对 `openclaw-weixin@2.4.6` 应用 `scripts/patch-weixin-acp-binding.mjs`，补齐 ACP session binding 适配并重启 Gateway。
8. 从微信发送测试消息，确认创建的是 Pi/ACPX session，随后停止本机同账号通道，完成切换。

## Pi 状态与资源同步

迁移范围按“可复用运行资源”和“设备/凭据状态”拆分：

- 已同步：`~/.pi/agent/AGENTS.md`、`settings.json`、模型清单、信任配置、29 个本机 JSONL 会话，以及 `~/.pi/packages/` 下的本地包。
- 已同步：本机 Pi 的 npm 清单和锁文件，并在服务器执行依赖安装；`pi list` 显示 7 个用户包。
- 已隔离同步：旧轻量桥 `~/.local/share/pi-wechat-bridge/pi-session/` 下的 4 个会话，目标目录为 `/home/ubuntu/.pi/agent/sessions/--local-pi-wechat-bridge--/`。
- 已同步备用 profile：`~/.pi/qwen-agent/`（排除 `auth.json`）及其 1 个会话、Skill Git 仓库；可用 `PI_CODING_AGENT_DIR=/home/ubuntu/.pi/qwen-agent pi list` 查看。
- 已同步非敏感辅助资源：`~/.pi/remote/`、`~/.pi/examples/` 和 `mcp-cache.json`；本地 `pi-acp/session-map.json` 未复制，因为其中包含本机绝对路径，由服务器 ACPX 自己生成映射。
- 未同步：本机 `.env`、`mcp.json`、微信/Gateway token、私钥和旧桥 `tasks.json`。这些内容要在服务器按需单独授权，不能进入 Git 或普通迁移包。

本次同步前的远端快照为 `/home/ubuntu/.pi-migration-backups/20260829-022734/pi-before-sync.tgz`。需要回滚时先停止依赖 Pi 会话的进程，再将该归档解压回 `/home/ubuntu/.pi`；回滚后重新执行下面的 `pi list`、Skill 和会话导出检查。

服务器复验命令：

```bash
ssh tencent 'pi list'
ssh tencent 'find /home/ubuntu/.pi/agent/sessions -type f -name "*.jsonl" | wc -l'
ssh tencent 'pi --export /home/ubuntu/.pi/agent/sessions/<session>.jsonl /tmp/pi-session.html'
```

Skill 验证使用 `pi --no-session --no-tools --skill <SKILL.md> -p <prompt>`；扩展验证使用 `pi --no-session --no-tools --extension <extension> --help`。Skill 是按需加载，未显式选择时不会把所有 Skill 内容注入提示词。

依赖安装记录：本机锁文件与服务器 npm 解析结果存在缺项，首次 `npm ci --omit=dev` 报 lock mismatch；随后在远端执行 `npm install --omit=dev --no-audit --no-fund` 完成解析并写回锁文件。后续锁文件稳定后可恢复使用 `npm ci`。

## 微信 ACP 适配

该版本的微信插件可以登录并回复，但不会自动把配置的 ACP binding 物化为 ACP session。部署脚本只支持当前已验证的 `@tencent-weixin/openclaw-weixin@2.4.6`，并在改写前备份插件源码：

```bash
openclaw plugins inspect openclaw-weixin
node /home/ubuntu/workspace/pi-openclaw/patch-weixin-acp-binding.mjs <上一步显示的Install-path>
systemctl --user restart openclaw-gateway.service
```

升级插件后必须重新运行检查；版本或源码结构不匹配时脚本会失败，此时不要跳过验证强行覆盖。

## 不迁移的运行状态

- 微信账号 token、同步游标与 context token
- Gateway token
- OpenClaw SQLite 数据库和 OpenClaw 自身历史 session（Pi JSONL 会话另行同步）
- 本机 macOS LaunchAgent 与旧 Python 轻量桥任务文件

这样可以避免把旧设备状态、重复长轮询或失效会话带入服务器。
