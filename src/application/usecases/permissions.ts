// src/application/usecases/permissions.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { SetPageRestrictionRequestDto } from "../dto/requests.js";
import { RestrictionResponse } from "../dto/responses.js";

export class PermissionUseCases {
  async setPageRestriction(dto: SetPageRestrictionRequestDto): Promise<RestrictionResponse> {
    return await confluenceRepository.setPageRestriction(
      dto.pageId,
      dto.restrictionType,
      dto.username
    );
  }
}

export const permissionUseCases = new PermissionUseCases();
