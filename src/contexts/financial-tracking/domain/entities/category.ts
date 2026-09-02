// contexts/financial-tracking/domain/entities/category.ts

import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { CategoryCreated } from "../events/category-created.event.js";
import { CategoryDeprecated } from "../events/category-deprecated.event.js";
import { CategoryReactivated } from "../events/category-reactivated.event.js";
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
    this._tags.push(Tag.create(name, nextOrder));
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

  reorderTags(_orderedTagIds: TagId[]): void {
    // valida que orderedTagIds contenga exactamente los mismos IDs que this._tags,
    // luego reasigna displayOrder de cada Tag según su posición en el array
  }

  markAsDeleted(): void {
    // llamado únicamente por CategoryDeletionService tras confirmar que no tiene items asociados
  }
}

export { Category };
