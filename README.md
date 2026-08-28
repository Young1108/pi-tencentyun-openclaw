# 腾讯云 Pi + OpenClaw 微信部署学习项目

最后更新：2026-08-29 02:19 CST
执行者：Codex

这个仓库记录将本机轻量微信桥迁移为腾讯云上 **Pi + OpenClaw + 官方微信插件** 的过程。目标是：在微信私聊中直接向 Pi 提问，并让 Pi 在腾讯云工作目录中执行任务。

## 当前目标架构

```mermaid
flowchart LR
    W[微信私聊] --> WX[腾讯微信接口]
    WX --> OC[OpenClaw Gateway\nopenclaw-weixin 2.4.6]
    OC --> ADAPTER[微信 ACP 会话适配层]
    ADAPTER --> ACP[ACPX persistent runtime]
    ACP --> PI[Pi 0.84.3]
    PI --> LLM[DeepSeek API]
    PI --> WS[腾讯云工作目录\n/home/ubuntu/workspace/pi-openclaw]
```

模型推理由外部 API 完成；腾讯云负责微信长轮询、Gateway、Pi 进程、会话和工具执行。因此这不是本地模型部署。

## 当前状态

- ✅ 腾讯云上的 Gateway、微信官方插件、Pi、ACPX 与 DeepSeek 已安装并可用。
- ✅ 微信已扫码登录；插件收到了私聊消息并成功走过 OpenClaw 的模型回复链路。
- ✅ Pi 在服务器工作目录中可直接调用 DeepSeek。
- ✅ 为微信插件 `2.4.6` 部署了 ACP 会话适配层，使指定私聊可映射到 Pi 的持久 ACPX 会话。
- ⏳ 最后一步：需在适配层生效后从微信发送一条新消息，确认日志出现 ACPX/Pi 会话并收到回复。未完成这一步前，不把“微信每条消息由 Pi 执行”写成已验收。

> 发现与取舍：未适配的微信插件只做普通 Agent 路由，配置中的 `type: "acp"` binding 不会被编译成 ACP 会话，因而消息会落到 OpenClaw 内置 Agent。`scripts/patch-weixin-acp-binding.mjs` 只补齐官方插件缺少的会话匹配与 ACP 初始化，不替换其微信登录、长轮询或消息发送实现。

## 为什么从轻量桥切换

原本机方案是 Python `bridge.py`：微信 ClawBot Gateway → Pi RPC，并额外处理睡眠恢复、任务持久化、Pi 重启和工具输出截断。新方案把微信通道和会话路由交给 OpenClaw 官方插件，保留 Pi 作为 Agent 运行时。详细对比见 [架构说明](docs/architecture.md)。

## 原本机方案：轻量微信桥

原方案位于本机 `~/.local/share/pi-wechat-bridge/`，由 macOS LaunchAgent 常驻。它不是一个模型服务，而是一个把微信消息可靠转发给本机 Pi RPC 的小型编排层。

```mermaid
flowchart LR
    U[微信私聊] --> CG[本机 ClawBot Gateway\n127.0.0.1:8765]
    CG --> B[bridge.py\nPython asyncio]
    B --> TS[tasks.json\n任务状态]
    B --> RPC[Pi --mode rpc\nstdin/stdout JSONL]
    RPC --> S[pi-session/\nPi 会话文件]
    RPC --> DS[DeepSeek API]
    B --> CG
    RUN[run.sh + LaunchAgent] -. 监控/拉起 .-> CG
    RUN -. 监控/拉起 .-> B
    CAP[tool-output-cap.js\n12,000 字符上限] -. Pi 扩展 .-> RPC
```

### 组件职责

| 组件 | 作用 | 关键行为 |
|---|---|---|
| `run.sh` | 进程包装与守护 | 启动 ClawBot Gateway；轮询 `127.0.0.1:8765`；Gateway 或桥退出时结束包装进程，由 LaunchAgent 重新拉起整条链路 |
| `bridge.py` `LocalClawBotClient` | 微信 Gateway 客户端 | WebSocket 连接禁用系统代理；回复失败或 Mac 唤醒后强制重连 |
| `bridge.py` `TaskStore` | 任务可靠性 | 用原子替换写 `tasks.json`；记录 `pending/processing/completed/failed`、尝试次数和错误；重启后恢复未完成任务 |
| `bridge.py` `PiRpc` | Pi 进程管理 | 启动 `pi --mode rpc --session-dir ... --approve`；读写 JSONL；600 秒总超时、300 秒无事件卡死检测；异常退出或卡死自动重启 |
| `Bridge` | 消息编排 | 只接收文字；先保存任务，再串行投递 Pi；故障自动重新排队，最多按配置重试；回复失败重连后再发 |
| `tool-output-cap.js` | 上下文控制 | 将单轮工具结果限制为默认 12,000 字符，并提示 Pi 用更精确的查询继续获取信息 |
| `pi-session/` | 会话持久化 | 保存 Pi 的 JSONL 会话，不随微信账号凭据进入 Git |

