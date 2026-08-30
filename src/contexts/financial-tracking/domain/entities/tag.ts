// contexts/financial-tracking/domain/entities/tag.ts
import  { TagStatus } from '../value-objects/tag-status.js';
import { TagId } from '../value-objects/tag-id.js';
import { TagName } from '../value-objects/tag-name.js';

class Tag {
  private constructor(
    private readonly id: TagId,
    private name: TagName,
    private displayOrder: number,
    private status: TagStatus,   // Active | Deprecated — misma lógica que Category
  ) {}

  rename(newName: TagName): void { }
  deprecate(): void { this.status = TagStatus.Deprecated; }
}

export { Tag };