// src/domain/confluence/repository.ts
import { createHttpClient, createExperimentalHttpClient, getAuthHeaderValue } from "../../infrastructure/http-client.js";
import { config } from "../../infrastructure/config.js";
import FormData from "form-data";
import fs from "fs";
import path from "path";
export class ConfluenceRepository {
    api;
    experimentalApi;
    constructor() {
        this.api = createHttpClient();
        this.experimentalApi = createExperimentalHttpClient();
    }
    // Spaces
    async listSpaces(type = "global", limit = 200) {
        const res = await this.api.get("/space", {
            params: { type, limit }
        });
        return res.data.results;
    }
    // Pages
    async getPageById(pageId) {
        const res = await this.api.get(`/content/${pageId}`, {
            params: { expand: "version,space,body.storage" }
        });
        return res.data;
    }
    async getPageByTitle(space, title) {
        const res = await this.api.get("/content", {
            params: {
                spaceKey: space,
                title,
                expand: "version,space,body.storage"
            }
        });
        return res.data.results[0];
    }
    async createPage(request) {
        const pageData = {
            type: "page",
            title: request.title,
            space: { key: request.space },
            body: {
                storage: {
                    value: request.content,
                    representation: "storage"
                }
            }
        };
        if (request.parentId) {
            pageData.ancestors = [{ id: request.parentId }];
        }
        const res = await this.api.post("/content", pageData);
        return res.data;
    }
    async updatePage(request) {
        const res = await this.api.put(`/content/${request.pageId}`, {
            id: request.pageId,
            type: "page",
            title: request.title,
            version: { number: request.version },
            body: {
                storage: {
                    value: request.content,
                    representation: "storage"
                }
            }
        });
        return res.data;
    }
    async deletePage(pageId) {
        await this.api.delete(`/content/${pageId}`);
    }
    // Search
    async searchPages(query, space, limit = 25) {
        const cql = space ? `space=${space} AND title~"${query}"` : `title~"${query}"`;
        const res = await this.api.get("/content/search", {
            params: { cql, limit, expand: "space,version" }
        });
        return res.data.results;
    }
    async getChildPages(parentId, limit = 50) {
        const res = await this.api.get(`/content/${parentId}/child/page`, {
            params: { limit, expand: "version,space" }
        });
        return res.data.results;
    }
    async getPageHistory(pageId, limit = 10) {
        const res = await this.api.get(`/content/${pageId}/history`, { params: { limit } });
        return res.data;
    }
    // Attachments
    async getPageAttachments(pageId, limit = 100) {
        const res = await this.api.get(`/content/${pageId}/child/attachment`, {
            params: { limit }
        });
        return res.data.results;
    }
    async uploadAttachment(pageId, filePath, filename, comment) {
        const actualFilename = filename || path.basename(filePath);
        const fileContent = fs.readFileSync(filePath);
        const form = new FormData();
        form.append("file", new Uint8Array(fileContent), actualFilename);
        if (comment)
            form.append("comment", comment);
        const url = `${config.baseUrl}/rest/api/content/${pageId}/child/attachment`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: getAuthHeaderValue(),
                "X-Atlassian-Token": "no-check",
                ...form.getHeaders()
            },
            body: form.getBuffer()
        });
        if (!res.ok) {
            throw new Error(`Upload failed: HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.results?.[0] || data;
    }
    async uploadAttachmentFromBase64(pageId, base64Content, filename, comment) {
        const buffer = Buffer.from(base64Content, "base64");
        const form = new FormData();
        form.append("file", new Uint8Array(buffer), filename);
        if (comment)
            form.append("comment", comment);
        const url = `${config.baseUrl}/rest/api/content/${pageId}/child/attachment`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: getAuthHeaderValue(),
                "X-Atlassian-Token": "no-check",
                ...form.getHeaders()
            },
            body: form.getBuffer()
        });
        if (!res.ok) {
            throw new Error(`Upload failed: HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.results?.[0] || data;
    }
    // Comments
    async getPageComments(pageId, limit = 50) {
        const res = await this.api.get(`/content/${pageId}/child/comment`, {
            params: { limit, expand: "body.storage,version", depth: "all" }
        });
        return res.data.results;
    }
    async addComment(pageId, content, parentCommentId) {
        const payload = {
            type: "comment",
            title: "comment",
            container: { type: "page", id: pageId },
            body: {
                storage: { value: content, representation: "storage" }
            }
        };
        if (parentCommentId) {
            payload.ancestors = [{ id: parentCommentId }];
        }
        const res = await this.api.post("/content", payload);
        return res.data;
    }
    // Permissions
    async setPageRestriction(pageId, restrictionType, username) {
        const targetUser = username || config.username;
        if (restrictionType === "none") {
            await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/read/user`).catch(() => { });
            await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/update/user`).catch(() => { });
            await this.api.delete(`/content/${pageId}/restriction`).catch(() => { });
            return { success: true, message: "已移除所有页面限制" };
        }
        // Clear existing restrictions
        await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/read/user`).catch(() => { });
        await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/update/user`).catch(() => { });
        const restrictions = [];
        if (restrictionType === "view_only") {
            restrictions.push({
                operation: "read",
                restrictions: { user: [{ type: "known", username: targetUser }], group: [] }
            });
            restrictions.push({
                operation: "update",
                restrictions: { user: [{ type: "known", username: targetUser }], group: [] }
            });
        }
        else if (restrictionType === "edit_only") {
            restrictions.push({
                operation: "update",
                restrictions: { user: [{ type: "known", username: targetUser }], group: [] }
            });
        }
        await this.experimentalApi.post(`/content/${pageId}/restriction`, restrictions);
        const messageMap = {
            none: "已移除所有页面限制",
            edit_only: `已设置为仅 ${targetUser} 可编辑`,
            view_only: `已设置为仅 ${targetUser} 可查看和编辑`
        };
        return { success: true, message: messageMap[restrictionType] };
    }
}
export const confluenceRepository = new ConfluenceRepository();
//# sourceMappingURL=repository.js.map