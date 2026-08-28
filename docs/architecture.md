# 架构说明

更新时间：2026-08-28 19:59 CST
执行者：Codex

## 1. 两代微信接入方案

```mermaid
flowchart TB
    subgraph Legacy[旧：Mac 本机轻量桥]
        LWX[ClawBot Gateway] --> LB[Python bridge.py]
        LB --> RPC[Pi RPC 子进程]
        RPC --> LPI[Pi]
        LB --> TASK[JSON 任务持久化]
        LPI --> CAP[tool_result 12k 字符截断]
    end

    subgraph Target[新：腾讯云官方通道]
        TWX[微信] --> PLUGIN[openclaw-weixin]
        PLUGIN --> GW[OpenClaw Gateway]
        GW --> ACPX[ACPX persistent agent]
        ACPX --> TPI[Pi]
        TPI --> API[DeepSeek API]
    end
```

旧桥的关键补偿逻辑是：系统唤醒后重连、Pi 卡住检测与重启、任务重试、JSON 任务恢复、以及将单轮工具结果限制为 12,000 字符。官方通道替代了微信收发和会话调度；Pi 仍应避免大范围 `find`、`grep` 输出，以降低模型续答超时风险。

## 2. 消息与执行数据流

```mermaid
sequenceDiagram
    participant U as 微信用户
    participant C as openclaw-weixin
    participant G as OpenClaw Gateway
    participant A as ACPX/Pi
    participant M as DeepSeek API
    participant F as 腾讯云工作目录

    U->>C: 发送文字
    C->>G: 通道事件
    G->>A: 按 account + channel + peer binding 路由
    A->>M: 请求模型
    M-->>A: 工具调用或文本
    A->>F: 必要时执行工具
    A->>M: 带工具结果续答
    A-->>G: 最终回复
    G-->>C: 出站消息
    C-->>U: 微信回复
```

## 3. 配置责任边界

| 数据 | 存放位置 | 是否入库 |
|---|---|---|
| OpenClaw 路由、ACPX、会话隔离 | `~/.openclaw/openclaw.json` | 仅模板 |
| 微信登录 token 与同步游标 | `~/.openclaw/openclaw-weixin/` | 否 |
| Pi 模型设置 | `~/.pi/agent/settings.json` | 仅模板 |
| DeepSeek API Key | `~/.pi/agent/auth.json` | 否 |
| Pi 工作文件 | `/home/ubuntu/workspace/pi-openclaw` | 按项目决定 |
| Gateway 日志、会话数据库 | `~/.openclaw/` | 否 |

## 4. 资源预期

腾讯云当前为 4 vCPU / 3.6 GiB 内存。模型计算不发生在服务器上；单用户微信消息的主要资源是 Node Gateway、Pi 子进程和工具执行。现有机器可承担单用户低并发场景，但磁盘余量较小，应持续观察日志和会话增长。
