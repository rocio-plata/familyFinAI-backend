// src/contexts/reporting/application/queries/get-drill-down.query.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { GetCategoriesQuery } from "../../../financial-tracking/application/queries/get-categories.query.js";
import type {
  FinancialItemDTO,
  GetFinancialItemsQuery,
} from "../../../financial-tracking/application/queries/get-financial-items.query.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { TagId } from "../../../financial-tracking/domain/value-objects/tag-id.js";
import type { TagName } from "../../../financial-tracking/domain/value-objects/tag-name.js";
import { TagWithoutCategoryError } from "../../domain/errors/tag-without-category.error.js";
import type {
  CategoryBreakdownDTO,
  GetCategoryBreakdownQuery,
} from "./get-category-breakdown.query.js";

interface GetDrillDownInput {
  familyId: FamilyId;
  period: Period;
  categoryId?: CategoryId;
  tagId?: TagId;
}

interface CategoryDrillDownDTO {
  level: "category";
  entries: CategoryBreakdownDTO[];
}

interface TagBreakdownDTO {
  tagId: TagId;
  tagName: TagName;
  amount: Money;
  itemCount: number;
}

interface TagDrillDownDTO {
  level: "tag";
  entries: TagBreakdownDTO[];
}

interface ItemDrillDownDTO {
  level: "item";
  entries: FinancialItemDTO[];
}

type DrillDownDTO = CategoryDrillDownDTO | TagDrillDownDTO | ItemDrillDownDTO;

class GetDrillDownQuery {
  constructor(
    private readonly getCategoryBreakdownQuery: GetCategoryBreakdownQuery,
    private readonly getFinancialItemsQuery: GetFinancialItemsQuery,
    private readonly getCategoriesQuery: GetCategoriesQuery,
  ) {}

  async execute(input: GetDrillDownInput): Promise<DrillDownDTO> {
    if (input.tagId && !input.categoryId) {
      throw new TagWithoutCategoryError();
    }

    if (!input.categoryId) {
      return {
        level: "category",
        entries: await this.getCategoryBreakdownQuery.execute({
          familyId: input.familyId,
          period: input.period,
        }),
      };
    }

    const items = await this.getFinancialItemsQuery.execute({
      familyId: input.familyId,
      period: this.toDateRange(input.period),
      categoryId: input.categoryId,
      type: FinancialItemType.Expense,
      ...(input.tagId ? { tagId: input.tagId } : {}),
    });

    if (input.tagId) {
      return {
        level: "item",
        entries: items,
      };
    }

    return {
      level: "tag",
      entries: await this.toTagBreakdown(input.familyId, input.categoryId, items),
    };
  }

  private async toTagBreakdown(
    familyId: FamilyId,
    categoryId: CategoryId,
    items: FinancialItemDTO[],
  ): Promise<TagBreakdownDTO[]> {
    const categories = await this.getCategoriesQuery.execute({
      familyId,
      includeDeprecated: true,
    });
    const category = categories.find((candidate) => candidate.id.equals(categoryId));
    const tagsById = new Map(category?.tags.map((tag) => [tag.id.toString(), tag]) ?? []);
    const grouped = new Map<
      string,
      {
        tagId: TagId;
        tagName: TagName;
        amount: number;
        currency: Money["currency"];
        itemCount: number;
      }
    >();

    for (const item of items) {
      if (!item.tagId) continue;
      const tag = tagsById.get(item.tagId.toString());
      if (!tag) continue;
      const current = grouped.get(item.tagId.toString());
      grouped.set(item.tagId.toString(), {
        tagId: item.tagId,
        tagName: tag.name,
        amount: (current?.amount ?? 0) + item.amount.amount,
        currency: item.amount.currency,
        itemCount: (current?.itemCount ?? 0) + 1,
      });
    }

    return [...grouped.values()]
      .map((entry) => ({
        tagId: entry.tagId,
        tagName: entry.tagName,
        amount: Money.of(entry.amount, entry.currency),
        itemCount: entry.itemCount,
      }))
      .sort((first, second) => second.amount.amount - first.amount.amount);
  }

  private toDateRange(period: Period): { from: Date; to: Date } {
    const from = new Date(`${period.toString()}-01T00:00:00.000Z`);
    const nextPeriod = new Date(`${period.next().toString()}-01T00:00:00.000Z`);
    return { from, to: new Date(nextPeriod.getTime() - 1) };
  }
}

export type {
  CategoryDrillDownDTO,
  DrillDownDTO,
  GetDrillDownInput,
  ItemDrillDownDTO,
  TagBreakdownDTO,
  TagDrillDownDTO,
};
export { GetDrillDownQuery };
