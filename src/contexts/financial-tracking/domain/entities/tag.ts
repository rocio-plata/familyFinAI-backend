// /src/contexts/financial-tracking/domain/entities/tag.ts

import { TagId } from "../value-objects/tag-id.js";
import { TagName } from "../value-objects/tag-name.js";
import { TagStatus } from "../value-objects/tag-status.js";

interface ReconstituteTagProps {
  id: string;
  name: string;
  displayOrder: number;
  status: TagStatus;
}

class Tag {
  private constructor(
    private readonly _id: TagId,
    private _name: TagName,
    private _displayOrder: number,
    private _status: TagStatus,
  ) {}

  get id(): TagId {
    return this._id;
  }
  get name(): TagName {
    return this._name;
  }
  get displayOrder(): number {
    return this._displayOrder;
  }
  get status(): TagStatus {
    return this._status;
  }

  static create(name: TagName, displayOrder: number): Tag {
    return new Tag(TagId.generate(), name, displayOrder, TagStatus.Active);
  }

  static reconstitute(props: ReconstituteTagProps): Tag {
    return new Tag(TagId.of(props.id), TagName.of(props.name), props.displayOrder, props.status);
  }

  rename(newName: TagName): void {
    this._name = newName;
  }

  changeDisplayOrder(newOrder: number): void {
    this._displayOrder = newOrder;
  }

  deprecate(): void {
    this._status = TagStatus.Deprecated;
  }
}

export type { ReconstituteTagProps };
export { Tag };
