// contexts/financial-tracking/domain/entities/category.ts

import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidTagOrderError } from "../errors/invalid-tag-order.error.js";
import { CategoryCreated } from "../events/category-created.event.js";
import { CategoryDeprecated } from "../events/category-deprecated.event.js";
import { CategoryReactivated } from "../events/category-reactivated.event.js";
import { TagCreated } from "../events/tag-created.event.js";
import { CategoryId } from "../value-objects/category-id.js";
import type { CategoryName } from "../value-objects/category-name.js";
import { CategoryStatus } from "../value-objects/category-status.js";
import type { TagId } from "../value-objects/tag-id.js";
import type { TagName } from "../value-objects/tag-name.js";
import { Tag } from "./tag.js";

class Category {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: CategoryId,
    private readonly _familyId: FamilyId,
    private _name: CategoryName,
    private _status: CategoryStatus,
    private _tags: Tag[],
  ) {}

  get id(): CategoryId {
    return this._id;
  }
  get familyId(): FamilyId {
    return this._familyId;
  }
  get name(): CategoryName {
    return this._name;
  }
  get status(): CategoryStatus {
    return this._status;
  }
  get tags(): readonly Tag[] {
    return this._tags;
  } // readonly array — evita que muten la lista desde fuera

  static create(familyId: FamilyId, name: CategoryName): Category {
    const category = new Category(CategoryId.generate(), familyId, name, CategoryStatus.Active, []);
    category.domainEvents.push(
      new CategoryCreated(category.id, category.familyId.toString(), category.name.toString()),
    );
    return category;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }

  addTag(name: TagName): void {
    const nextOrder = this.tags.length;
    const tag = Tag.create(name, nextOrder);
    this._tags.push(tag);
    this.domainEvents.push(new TagCreated(tag.id, this.id, this.familyId.toString()));
  }

  rename(newName: CategoryName): void {
    this._name = newName;
  }

  deprecate(): void {
    this._status = CategoryStatus.Deprecated;
    this.domainEvents.push(new CategoryDeprecated(this.id, this.familyId.toString()));
  }

  reactivate(): void {
    this._status = CategoryStatus.Active;
    this.domainEvents.push(new CategoryReactivated(this.id, this.familyId.toString()));
  }

  reorderTags(orderedTagIds: TagId[]): void {
    const currentIds = this._tags.map((tag) => tag.id);
    const sameLength = orderedTagIds.length === currentIds.length;
    const noDuplicates =
      new Set(orderedTagIds.map((id) => id.toString())).size === orderedTagIds.length;
    const sameSet =
      sameLength &&
      noDuplicates &&
      currentIds.every((id) => orderedTagIds.some((orderedId) => orderedId.equals(id)));

    if (!sameSet) {
      throw new InvalidTagOrderError();
    }

    for (const [index, tagId] of orderedTagIds.entries()) {
      const tag = this._tags.find((t) => t.id.equals(tagId));
      tag?.changeDisplayOrder(index);
    }
  }

  removeTag(tagId: TagId): void {
    // llamado únicamente por TagDeletionService tras confirmar que no tiene items asociados
    this._tags = this._tags.filter((tag) => !tag.id.equals(tagId));
  }

  markAsDeleted(): void {
    // llamado únicamente por CategoryDeletionService tras confirmar que no tiene items asociados
  }
}

export { Category };
