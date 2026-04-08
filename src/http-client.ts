// src/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getConfig } from './config.js';

export function createHttpClient(): AxiosInstance {
  const cfg = getConfig();
  const authConfig: AxiosRequestConfig = cfg.token
    ? { headers: { Authorization: `Bearer ${cfg.token}` } }
    : { auth: { username: cfg.username, password: cfg.password } };

  return axios.create({
    baseURL: `${cfg.baseUrl}/rest/api`,
    ...authConfig,
    headers: { 'Content-Type': 'application/json', ...authConfig.headers },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

export function createExperimentalHttpClient(): AxiosInstance {
  const cfg = getConfig();
  const authConfig: AxiosRequestConfig = cfg.token
    ? { headers: { Authorization: `Bearer ${cfg.token}` } }
    : { auth: { username: cfg.username, password: cfg.password } };

  return axios.create({
    baseURL: `${cfg.baseUrl}/rest/experimental`,
    ...authConfig,
    headers: { 'Content-Type': 'application/json', ...authConfig.headers },
  });
}
