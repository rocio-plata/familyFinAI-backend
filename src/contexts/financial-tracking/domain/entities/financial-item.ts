// /src/contexts/financial-tracking/domain/entities/financial-item.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { CannotReclassifyAcrossTypesError } from "../errors/cannot-reclassify-across-types.error.js";
import { ItemAmountChanged } from "../events/item-amount-changed.event.js";
import { ItemReclassified } from "../events/item-reclassified.event.js";
import { ItemRecorded } from "../events/item-recorded.event.js";
import { CategoryAssignment } from "../value-objects/category-assignment.js";
import { CategoryId } from "../value-objects/category-id.js";
import { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import { Money } from "../value-objects/money.js";
import { Note } from "../value-objects/note.js";
import { TagId } from "../value-objects/tag-id.js";
import { Title } from "../value-objects/title.js";
import { TransactionDate } from "../value-objects/transaction-date.js";

interface CreateFinancialItemProps {
  familyId: FamilyId;
  recordedBy: UserId;
  amount: Money;
  category: CategoryAssignment;
  title: Title;
  note?: Note;
  occurredOn: TransactionDate;
}

interface ReconstituteFinancialItemProps {
  id: string;
  familyId: string;
  recordedBy: string;
  type: FinancialItemType;
  amount: number;
  currency: string;
  categoryId: string;
  tagId: string | null;
  title: string;
  note: string | null;
  occurredOn: Date;
  createdAt: Date;
}

class FinancialItem {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: FinancialItemId,
    private readonly _familyId: FamilyId,
    private readonly _recordedBy: UserId,
    private _type: FinancialItemType,
    private _amount: Money,
    private _category: CategoryAssignment,
    private _title: Title,
    private _note: Note | null,
    private _occurredOn: TransactionDate,
    private readonly _createdAt: Date,
  ) {}

  get id(): FinancialItemId {
    return this._id;
  }
  get familyId(): FamilyId {
    return this._familyId;
  }
  get recordedBy(): UserId {
    return this._recordedBy;
  }
  get type(): FinancialItemType {
    return this._type;
  }
  get amount(): Money {
    return this._amount;
  }
  get categoryAssignment(): CategoryAssignment {
    return this._category;
  }
  get title(): Title {
    return this._title;
  }
  get note(): Note | null {
    return this._note;
  }
  get occurredOn(): TransactionDate {
    return this._occurredOn;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  static create(props: CreateFinancialItemProps, resolvedType: FinancialItemType): FinancialItem {
    const item = new FinancialItem(
      FinancialItemId.generate(),
      props.familyId,
      props.recordedBy,
      resolvedType,
      props.amount,
      props.category,
      props.title,
      props.note ?? null,
      props.occurredOn,
      new Date(),
    );

    item.domainEvents.push(
      new ItemRecorded(
        item.id,
        item.familyId.toString(),
        item.categoryAssignment.categoryId,
        item.categoryAssignment.tagId,
        item.amount.amount,
        item.type,
        item.occurredOn.value,
        item.amount.currency.toString(),
      ),
    );
    return item;
  }

  static reconstitute(props: ReconstituteFinancialItemProps): FinancialItem {
    return new FinancialItem(
      FinancialItemId.of(props.id),
      FamilyId.of(props.familyId),
      UserId.of(props.recordedBy),
      props.type,
      Money.of(props.amount, Currency.of(props.currency)),
      CategoryAssignment.of(
        CategoryId.of(props.categoryId),
        props.tagId ? TagId.of(props.tagId) : null,
      ),
      Title.of(props.title),
      props.note === null ? null : Note.of(props.note),
      TransactionDate.of(props.occurredOn),
      props.createdAt,
    );
  }

  reclassify(newCategory: CategoryAssignment, newCategoryType: FinancialItemType): void {
    if (newCategoryType !== this._type) {
      throw new CannotReclassifyAcrossTypesError(this._type, newCategoryType);
    }
    const previousCategory = this._category;
    this._category = newCategory;
    this.domainEvents.push(
      new ItemReclassified(
        this.id,
        this.familyId.toString(),
        previousCategory.categoryId,
        newCategory.categoryId,
        previousCategory.tagId,
        newCategory.tagId,
      ),
    );
  }

  updateAmount(newAmount: Money): void {
    const previousAmount = this._amount.amount;
    this._amount = newAmount;
    this.domainEvents.push(
      new ItemAmountChanged(
        this.id,
        this.familyId.toString(),
        previousAmount,
        newAmount.amount,
        newAmount.currency.toString(),
      ),
    );
  }

  updateOccurredOn(newDate: TransactionDate): void {
    this._occurredOn = newDate;
  }

  updateTitle(newTitle: Title): void {
    this._title = newTitle;
  }

  updateNote(newNote: Note | null): void {
    this._note = newNote;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}

export type { CreateFinancialItemProps, ReconstituteFinancialItemProps };
export { FinancialItem };
