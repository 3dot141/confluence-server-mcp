// src/infrastructure/http-client.ts
import axios from "axios";
import { config, getAuthHeader, isPatAuth } from "./config.js";
export function createHttpClient() {
    const authConfig = isPatAuth()
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
export function createExperimentalHttpClient() {
    const authConfig = isPatAuth()
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
export function getAuthHeaderValue() {
    return getAuthHeader();
}
//# sourceMappingURL=http-client.js.map