// src/infrastructure/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { config, getAuthHeader, isPatAuth } from "./config.js";

export function createHttpClient(): AxiosInstance {
  const authConfig: AxiosRequestConfig = isPatAuth()
    ? { headers: { Authorization: `Bearer ${config.token}` } }
    : { auth: { username: config.username, password: config.password } };

  return axios.create({
    baseURL: `${config.baseUrl}/rest/api`,
    ...authConfig,
    headers: {
      "Content-Type": "application/json",
      ...authConfig.headers,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

export function createExperimentalHttpClient(): AxiosInstance {
  const authConfig: AxiosRequestConfig = isPatAuth()
    ? { headers: { Authorization: `Bearer ${config.token}` } }
    : { auth: { username: config.username, password: config.password } };

  return axios.create({
    baseURL: `${config.baseUrl}/rest/experimental`,
    ...authConfig,
    headers: {
      "Content-Type": "application/json",
      ...authConfig.headers,
    },
  });
}

export function getAuthHeaderValue(): string {
  return getAuthHeader();
}
