// src/application/usecases/pages.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { config } from "../../infrastructure/config.js";
import { ConfluenceMapper } from "../mappers/confluence-mapper.js";
import { NotFoundError, ValidationError } from "../../infrastructure/errors.js";
export class PageUseCases {
    async createPage(dto) {
        const space = dto.space || config.defaultSpace;
        if (!space) {
            throw new ValidationError("Space is required");
        }
        // Resolve parent ID if parentTitle provided
        let parentId = dto.parentId;
        if (dto.parentTitle) {
            const parentPage = await confluenceRepository.getPageByTitle(space, dto.parentTitle);
            if (!parentPage) {
                throw new NotFoundError("Page", dto.parentTitle);
            }
            parentId = parentPage.id;
        }
        const page = await confluenceRepository.createPage({
            space,
            title: dto.title,
            content: dto.content,
            parentId,
        });
        return ConfluenceMapper.toPageResponse(page);
    }
    async updatePage(dto) {
        let page;
        if (dto.pageId) {
            page = await confluenceRepository.getPageById(dto.pageId);
        }
        else if (dto.space && dto.title) {
            page = await confluenceRepository.getPageByTitle(dto.space, dto.title);
        }
        else {
            throw new ValidationError("Either pageId or both space and title must be provided");
        }
        if (!page) {
            throw new NotFoundError("Page", dto.pageId || dto.title || "unknown");
        }
        const updated = await confluenceRepository.updatePage({
            pageId: page.id,
            title: dto.newTitle || dto.title || page.title,
            content: dto.content,
            version: page.version.number + 1,
        });
        return ConfluenceMapper.toPageResponse(updated);
    }
    async upsertPage(dto) {
        const space = dto.space || config.defaultSpace;
        if (!space) {
            throw new ValidationError("Space is required");
        }
        // Check if page exists
        const existing = await confluenceRepository.getPageByTitle(space, dto.title);
        if (existing) {
            // Update existing
            const updated = await confluenceRepository.updatePage({
                pageId: existing.id,
                title: dto.title,
                content: dto.content,
                version: existing.version.number + 1,
            });
            return ConfluenceMapper.toPageResponse(updated);
        }
        else {
            // Create new
            return this.createPage(dto);
        }
    }
    async getPage(dto) {
        let page;
        if (dto.pageId) {
            page = await confluenceRepository.getPageById(dto.pageId);
        }
        else if (dto.space && dto.title) {
            page = await confluenceRepository.getPageByTitle(dto.space, dto.title);
        }
        else {
            throw new ValidationError("Either pageId or both space and title must be provided");
        }
        if (!page) {
            throw new NotFoundError("Page", dto.pageId || dto.title || "unknown");
        }
        return ConfluenceMapper.toPageResponse(page);
    }
    async deletePage(dto) {
        await confluenceRepository.deletePage(dto.pageId);
        return { success: true, message: "Page deleted successfully" };
    }
    async searchPages(dto) {
        const results = await confluenceRepository.searchPages(dto.query, dto.space, dto.limit);
        return results.map(ConfluenceMapper.toSearchResultResponse);
    }
    async getChildPages(dto) {
        const pages = await confluenceRepository.getChildPages(dto.parentId, dto.limit);
        return pages.map(ConfluenceMapper.toPageResponse);
    }
    async getPageHistory(dto) {
        return await confluenceRepository.getPageHistory(dto.pageId, dto.limit);
    }
}
export const pageUseCases = new PageUseCases();
//# sourceMappingURL=pages.js.map