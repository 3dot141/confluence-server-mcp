// Confluence API Client
import {
  ConfluenceConfig,
  Page,
  SearchResult,
  Space,
  Comment,
  Attachment,
  PageRestriction,
  CreatePageRequest,
  UpdatePageRequest,
  RestrictionRequest,
  ApiResponse
} from './types.ts';
import {
  ConfluenceError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  RateLimitError
} from './errors.ts';

export * from './types.ts';
export * from './errors.ts';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  contentType?: string;
}

export class ConfluenceClient {
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
  }

  // ==================== HTTP Client ====================

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, contentType = 'application/json' } = options;

    const url = `${this.config.baseUrl}/rest/api${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64')}`
    };

    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    // Handle empty responses
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async handleError(response: Response): Promise<never> {
    const status = response.status;
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const message = typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message: string }).message)
      : `HTTP ${status} error`;

    switch (status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new PermissionError(message);
      case 404:
        throw new NotFoundError('Resource', 'unknown');
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : 60);
      case 400:
        throw new ValidationError(message);
      default:
        throw new ConfluenceError(message, status, body);
    }
  }

  // ==================== Page Operations ====================

  async createPage(request: CreatePageRequest): Promise<Page> {
    const body: Record<string, unknown> = {
      type: 'page',
      title: request.title,
      space: { key: request.space },
      body: {
        storage: {
          value: request.content,
          representation: 'storage'
        }
      }
    };

    if (request.parentId) {
      body.ancestors = [{ id: request.parentId }];
    }

    return this.request<Page>('/content', { method: 'POST', body });
  }

  async updatePage(request: UpdatePageRequest): Promise<Page> {
    const body: Record<string, unknown> = {
      type: 'page',
      title: request.title || 'Untitled',
      body: {
        storage: {
          value: request.content,
          representation: 'storage'
        }
      },
      version: { number: request.version }
    };

    return this.request<Page>(`/content/${request.pageId}`, { method: 'PUT', body });
  }

  async getPageById(pageId: string): Promise<Page> {
    return this.request<Page>(`/content/${pageId}?expand=space,version,body.storage`);
  }

  async getPageByTitle(space: string, title: string): Promise<Page | null> {
    const cql = encodeURIComponent(`space = "${space}" AND title = "${title}" AND type = page`);
    const response = await this.request<ApiResponse<SearchResult>>(`/content/search?cql=${cql}&limit=1`);

    if (response.results.length === 0) {
      return null;
    }

    return this.getPageById(response.results[0].id);
  }

  async deletePage(pageId: string): Promise<void> {
    await this.request<void>(`/content/${pageId}`, { method: 'DELETE' });
  }

  async searchPages(query: string, space?: string, limit = 25): Promise<SearchResult[]> {
    let cql: string;

    if (space) {
      cql = `space = "${space}" AND (title ~ "${query}" OR text ~ "${query}") AND type = page`;
    } else {
      cql = `(title ~ "${query}" OR text ~ "${query}") AND type = page`;
    }

    const encodedCql = encodeURIComponent(cql);
    const response = await this.request<ApiResponse<SearchResult>>(
      `/content/search?cql=${encodedCql}&limit=${limit}`
    );

    return response.results;
  }

  async getChildPages(parentId: string, limit = 25): Promise<Page[]> {
    const response = await this.request<ApiResponse<Page>>(
      `/content/${parentId}/child/page?limit=${limit}&expand=space,version`
    );
    return response.results;
  }

  async getPageHistory(pageId: string, limit = 10): Promise<unknown> {
    return this.request<unknown>(`/content/${pageId}/history?limit=${limit}`);
  }

  // ==================== Space Operations ====================

  async listSpaces(limit = 50): Promise<Space[]> {
    const response = await this.request<ApiResponse<Space>>(`/space?limit=${limit}`);
    return response.results;
  }

  // ==================== Attachment Operations ====================

  async uploadAttachment(pageId: string, filePath: string, comment?: string): Promise<Attachment> {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const fileContent = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const formData = new FormData();
    const blob = new Blob([fileContent]);
    formData.append('file', blob, filename);

    if (comment) {
      formData.append('comment', comment);
    }

    const url = `${this.config.baseUrl}/rest/api/content/${pageId}/child/attachment`;
    const headers: Record<string, string> = {
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64')}`
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const result = await response.json() as ApiResponse<Attachment>;
    return result.results[0];
  }

  async uploadAttachmentFromBuffer(
    pageId: string,
    filename: string,
    buffer: Buffer,
    comment?: string
  ): Promise<Attachment> {
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('file', blob, filename);

    if (comment) {
      formData.append('comment', comment);
    }

    const url = `${this.config.baseUrl}/rest/api/content/${pageId}/child/attachment`;
    const headers: Record<string, string> = {
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64')}`
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const result = await response.json() as ApiResponse<Attachment>;
    return result.results[0];
  }

  async getPageAttachments(pageId: string, limit = 100): Promise<Attachment[]> {
    const response = await this.request<ApiResponse<Attachment>>(
      `/content/${pageId}/child/attachment?limit=${limit}`
    );
    return response.results;
  }

  // ==================== Comment Operations ====================

  async addComment(pageId: string, content: string, parentCommentId?: string): Promise<Comment> {
    const body: Record<string, unknown> = {
      type: 'comment',
      container: { id: pageId, type: 'page' },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    if (parentCommentId) {
      body.ancestors = [{ id: parentCommentId }];
    }

    return this.request<Comment>('/content', { method: 'POST', body });
  }

  async getPageComments(pageId: string, limit = 50): Promise<Comment[]> {
    const response = await this.request<ApiResponse<Comment>>(
      `/content/${pageId}/child/comment?limit=${limit}&expand=body.storage`
    );
    return response.results;
  }

  // ==================== Permission Operations ====================

  async setPageRestriction(
    pageId: string,
    operation: 'read' | 'update',
    restrictions: RestrictionRequest
  ): Promise<void> {
    const body: PageRestriction = {
      operation,
      restrictions: {
        user: (restrictions.users || []).map(username => ({
          type: 'known',
          username
        })),
        group: (restrictions.groups || []).map(name => ({
          type: 'group',
          name
        }))
      }
    };

    await this.request<void>(`/content/${pageId}/restriction/byOperation/${operation}`, {
      method: 'PUT',
      body
    });
  }

  async getPageRestrictions(pageId: string): Promise<PageRestriction[]> {
    return this.request<PageRestriction[]>(`/content/${pageId}/restriction/byOperation`);
  }

  async removePageRestriction(pageId: string, operation: 'read' | 'update'): Promise<void> {
    await this.request<void>(`/content/${pageId}/restriction/byOperation/${operation}`, {
      method: 'DELETE'
    });
  }

  // ==================== Utility Methods ====================

  getPageUrl(pageId: string): string {
    return `${this.config.baseUrl}/pages/viewpage.action?pageId=${pageId}`;
  }

  async pageExists(space: string, title: string): Promise<boolean> {
    const page = await this.getPageByTitle(space, title);
    return page !== null;
  }

  async upsertPage(request: CreatePageRequest): Promise<{ page: Page; created: boolean }> {
    const existing = await this.getPageByTitle(request.space, request.title);

    if (existing) {
      const page = await this.updatePage({
        pageId: existing.id,
        title: request.title,
        content: request.content,
        version: existing.version.number + 1
      });
      return { page, created: false };
    } else {
      const page = await this.createPage(request);
      return { page, created: true };
    }
  }
}

// Factory function for convenience
export function createConfluenceClient(config: ConfluenceConfig): ConfluenceClient {
  return new ConfluenceClient(config);
}
