// src/application/usecases/spaces.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { ConfluenceMapper } from "../mappers/confluence-mapper.js";
export class SpaceUseCases {
    async listSpaces(dto) {
        const spaces = await confluenceRepository.listSpaces(dto.type);
        return spaces.map(ConfluenceMapper.toSpaceResponse);
    }
}
export const spaceUseCases = new SpaceUseCases();
//# sourceMappingURL=spaces.js.map