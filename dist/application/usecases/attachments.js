// src/application/usecases/attachments.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { ConfluenceMapper } from "../mappers/confluence-mapper.js";
import { ValidationError } from "../../infrastructure/errors.js";
export class AttachmentUseCases {
    async uploadAttachment(dto) {
        if (!dto.filePath && !dto.contentBase64) {
            throw new ValidationError("Either filePath or contentBase64 must be provided");
        }
        let attachment;
        if (dto.filePath) {
            attachment = await confluenceRepository.uploadAttachment(dto.pageId, dto.filePath, dto.filename, dto.comment);
        }
        else if (dto.contentBase64) {
            if (!dto.filename) {
                throw new ValidationError("filename is required when using contentBase64");
            }
            attachment = await confluenceRepository.uploadAttachmentFromBase64(dto.pageId, dto.contentBase64, dto.filename, dto.comment);
        }
        return ConfluenceMapper.toAttachmentResponse(attachment);
    }
    async getPageAttachments(dto) {
        const attachments = await confluenceRepository.getPageAttachments(dto.pageId, dto.limit);
        return attachments.map(ConfluenceMapper.toAttachmentResponse);
    }
}
export const attachmentUseCases = new AttachmentUseCases();
//# sourceMappingURL=attachments.js.map