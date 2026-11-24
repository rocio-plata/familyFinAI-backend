// /src/contexts/financial-tracking/domain/entities/category.ts

import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidTagOrderError } from "../errors/invalid-tag-order.error.js";
import { TagNotFoundError } from "../errors/tag-not-found.error.js";
import { CategoryCreated } from "../events/category-created.event.js";
import { CategoryDeprecated } from "../events/category-deprecated.event.js";
import { CategoryReactivated } from "../events/category-reactivated.event.js";
import { TagCreated } from "../events/tag-created.event.js";
import { TagDeprecated } from "../events/tag-deprecated.event.js";
import { TagReactivated } from "../events/tag-reactivated.event.js";
import { CategoryColor } from "../value-objects/category-color.js";
import { CategoryIcon } from "../value-objects/category-icon.js";
import { CategoryId } from "../value-objects/category-id.js";
import { CategoryName } from "../value-objects/category-name.js";
import { CategoryStatus } from "../value-objects/category-status.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import type { TagId } from "../value-objects/tag-id.js";
import type { TagName } from "../value-objects/tag-name.js";
import type { TagStatus } from "../value-objects/tag-status.js";
import { Tag } from "./tag.js";

interface ReconstituteCategoryTagProps {
  id: string;
  name: string;
  displayOrder: number;
  status: TagStatus;
}

interface ReconstituteCategoryProps {
  id: string;
  familyId: string;
  type: FinancialItemType;
  name: string;
  icon?: string | null;
  color?: string | null;
  status: CategoryStatus;
  deprecatedAt?: Date | null;
  displayOrder?: number;
  tags: ReconstituteCategoryTagProps[];
}

class Category {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: CategoryId,
    private readonly _familyId: FamilyId,
    private readonly _type: FinancialItemType,
    private _name: CategoryName,
    private _icon: CategoryIcon | null,
    private _color: CategoryColor | null,
    private _status: CategoryStatus,
    private _deprecatedAt: Date | null,
    private _displayOrder: number,
    private _tags: Tag[],
  ) {}

  get id(): CategoryId {
    return this._id;
  }
  get familyId(): FamilyId {
    return this._familyId;
  }
  get type(): FinancialItemType {
    return this._type;
  }
  get name(): CategoryName {
    return this._name;
  }
  get icon(): CategoryIcon | null {
    return this._icon;
  }
  get color(): CategoryColor | null {
    return this._color;
  }
  get status(): CategoryStatus {
    return this._status;
  }
  get deprecatedAt(): Date | null {
    return this._deprecatedAt;
  }
  get displayOrder(): number {
    return this._displayOrder;
  }
  get tags(): readonly Tag[] {
    return this._tags;
  } // readonly array — evita que muten la lista desde fuera

  static create(
    familyId: FamilyId,
    type: FinancialItemType,
    name: CategoryName,
    icon?: CategoryIcon,
    color?: CategoryColor,
    displayOrder = 0,
  ): Category {
    const category = new Category(
      CategoryId.generate(),
      familyId,
      type,
      name,
      icon ?? null,
      color ?? null,
      CategoryStatus.Active,
      null,
      displayOrder,
      [],
    );
    category.domainEvents.push(
      new CategoryCreated(category.id, category.familyId.toString(), category.name.toString()),
    );
    return category;
  }

  static reconstitute(props: ReconstituteCategoryProps): Category {
    return new Category(
      CategoryId.of(props.id),
      FamilyId.of(props.familyId),
      props.type,
      CategoryName.of(props.name),
      props.icon ? CategoryIcon.of(props.icon) : null,
      props.color ? CategoryColor.of(props.color) : null,
      props.status,
      props.deprecatedAt ?? null,
      props.displayOrder ?? 0,
      props.tags.map((tag) => Tag.reconstitute(tag)),
    );
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

  updateIcon(newIcon: CategoryIcon | null): void {
    this._icon = newIcon;
  }

  updateColor(newColor: CategoryColor | null): void {
    this._color = newColor;
  }

  deprecate(): void {
    this._status = CategoryStatus.Deprecated;
    this._deprecatedAt = new Date();
    this.domainEvents.push(new CategoryDeprecated(this.id, this.familyId.toString()));
  }

  reactivate(): void {
    this._status = CategoryStatus.Active;
    this._deprecatedAt = null;
    this.domainEvents.push(new CategoryReactivated(this.id, this.familyId.toString()));
  }

  changeDisplayOrder(newOrder: number): void {
    this._displayOrder = newOrder;
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

  deprecateTag(tagId: TagId): void {
    const tag = this._tags.find((t) => t.id.equals(tagId));
    if (!tag) {
      throw new TagNotFoundError(tagId.toString());
    }
    tag.deprecate();
    this.domainEvents.push(new TagDeprecated(tag.id, this.id, this.familyId.toString()));
  }

  reactivateTag(tagId: TagId): void {
    const tag = this._tags.find((t) => t.id.equals(tagId));
    if (!tag) {
      throw new TagNotFoundError(tagId.toString());
    }
    tag.reactivate();
    this.domainEvents.push(new TagReactivated(tag.id, this.id, this.familyId.toString()));
  }

  removeTag(tagId: TagId): void {
    // llamado únicamente por TagDeletionService tras confirmar que no tiene items asociados
    this._tags = this._tags.filter((tag) => !tag.id.equals(tagId));
  }

  markAsDeleted(): void {
    // llamado únicamente por CategoryDeletionService tras confirmar que no tiene items asociados
  }
}

export type { ReconstituteCategoryProps, ReconstituteCategoryTagProps };
export { Category };
