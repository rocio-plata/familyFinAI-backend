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
  private constructor(
    private readonly _id: FinancialItemId,
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

  get id(): FinancialItemId {
    return this._id;
  }

  get categoryAssignment(): CategoryAssignment {
    return this.category;
  }

  reclassify(newCategory: CategoryAssignment): void {
    this.category = newCategory;
  }

  updateAmount(newAmount: Money): void {
    this.amount = newAmount;
  }

  /** Devuelve y limpia los eventos de dominio acumulados en este agregado 
  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
    */

}

export { FinancialItem };
export type { CreateFinancialItemProps };