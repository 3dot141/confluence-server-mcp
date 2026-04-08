// src/confluence-api.ts
import { createHttpClient, createExperimentalHttpClient } from './http-client.js';
import { getConfig, getAuthHeader } from './config.js';
import {
  Page,
  Space,
  Comment,
  Attachment,
  SearchResult,
  CreatePageRequest,
  UpdatePageRequest,
  RestrictionType,
} from './types.js';
import { AxiosInstance } from 'axios';
import fs from 'node:fs';
import path from 'node:path';

export class ConfluenceApi {
  private api: AxiosInstance;
  private experimentalApi: AxiosInstance;

  constructor() {
    this.api = createHttpClient();
    this.experimentalApi = createExperimentalHttpClient();
  }

  // Spaces
  async listSpaces(type: "global" | "personal" = "global", limit: number = 200): Promise<Space[]> {
    const res = await this.api.get("/space", {
      params: { type, limit }
    });
    return res.data.results;
  }

  // Pages
  async getPageById(pageId: string): Promise<Page> {
    const res = await this.api.get(`/content/${pageId}`, {
      params: { expand: "version,space,body.storage" }
    });
    return res.data;
  }

  async getPageByTitle(space: string, title: string): Promise<Page | undefined> {
    const res = await this.api.get("/content", {
      params: {
        spaceKey: space,
        title,
        expand: "version,space,body.storage"
      }
    });
    return res.data.results[0];
  }

  async createPage(request: CreatePageRequest): Promise<Page> {
    const pageData: Record<string, unknown> = {
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

  async updatePage(request: UpdatePageRequest): Promise<Page> {
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

  async movePage(pageId: string, parentId: string): Promise<Page> {
    const page = await this.getPageById(pageId);

    const res = await this.api.put(`/content/${pageId}`, {
      id: pageId,
      type: "page",
      title: page.title,
      version: { number: page.version.number + 1 },
      ancestors: [{ id: parentId }],
      body: {
        storage: {
          value: page.body?.storage?.value || "",
          representation: "storage"
        }
      }
    });
    return res.data;
  }

  async deletePage(pageId: string): Promise<void> {
    await this.api.delete(`/content/${pageId}`);
  }

  // Search
  async searchPages(query: string, space?: string, limit: number = 25): Promise<SearchResult[]> {
    const cql = space ? `space=${space} AND title~"${query}"` : `title~"${query}"`;
    const res = await this.api.get("/content/search", {
      params: { cql, limit, expand: "space,version" }
    });
    return res.data.results;
  }

  async getChildPages(parentId: string, limit: number = 50): Promise<Page[]> {
    const res = await this.api.get(`/content/${parentId}/child/page`, {
      params: { limit, expand: "version,space" }
    });
    return res.data.results;
  }

  async getPageHistory(pageId: string, limit: number = 10): Promise<unknown> {
    const res = await this.api.get(`/content/${pageId}/history`, { params: { limit } });
    return res.data;
  }

  // Attachments
  async getPageAttachments(pageId: string, limit: number = 100): Promise<Attachment[]> {
    const res = await this.api.get(`/content/${pageId}/child/attachment`, {
      params: { limit }
    });
    return res.data.results;
  }

  async uploadAttachment(
    pageId: string,
    filePath: string,
    filename?: string,
    comment?: string
  ): Promise<Attachment> {
    const actualFilename = filename || path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const form = new FormData();
    const blob = new Blob([fileContent], { type: 'application/octet-stream' });
    form.append("file", blob, actualFilename);
    if (comment) form.append("comment", comment);

    const cfg = getConfig();
    const url = `${cfg.baseUrl}/rest/api/content/${pageId}/child/attachment`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "X-Atlassian-Token": "no-check",
      },
      body: form as unknown as BodyInit
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Upload failed: HTTP ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ""}`);
    }

    const data = await res.json();
    return data.results?.[0] || data;
  }

  async uploadAttachmentFromBase64(
    pageId: string,
    base64Content: string,
    filename: string,
    comment?: string
  ): Promise<Attachment> {
    const buffer = Buffer.from(base64Content, "base64");

    const form = new FormData();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    form.append("file", blob, filename);
    if (comment) form.append("comment", comment);

    const cfg = getConfig();
    const url = `${cfg.baseUrl}/rest/api/content/${pageId}/child/attachment`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "X-Atlassian-Token": "no-check",
      },
      body: form as unknown as BodyInit
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Upload failed: HTTP ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ""}`);
    }

    const data = await res.json();
    return data.results?.[0] || data;
  }

  // Comments
  async getPageComments(pageId: string, limit: number = 50): Promise<Comment[]> {
    const res = await this.api.get(`/content/${pageId}/child/comment`, {
      params: { limit, expand: "body.storage,version", depth: "all" }
    });
    return res.data.results;
  }

  async addComment(pageId: string, content: string, parentCommentId?: string): Promise<Comment> {
    const payload: Record<string, unknown> = {
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
  async setPageRestriction(
    pageId: string,
    restrictionType: RestrictionType,
    username?: string
  ): Promise<{ success: boolean; message: string }> {
    const cfg = getConfig();
    const targetUser = username || cfg.username;

    if (restrictionType === "none") {
      await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/read/user`).catch(() => {});
      await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/update/user`).catch(() => {});
      await this.api.delete(`/content/${pageId}/restriction`).catch(() => {});
      return { success: true, message: "Removed all page restrictions" };
    }

    await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/read/user`).catch(() => {});
    await this.experimentalApi.delete(`/content/${pageId}/restriction/byOperation/update/user`).catch(() => {});

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
    } else if (restrictionType === "edit_only") {
      restrictions.push({
        operation: "update",
        restrictions: { user: [{ type: "known", username: targetUser }], group: [] }
      });
    }

    await this.experimentalApi.post(`/content/${pageId}/restriction`, restrictions);

    const messageMap: Record<RestrictionType, string> = {
      none: "Removed all page restrictions",
      edit_only: `Set to editable only by ${targetUser}`,
      view_only: `Set to viewable and editable only by ${targetUser}`
    };

    return { success: true, message: messageMap[restrictionType] };
  }
}
