// src/contexts/financial-tracking/domain/entities/financial-item.ts
import type { DomainEvent } from '../../../../shared-kernel/domain/domain-event.js';
import { FinancialItemId } from '../value-objects/financial-item-id.js';
import { FamilyId } from '../../../family-access/domain/value-objects/family-id.js';
import { UserId } from '../../../family-access/domain/value-objects/user-id.js';
import { FinancialItemType } from '../value-objects/financial-item-type.js';
import { Money } from '../value-objects/money.js';
import { CategoryAssignment } from '../value-objects/category-assignment.js';
import { Title } from '../value-objects/title.js';
import { Note } from '../value-objects/note.js';
import { TransactionDate } from '../value-objects/transaction-date.js';

interface CreateFinancialItemProps {
  familyId: FamilyId;
  recordedBy: UserId;
  type?: FinancialItemType;
  amount: Money;
  category: CategoryAssignment;
  title: Title;
  note?: Note;
  occurredOn: TransactionDate;
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

  get id(): FinancialItemId { return this._id; }
  get familyId(): FamilyId { return this._familyId; }
  get recordedBy(): UserId { return this._recordedBy; }
  get type(): FinancialItemType { return this._type; }
  get amount(): Money { return this._amount; }
  get categoryAssignment(): CategoryAssignment { return this._category; }
  get title(): Title { return this._title; }
  get note(): Note | null { return this._note; }
  get occurredOn(): TransactionDate { return this._occurredOn; }
  get createdAt(): Date { return this._createdAt; }

  static create(props: CreateFinancialItemProps): FinancialItem { 
    const item = new FinancialItem(
      FinancialItemId.generate(),
      props.familyId,
      props.recordedBy,
      props.type ?? FinancialItemType.Expense,   // valor por defecto, como definiste en la especificación
      props.amount,
      props.category,
      props.title,
      props.note ?? null,
      props.occurredOn,
      new Date(),
    );

    /** Dispara el evento ItemRecorded 
    item.domainEvents.push(
      new ItemRecorded(
        item.id,
        item.familyId,
        item.category.categoryId,
        item.category.tagId,
        item.amount,
        item.type,
      ),
    );
    */
    return item;
  }

  reclassify(newCategory: CategoryAssignment): void {
    this._category = newCategory;
  }

  updateAmount(newAmount: Money): void {
    this._amount = newAmount;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}

export { FinancialItem };
export type { CreateFinancialItemProps };