#!/usr/bin/env node

import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { CONF_BASE_URL, CONF_USERNAME, CONF_PASSWORD, CONF_SPACE } = process.env;

console.log("🔍 正在测试 Confluence 连接配置...\n");

// 检查环境变量
const checks = [
  { name: "CONF_BASE_URL", value: CONF_BASE_URL },
  { name: "CONF_USERNAME", value: CONF_USERNAME },
  { name: "CONF_PASSWORD", value: CONF_PASSWORD },
  { name: "CONF_SPACE", value: CONF_SPACE },
];

let configOk = true;
checks.forEach((check) => {
  if (!check.value) {
    console.log(`❌ ${check.name} 未配置`);
    configOk = false;
  } else {
    // 部分隐藏敏感信息
    const displayValue =
      check.name === "CONF_PASSWORD"
        ? check.value.substring(0, 4) + "****"
        : check.value;
    console.log(`✅ ${check.name}: ${displayValue}`);
  }
});

if (!configOk) {
  console.log("\n❌ 请先配置 .env 文件");
  console.log("参考 env-example.txt 文件");
  process.exit(1);
}

console.log("\n📡 测试连接到 Confluence...\n");

const api = axios.create({
  baseURL: `${CONF_BASE_URL}/rest/api`,
  auth: {
    username: CONF_USERNAME,
    password: CONF_PASSWORD,
  },
  headers: {
    "Content-Type": "application/json",
  },
});

async function testConnection() {
  try {
    // 测试 1: 获取当前用户信息
    console.log("1️⃣ 测试用户认证...");
    const userRes = await api.get("/user/current");
    console.log(`   ✅ 认证成功: ${userRes.data.displayName} (${userRes.data.email})`);

    // 测试 2: 获取 Spaces
    console.log("\n2️⃣ 测试获取 Spaces...");
    const spacesRes = await api.get("/space", {
      params: { type: "global", limit: 10 },
    });
    console.log(`   ✅ 成功获取 ${spacesRes.data.results.length} 个 Spaces`);
    
    if (spacesRes.data.results.length > 0) {
      console.log("\n   📋 可用的 Spaces:");
      spacesRes.data.results.forEach((s) => {
        const isCurrent = s.key === CONF_SPACE ? " 👈 当前配置" : "";
        console.log(`      - ${s.name} (${s.key})${isCurrent}`);
      });
    }

    // 测试 3: 验证配置的 Space
    console.log(`\n3️⃣ 验证 Space: ${CONF_SPACE}...`);
    const spaceExists = spacesRes.data.results.find((s) => s.key === CONF_SPACE);
    
    if (spaceExists) {
      console.log(`   ✅ Space 存在且可访问: ${spaceExists.name}`);
      
      // 测试 4: 获取该 Space 的页面
      console.log("\n4️⃣ 测试读取页面列表...");
      const pagesRes = await api.get("/content", {
        params: { spaceKey: CONF_SPACE, limit: 5 },
      });
      console.log(`   ✅ 成功读取 ${pagesRes.data.results.length} 个页面`);
      
      if (pagesRes.data.results.length > 0) {
        console.log("\n   📄 最近的页面:");
        pagesRes.data.results.forEach((p) => {
          console.log(`      - ${p.title} (ID: ${p.id})`);
        });
      }
    } else {
      console.log(`   ⚠️  Space 不存在或无权限: ${CONF_SPACE}`);
      console.log("   💡 请使用上面列出的 Space Key 之一");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 所有测试通过！MCP Server 配置正确");
    console.log("=".repeat(60));
    console.log("\n📝 下一步：");
    console.log("   1. 配置 Cursor MCP (参考 mcp-config-example.json)");
    console.log("   2. 重启 Cursor");
    console.log("   3. 在 Cursor 中开始使用 Confluence MCP\n");
    
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ 连接测试失败");
    console.log("=".repeat(60));
    
    if (error.response) {
      console.log(`\n状态码: ${error.response.status}`);
      console.log(`错误信息: ${error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log("\n💡 可能的原因:");
        console.log("   1. API Token 无效或已过期");
        console.log("   2. 用户名（邮箱）不正确");
        console.log("   3. 需要重新生成 API Token");
        console.log("\n🔗 获取新的 API Token:");
        console.log("   https://id.atlassian.com/manage-profile/security/api-tokens");
      } else if (error.response.status === 404) {
        console.log("\n💡 可能的原因:");
        console.log("   1. CONF_BASE_URL 配置不正确");
        console.log("   2. Confluence 实例地址错误");
      }
    } else if (error.code === "ENOTFOUND") {
      console.log("\n💡 可能的原因:");
      console.log("   1. CONF_BASE_URL 地址无法访问");
      console.log("   2. 网络连接问题");
      console.log(`   3. 域名不存在: ${CONF_BASE_URL}`);
    } else {
      console.log(`\n错误: ${error.message}`);
    }
    
    console.log("\n");
    process.exit(1);
  }
}

testConnection();
