// src/application/usecases/permissions.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
export class PermissionUseCases {
    async setPageRestriction(dto) {
        return await confluenceRepository.setPageRestriction(dto.pageId, dto.restrictionType, dto.username);
    }
}
export const permissionUseCases = new PermissionUseCases();
//# sourceMappingURL=permissions.js.map