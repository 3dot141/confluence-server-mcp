// src/application/usecases/spaces.ts
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { ListSpacesRequest } from "../dto/requests.js";
import { SpaceResponse } from "../dto/responses.js";
import { ConfluenceMapper } from "../mappers/confluence-mapper.js";

export class SpaceUseCases {
  async listSpaces(dto: ListSpacesRequest): Promise<SpaceResponse[]> {
    const spaces = await confluenceRepository.listSpaces(dto.type);
    return spaces.map(ConfluenceMapper.toSpaceResponse);
  }
}

export const spaceUseCases = new SpaceUseCases();
