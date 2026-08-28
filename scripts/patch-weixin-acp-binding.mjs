#!/usr/bin/env node

/**
 * 为 openclaw-weixin 2.4.6 补齐官方 ACP 持久绑定所需的通道适配。
 *
 * 插件仍负责微信收发；本补丁仅将已配置的指定私聊转换为 OpenClaw 的
 * ACP session key，并在首条消息前确保 Pi/ACPX 会话已创建。
 * 每次上游插件升级后必须重新运行，脚本会对未知版本的源码拒绝写入。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [pluginRootArg] = process.argv.slice(2);

if (!pluginRootArg) {
  console.error("用法：node patch-weixin-acp-binding.mjs /绝对路径/openclaw-weixin");
  process.exit(2);
}

const pluginRoot = resolve(pluginRootArg);
const channelFile = resolve(pluginRoot, "dist/src/channel.js");
const processMessageFile = resolve(pluginRoot, "dist/src/messaging/process-message.js");
const packageFile = resolve(pluginRoot, "package.json");

if (!existsSync(channelFile) || !existsSync(processMessageFile) || !existsSync(packageFile)) {
  console.error(`未找到预期的微信插件目录：${pluginRoot}`);
  process.exit(2);
}

const packageMetadata = JSON.parse(readFileSync(packageFile, "utf8"));
if (packageMetadata.name !== "@tencent-weixin/openclaw-weixin" || packageMetadata.version !== "2.4.6") {
  console.error("仅支持 @tencent-weixin/openclaw-weixin@2.4.6；请为新版本更新补丁。");
  process.exit(1);
}

const channelSource = readFileSync(channelFile, "utf8");
const processMessageSource = readFileSync(processMessageFile, "utf8");
const marker = "openclaw-weixin ACP persistent-binding patch v1";
const bindingMarker = "compileConfiguredBinding: ({ conversationId }) => ({ conversationId })";

const channelPatched = channelSource.includes(bindingMarker);
const processMessagePatched = processMessageSource.includes(marker);

if (channelPatched && processMessagePatched) {
  console.log(`补丁已存在：${pluginRoot}`);
  process.exit(0);
}

if (channelPatched || processMessagePatched) {
  console.error("检测到不完整的 ACP 补丁；请从 .pre-acp-binding-2.4.6.bak 备份恢复后重试。");
  process.exit(1);
}

const importAnchor = 'import { logger } from "../util/logger.js";';
const routeAnchor = `    const route = deps.channelRuntime.routing.resolveAgentRoute({
        cfg: deps.config,
        channel: "openclaw-weixin",
        accountId: deps.accountId,
        peer: { kind: "direct", id: ctx.To },
    });`;
const configAnchor = `    config: {
        listAccountIds: (cfg) => listWeixinAccountIds(cfg),`;

if (!channelSource.includes(configAnchor) ||
    !processMessageSource.includes(importAnchor) ||
    !processMessageSource.includes(routeAnchor)) {
  console.error("微信插件源码与 2.4.6 预期结构不一致；已拒绝写入。请先适配新版本。");
  process.exit(1);
}

const acpImport = `
// ${marker}
import { ensureConfiguredAcpBindingReady, resolveConfiguredAcpBindingRecord } from "openclaw/plugin-sdk/core";`;
const patchedRoute = `    const baseRoute = deps.channelRuntime.routing.resolveAgentRoute({
        cfg: deps.config,
        channel: "openclaw-weixin",
        accountId: deps.accountId,
        peer: { kind: "direct", id: ctx.To },
    });
    const configuredBinding = resolveConfiguredAcpBindingRecord({
        cfg: deps.config,
        channel: "openclaw-weixin",
        accountId: deps.accountId,
        conversationId: ctx.To,
    });
    const configuredSessionKey = configuredBinding?.record.targetSessionKey?.trim();
    let route = baseRoute;
    if (configuredBinding && configuredSessionKey) {
        const readiness = await ensureConfiguredAcpBindingReady({
            cfg: deps.config,
            configuredBinding,
        });
        if (!readiness.ok) {
            logger.error(\`ACP binding unavailable for peer=\${ctx.To}: \${readiness.error ?? "unknown error"}\`);
            return;
        }
        route = {
            ...baseRoute,
            agentId: configuredBinding.spec.agentId,
            sessionKey: configuredSessionKey,
        };
    }`;
const bindingCapability = `    bindings: {
        compileConfiguredBinding: ({ conversationId }) => ({ conversationId }),
        matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) =>
            compiledBinding.conversationId === conversationId ||
            compiledBinding.conversationId === parentConversationId,
    },
`;

let patchedChannel = channelSource.replace(configAnchor, `${bindingCapability}${configAnchor}`);
let patchedProcessMessage = processMessageSource.replace(importAnchor, `${importAnchor}${acpImport}`);
patchedProcessMessage = patchedProcessMessage.replace(routeAnchor, patchedRoute);

if (patchedChannel === channelSource || patchedProcessMessage === processMessageSource) {
  console.error("没有生成补丁内容；已拒绝写入。");
  process.exit(1);
}

for (const [file, patched] of [[channelFile, patchedChannel], [processMessageFile, patchedProcessMessage]]) {
  const backupFile = `${file}.pre-acp-binding-2.4.6.bak`;
  if (!existsSync(backupFile)) {
    copyFileSync(file, backupFile);
  }
  writeFileSync(file, patched, "utf8");
  console.log(`已应用 ACP 绑定补丁：${file}`);
  console.log(`原文件备份：${backupFile}`);
}
