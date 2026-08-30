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

  static create(name: TagName, displayOrder: number): Tag {
    const id = TagId.generate();
    return new Tag(id, name, displayOrder, TagStatus.Active);
  }

  rename(newName: TagName): void {
    this.name = newName;
  }

  deprecate(): void {
    this.status = TagStatus.Deprecated;
  }

  
}

export { Tag };