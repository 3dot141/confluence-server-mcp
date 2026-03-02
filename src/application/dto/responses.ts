// src/application/dto/responses.ts

import { Page, Space, Comment, Attachment, SearchResult } from "../../domain/index.js";

export interface PageResponse {
  id: string;
  title: string;
  version: number;
  space: string;
  url: string;
  body?: string;
}

export interface SpaceResponse {
  key: string;
  name: string;
  type: string;
  id: string;
}

export interface SearchResultResponse {
  id: string;
  title: string;
  space: string;
  url: string;
}

export interface AttachmentResponse {
  id: string;
  title: string;
  mediaType?: string;
  fileSize?: number;
  downloadUrl?: string;
  webuiUrl?: string;
}

export interface CommentResponse {
  id: string;
  title?: string;
  body?: string;
  url?: string;
}

export interface PublishMarkdownResponse {
  success: boolean;
  pageId: string;
  title: string;
  url: string;
  version: number;
  operation: "created" | "updated";
  attachmentsUploaded: number;
}

export interface RestrictionResponse {
  success: boolean;
  message: string;
}

export interface CodeMacroResponse {
  macro: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}
