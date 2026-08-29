#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "weixin-acp-binding-"));
const fixtureDist = join(fixtureRoot, "dist", "src");
const fixtureMessaging = join(fixtureDist, "messaging");

try {
  mkdirSync(fixtureMessaging, { recursive: true });
  writeFileSync(
    join(fixtureRoot, "package.json"),
    JSON.stringify({ name: "@tencent-weixin/openclaw-weixin", version: "2.4.6" }),
  );
  writeFileSync(
    join(fixtureDist, "channel.js"),
    `const plugin = {
    config: {
        listAccountIds: (cfg) => listWeixinAccountIds(cfg),
    },
};
`,
  );
  writeFileSync(
    join(fixtureMessaging, "process-message.js"),
    `import { logger } from "../util/logger.js";
    const route = deps.channelRuntime.routing.resolveAgentRoute({
        cfg: deps.config,
        channel: "openclaw-weixin",
        accountId: deps.accountId,
        peer: { kind: "direct", id: ctx.To },
    });
`,
  );

  execFileSync("node", [join(repositoryRoot, "scripts/patch-weixin-acp-binding.mjs"), fixtureRoot], {
    encoding: "utf8",
  });

  const patchedChannel = readFileSync(join(fixtureDist, "channel.js"), "utf8");
  assert.match(
    patchedChannel,
    /return \{\s*conversationId: matchesParent \? parentConversationId : conversationId,\s*matchPriority: matchesParent \? 1 : 2,\s*\};/,
    "微信 binding matcher 必须返回 SDK 要求的匹配对象或 null",
  );

  const legacyMatcher = `matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) =>
            compiledBinding.conversationId === conversationId ||
            compiledBinding.conversationId === parentConversationId,`;
  const currentMatcher = `matchInboundConversation: ({ compiledBinding, conversationId, parentConversationId }) => {
            const matchesParent = compiledBinding.conversationId === parentConversationId;
            if (compiledBinding.conversationId !== conversationId && !matchesParent) return null;
            return {
                conversationId: matchesParent ? parentConversationId : conversationId,
                matchPriority: matchesParent ? 1 : 2,
            };
        },`;
  const legacyChannel = patchedChannel.replace(currentMatcher, legacyMatcher);
  const legacyProcessMessage = readFileSync(join(fixtureMessaging, "process-message.js"), "utf8")
    .replace("openclaw-weixin ACP persistent-binding patch v2", "openclaw-weixin ACP persistent-binding patch v1");
  writeFileSync(join(fixtureDist, "channel.js"), legacyChannel);
  writeFileSync(join(fixtureMessaging, "process-message.js"), legacyProcessMessage);
  execFileSync("node", [join(repositoryRoot, "scripts/patch-weixin-acp-binding.mjs"), fixtureRoot], {
    encoding: "utf8",
  });
  assert.match(
    readFileSync(join(fixtureDist, "channel.js"), "utf8"),
    /return \{\s*conversationId: matchesParent \? parentConversationId : conversationId,\s*matchPriority: matchesParent \? 1 : 2,\s*\};/,
    "旧版 v1 补丁必须可升级到 v2",
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("patch-weixin-acp-binding contract: PASS");
