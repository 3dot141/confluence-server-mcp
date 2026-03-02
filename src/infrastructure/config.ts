// src/infrastructure/config.ts
import dotenv from "dotenv";

dotenv.config();

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  token?: string;
  defaultSpace?: string;
  mermaidInkUrl: string;
}

export function loadConfig(): Config {
  const {
    CONF_BASE_URL,
    CONF_USERNAME,
    CONF_PASSWORD,
    CONF_TOKEN,
    CONF_SPACE,
    MERMAID_INK_URL,
  } = process.env;

  if (!CONF_BASE_URL) {
    throw new Error("Missing required environment variable: CONF_BASE_URL");
  }

  const usePatAuth = Boolean(CONF_TOKEN);
  
  if (!usePatAuth && (!CONF_USERNAME || !CONF_PASSWORD)) {
    throw new Error(
      "Missing authentication: Provide CONF_TOKEN or both CONF_USERNAME and CONF_PASSWORD"
    );
  }

  return {
    baseUrl: CONF_BASE_URL,
    username: CONF_USERNAME || "",
    password: CONF_PASSWORD || "",
    token: CONF_TOKEN,
    defaultSpace: CONF_SPACE,
    mermaidInkUrl: MERMAID_INK_URL || "https://mermaid.ink",
  };
}

export const config = loadConfig();

export function isPatAuth(): boolean {
  return Boolean(config.token);
}

export function getAuthHeader(): string {
  if (isPatAuth()) {
    return `Bearer ${config.token}`;
  }
  const token = Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64");
  return `Basic ${token}`;
}
