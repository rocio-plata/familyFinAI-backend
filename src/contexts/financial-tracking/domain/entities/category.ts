// contexts/financial-tracking/domain/entities/category.ts

import { CategoryId } from '../value-objects/category-id.js';
import { FamilyId } from '../../../family-access/domain/value-objects/family-id.js';
import { CategoryName } from '../value-objects/category-name.js';
import { CategoryStatus } from '../value-objects/category-status.js';
import { TagName } from '../value-objects/tag-name.js';
import { TagId } from '../value-objects/tag-id.js';
import { Tag } from './tag.js';


class Category {
  private constructor(
    private readonly _id: CategoryId,
    private readonly familyId: FamilyId,
    private name: CategoryName,
    private status: CategoryStatus,
    private tags: Tag[],
  ) {}

  get id(): CategoryId {
    return this._id;
  }

  addTag(name: TagName): void {
    const nextOrder = this.tags.length;
    this.tags.push(Tag.create(name, nextOrder));
  }

  rename(newName: CategoryName): void {
    this.name = newName;
  }

  deprecate(): void {
    this.status = CategoryStatus.Deprecated;
  }

  reactivate(): void {
    this.status = CategoryStatus.Active;
  }

  markAsDeleted(): void {
    // llamado únicamente por CategoryDeletionService tras confirmar que no tiene items asociados
  }
}

export { Category };