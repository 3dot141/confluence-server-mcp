// src/application/mappers/confluence-mapper.ts
import { config } from "../../infrastructure/config.js";
import { Page, Space, Comment, Attachment, SearchResult } from "../../domain/index.js";
import {
  PageResponse,
  SpaceResponse,
  SearchResultResponse,
  AttachmentResponse,
  CommentResponse,
} from "../dto/responses.js";

export class ConfluenceMapper {
  static toPageResponse(page: Page): PageResponse {
    return {
      id: page.id,
      title: page.title,
      version: page.version.number,
      space: page.space.key,
      url: `${config.baseUrl}${page._links.webui}`,
      body: page.body?.storage?.value,
    };
  }

  static toSpaceResponse(space: Space): SpaceResponse {
    return {
      key: space.key,
      name: space.name,
      type: space.type,
      id: space.id,
    };
  }

  static toSearchResultResponse(result: SearchResult): SearchResultResponse {
    return {
      id: result.id,
      title: result.title,
      space: result.space.key,
      url: `${config.baseUrl}${result._links.webui}`,
    };
  }

  static toAttachmentResponse(attachment: Attachment): AttachmentResponse {
    return {
      id: attachment.id,
      title: attachment.title,
      mediaType: attachment.mediaType,
      fileSize: attachment.fileSize,
      downloadUrl: attachment._links.download
        ? `${config.baseUrl}${attachment._links.download}`
        : undefined,
      webuiUrl: attachment._links.webui
        ? `${config.baseUrl}${attachment._links.webui}`
        : undefined,
    };
  }

  static toCommentResponse(comment: Comment): CommentResponse {
    return {
      id: comment.id,
      title: comment.title,
      body: comment.body?.storage?.value,
      url: comment._links?.webui
        ? `${config.baseUrl}${comment._links.webui}`
        : undefined,
    };
  }
}
