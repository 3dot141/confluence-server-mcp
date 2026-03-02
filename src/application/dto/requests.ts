// src/application/dto/requests.ts

// Space requests
export interface ListSpacesRequest {
  type?: "global" | "personal";
}

// Page requests
export interface CreatePageRequestDto {
  space: string;
  title: string;
  content: string;
  parentId?: string;
  parentTitle?: string;
  atRoot?: boolean;
}

export interface UpdatePageRequestDto {
  pageId?: string;
  space?: string;
  title?: string;
  content: string;
  newTitle?: string;
}

export interface GetPageRequestDto {
  pageId?: string;
  space?: string;
  title?: string;
}

export interface DeletePageRequestDto {
  pageId: string;
}

// Search requests
export interface SearchPagesRequestDto {
  query: string;
  space?: string;
  limit?: number;
}

export interface GetChildPagesRequestDto {
  parentId: string;
  limit?: number;
}

export interface GetPageHistoryRequestDto {
  pageId: string;
  limit?: number;
}

// Attachment requests
export interface UploadAttachmentRequestDto {
  pageId: string;
  filePath?: string;
  filename?: string;
  contentBase64?: string;
  comment?: string;
}

export interface GetPageAttachmentsRequestDto {
  pageId: string;
  limit?: number;
}

// Comment requests
export interface AddCommentRequestDto {
  pageId: string;
  content: string;
  parentCommentId?: string;
}

export interface GetPageCommentsRequestDto {
  pageId: string;
  limit?: number;
}

// Permission requests
export interface SetPageRestrictionRequestDto {
  pageId: string;
  restrictionType: "none" | "edit_only" | "view_only";
  username?: string;
}

// Publish requests
export interface PublishMarkdownRequestDto {
  markdown: string;
  space: string;
  title?: string;
  pageId?: string;
  parentId?: string;
  updateIfExists?: boolean;
  basePath?: string;
}

// Code macro request
export interface BuildCodeMacroRequestDto {
  code: string;
  language?: string;
  linenumbers?: boolean;
  collapse?: boolean;
}
