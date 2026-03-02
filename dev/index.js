import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { CONF_BASE_URL, CONF_USERNAME, CONF_PASSWORD, CONF_SPACE } = process.env;

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

/**
 * 查询页面
 */
async function getPage(space, title) {
  const res = await api.get("/content", {
    params: {
      spaceKey: space,
      title,
      expand: "version",
    },
  });
  return res.data.results[0];
}

/**
 * 创建页面
 */
async function createPage(space, title, content) {
  const res = await api.post("/content", {
    type: "page",
    title,
    space: { key: space },
    body: {
      storage: {
        value: content,
        representation: "storage",
      },
    },
  });
  return res.data;
}

/**
 * 获取当前用户可见的所有 Space
 */
async function listAllSpaces({ type = "global", limit = 200 } = {}) {
  const res = await api.get("/space", {
    params: {
      type, // global | personal
      limit,
    },
  });

  return res.data.results.map((s) => ({
    key: s.key,
    name: s.name,
    type: s.type,
  }));
}

async function printAllSpaces() {
  const spaces = await listAllSpaces();

  console.log("📚 当前账号可访问的 Space：");
  spaces.forEach((s) => {
    console.log(`- ${s.name}  ==>  ${s.key}`);
  });
}

async function validateSpace(spaceKey) {
  const spaces = await listAllSpaces();
  const found = spaces.find((s) => s.key === spaceKey);

  if (!found) {
    throw new Error(
      `❌ Space 不存在或无权限: ${spaceKey}\n` +
        `✅ 可用 Space 包括:\n` +
        spaces.map((s) => `- ${s.key} (${s.name})`).join("\n")
    );
  }

  console.log(`✅ 使用 Space: ${found.name} (${found.key})`);
  return found;
}

/**
 * 更新页面（Server 必须 version + 1）
 */
async function updatePage(page, content) {
  const res = await api.put(`/content/${page.id}`, {
    id: page.id,
    type: "page",
    title: page.title,
    version: {
      number: page.version.number + 1,
    },
    body: {
      storage: {
        value: content,
        representation: "storage",
      },
    },
  });
  return res.data;
}

/**
 * upsert 逻辑
 */
async function upsertPage({ space, title, content }) {
  const page = await getPage(space, title);

  if (!page) {
    console.log("📄 页面不存在，创建中...");
    return createPage(space, title, content);
  }

  console.log("✏️ 页面已存在，更新中...");
  return updatePage(page, content);
}

/**
 * 从文件读取模板内容
 */
function loadTemplate(templateFile = "template.html") {
  const templatePath = path.join(__dirname, templateFile);
  return fs.readFileSync(templatePath, "utf-8");
}

/**
 * 示例执行
 */
(async () => {
  // const title = "REPORT-166456 智能工坊三期-调整能力前端开发评审文档";
  
  // // 从 template.html 文件读取格式化的内容
  // const content = loadTemplate();

  // const result = await upsertPage({
  //   space: CONF_SPACE,
  //   title,
  //   content,
  // });

  // console.log("✅ 完成，页面 ID:", result.id);
  await printAllSpaces();

})();
