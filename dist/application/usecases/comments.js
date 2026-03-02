// src/application/usecases/comments.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { ConfluenceMapper } from "../mappers/confluence-mapper.js";
export class CommentUseCases {
    async addComment(dto) {
        const comment = await confluenceRepository.addComment(dto.pageId, dto.content, dto.parentCommentId);
        return ConfluenceMapper.toCommentResponse(comment);
    }
    async getPageComments(dto) {
        const comments = await confluenceRepository.getPageComments(dto.pageId, dto.limit);
        return comments.map(ConfluenceMapper.toCommentResponse);
    }
}
export const commentUseCases = new CommentUseCases();
//# sourceMappingURL=comments.js.map