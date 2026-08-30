// contexts/financial-tracking/domain/entities/financial-item.ts
import { FinancialItemId } from '../value-objects/financial-item-id.js';
import { FamilyId } from '../../../family-access/domain/value-objects/family-id.js';
import { UserId } from '../../../family-access/domain/value-objects/user-id.js';
import { FinancialItemType } from '../value-objects/financial-item-type.js';
import { Money } from '../value-objects/money.js';
import { CategoryAssignment } from '../value-objects/category-assignment.js';
import { Title } from '../value-objects/title.js';
import { Note } from '../value-objects/note.js';
import { TransactionDate } from '../value-objects/transaction-date.js';
import type { DomainEvent } from '../../../../shared-kernel/domain/domain-event.js';

class FinancialItem {

  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: FinancialItemId,
    private readonly familyId: FamilyId,        // referencia al contexto Family & Access (solo el ID, no el objeto)
    private readonly recordedBy: UserId,          // idem
    private type: FinancialItemType,               // Expense | Income
    private amount: Money,
    private category: CategoryAssignment,
    private title: Title,
    private note: Note | null,
    private occurredOn: TransactionDate,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateFinancialItemProps): FinancialItem {
    const item = new FinancialItem(/* ... */);
    item.domainEvents.push(new ItemRecorded(item.id, item.familyId, /* ... */));
    return item;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }

  reclassify(newCategory: CategoryAssignment): void { /* invariante: no se puede reclasificar un item archivado */ }
  updateAmount(newAmount: Money): void { /* dispara ItemAmountChanged */ }
}

export { FinancialItem };