### 原方案一次消息的生命周期

1. `ClawBot Gateway` 收到私聊，`bridge.py` 校验发送者白名单。
2. `TaskStore.enqueue()` 原子写入 `tasks.json`，任务进入 `pending`。
3. worker 将任务标记为 `processing`，向微信发送“已交给本机 Pi 处理”。
4. `PiRpc.prompt()` 把文本写入 Pi RPC stdin；Pi 的 JSONL stdout 持续返回事件。
5. 收到 `agent_settled` 后保存结果，状态改为 `completed`，并把最多 12,000 字符的结果回复微信。
6. 如果 Pi 卡死、退出或微信回复连接断开，任务回到 `pending`，桥重启/重连后继续处理；达到重试上限则保留任务和错误。

### 原方案的边界

- 只把非空文字传给 Pi；图片或空消息不会进入 Pi，会收到补充文字或文件路径的提示。
- Pi 工作目录是本机 `~/Documents`，可以访问 Mac 文件；迁移到腾讯云后必须改为服务器工作目录，不能继续假设本地文件存在。
- `--approve` 会自动批准 Pi 的确认请求；其他交互请求由桥取消并回告微信。
- 任务状态、Pi 会话、Gateway 日志和 API 凭据都在本机运行目录，重装或清理前需要单独备份。

### 与迁移后方案的对应关系

| 原本机轻量桥 | 腾讯云迁移后的对应物 | 变化 |
|---|---|---|
| ClawBot Gateway + `LocalClawBotClient` | `openclaw-weixin` + OpenClaw Gateway | 微信登录、长轮询和出站发送交给官方插件 |
| `bridge.py` `TaskStore` | OpenClaw session store + ACPX 持久会话 | 不再单独维护 `tasks.json`；必须观察 session 生命周期 |
| `PiRpc` 子进程 | ACPX 启动与管理 Pi | Pi 仍在远端工作目录运行，模型仍由 DeepSeek API 推理 |
| `run.sh` + LaunchAgent | 用户级 `openclaw-gateway.service` | macOS 睡眠恢复逻辑变为服务器 systemd 生命周期 |
| `tool-output-cap.js` | Pi/OpenClaw 工具策略与会话上下文控制 | 当前迁移不自动复制旧扩展；需要长输出场景时再单独启用 |

原桥保留在文档中用于学习和回退设计；服务器上没有复制本机微信凭据、`tasks.json` 或历史 `pi-session`。

## 运行边界

- Pi 会在腾讯云执行命令和读写文件，不能直接操作 Mac 本地文件。
- 微信登录凭据、模型 API Key、Gateway token、SQLite 会话与同步游标不进入本仓库。
- 同一个微信账号切换后，只保留一个正在运行的微信通道实例。

## 文件导航

- [部署步骤](docs/deployment.md)
- [验收记录](docs/acceptance.md)
- [架构与数据流](docs/architecture.md)
- [ACP 适配决策](docs/decisions/001-weixin-acp-binding-compatibility.md)
- [OpenClaw 脱敏配置模板](configs/openclaw.server.patch.json5)
- [Pi 脱敏配置模板](configs/pi-settings.server.json)
- [服务器自检脚本](scripts/verify.sh)
- [微信 ACP 适配补丁](scripts/patch-weixin-acp-binding.mjs)

## 最小验收

1. 腾讯云 Gateway 服务运行且仅监听本机回环地址。
2. `openclaw-weixin` 显示 `running`。
3. 在微信发送 `只回复：腾讯云 Pi ACPX 已接管。`，收到对应回复。
4. 同时确认 Gateway 日志出现 ACP 绑定会话，而不是仅有 `provider=deepseek` 的 OpenClaw 原生会话。
5. 服务器日志没有模型认证失败、通道掉线或 Pi 进程崩溃。

## 复现与升级

服务器上每次重装或升级微信插件后，先通过 `openclaw plugins inspect openclaw-weixin` 确认插件安装目录与版本；仅当版本仍是 `2.4.6` 时运行：

```bash
node /home/ubuntu/workspace/pi-openclaw/patch-weixin-acp-binding.mjs \
  /home/ubuntu/.openclaw/npm/projects/tencent-weixin-openclaw-weixin-7783ac86ba/node_modules/@tencent-weixin/openclaw-weixin
systemctl --user restart openclaw-gateway.service
```

脚本先校验包名、版本和源码锚点，失败时不会写入；首次写入时会在原文件旁保存 `.pre-acp-binding-2.4.6.bak` 备份。新版本必须重新审查并更新脚本，不能盲目复用旧补丁。
