// Confluence Client Types

export interface ConfluenceConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  defaultSpace?: string;
}

export interface Page {
  id: string;
  title: string;
  version: { number: number };
  space: { key: string; name?: string };
  body?: { storage?: { value?: string } };
  _links: { webui: string };
}

export interface SearchResult {
  id: string;
  title: string;
  version: { number: number };
  space: { key: string };
  _links: { webui: string };
}

export interface Space {
  key: string;
  name: string;
  type: string;
  id: string;
}

export interface Comment {
  id: string;
  type: 'comment';
  title?: string;
  body?: { storage?: { value?: string } };
  _links?: { webui?: string };
}

export interface Attachment {
  id: string;
  title: string;
  mediaType?: string;
  fileSize?: number;
  _links: {
    download?: string;
    webui?: string;
  };
}

export interface PageRestriction {
  operation: 'read' | 'update';
  restrictions: {
    user: Array<{ type: string; username: string }>;
    group: Array<{ type: string; name: string }>;
  };
}

export type RestrictionType = 'none' | 'edit_only' | 'view_only';

export interface CreatePageRequest {
  space: string;
  title: string;
  content: string;
  parentId?: string;
}

export interface UpdatePageRequest {
  pageId: string;
  title?: string;
  content: string;
  version: number;
}

export interface RestrictionRequest {
  users?: string[];
  groups?: string[];
}

export interface ApiResponse<T> {
  results: T[];
  _links?: {
    next?: string;
  };
}
