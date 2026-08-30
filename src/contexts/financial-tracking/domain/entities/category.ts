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
    private readonly id: CategoryId,
    private readonly familyId: FamilyId,
    private name: CategoryName,
    private status: CategoryStatus,
    private readonly tags: Tag[], // orden = displayOrder
  ) {}

  deprecate(): void {
    this.status = CategoryStatus.Deprecated;
  }

  reactivate(): void {
    this.status = CategoryStatus.Active;
  }

   addTag(name: TagName): void {
    const nextOrder = this.tags.length; // se añade al final por defecto
    this.tags.push(Tag.create(name, nextOrder));
  }

  reorderTags(orderedTagIds: TagId[]): void {
    // valida que orderedTagIds contenga exactamente los mismos IDs que this.tags
    // y reasigna displayOrder según la posición en el array
  }
}

export { Category };