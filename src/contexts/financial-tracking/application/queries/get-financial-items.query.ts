// src/contexts/financial-tracking/application/queries/get-financial-items.query.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type {
  FinancialItemFilters,
  FinancialItemRepository,
} from "../../domain/repositories/financial-item.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { FinancialItemId } from "../../domain/value-objects/financial-item-id.js";
import type { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";
import type { Money } from "../../domain/value-objects/money.js";
import type { Note } from "../../domain/value-objects/note.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import type { Title } from "../../domain/value-objects/title.js";

interface GetFinancialItemsInput {
  familyId: FamilyId;
  period?: { from: Date; to: Date };
  categoryId?: CategoryId;
  tagId?: TagId;
  type?: FinancialItemType;
}

interface FinancialItemDTO {
  id: FinancialItemId;
  familyId: FamilyId;
  recordedBy: UserId;
  type: FinancialItemType;
  amount: Money;
  categoryId: CategoryId;
  tagId: TagId | null;
  title: Title;
  note: Note | null;
  occurredOn: Date;
  createdAt: Date;
}

class GetFinancialItemsQuery {
  constructor(private readonly financialItemRepository: FinancialItemRepository) {}

  async execute(input: GetFinancialItemsInput): Promise<FinancialItemDTO[]> {
    const filters: FinancialItemFilters = {};
    if (input.period) filters.period = input.period;
    if (input.categoryId) filters.categoryId = input.categoryId;
    if (input.tagId) filters.tagId = input.tagId;
    if (input.type) filters.type = input.type;

    const items = await this.financialItemRepository.findByFamilyId(input.familyId, filters);

    return items.map((item) => ({
      id: item.id,
      familyId: item.familyId,
      recordedBy: item.recordedBy,
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryAssignment.categoryId,
      tagId: item.categoryAssignment.tagId,
      title: item.title,
      note: item.note,
      occurredOn: item.occurredOn.value,
      createdAt: item.createdAt,
    }));
  }
}

export type { FinancialItemDTO };
export { GetFinancialItemsQuery };
