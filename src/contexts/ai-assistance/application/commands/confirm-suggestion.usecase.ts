// src/contexts/ai-assistance/application/commands/confirm-suggestion.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { Money } from "../../../../shared-kernel/domain/money.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { TagId } from "../../../financial-tracking/domain/value-objects/tag-id.js";
import { Title } from "../../../financial-tracking/domain/value-objects/title.js";
import type { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import { MerchantCategoryHistory } from "../../domain/entities/merchant-category-history.js";
import type { SuggestionEdits } from "../../domain/entities/suggestion-fields.js";
import { SuggestionNotFoundError } from "../../domain/errors/suggestion-not-found.error.js";
import { MerchantCategoryLearned } from "../../domain/events/merchant-category-learned.event.js";
import type { MerchantCategoryHistoryRepository } from "../../domain/repositories/merchant-category-history.repository.js";
import type { SuggestionRepository } from "../../domain/repositories/suggestion.repository.js";
import type { SuggestionId } from "../../domain/value-objects/suggestion-id.js";

type ConfirmedSuggestionCommand = {
  familyId: FamilyId;
  recordedBy: UserId;
  amount: Money;
  categoryId: CategoryId;
  tagId: TagId | null;
  title: Title;
  occurredOn: TransactionDate;
};

type CreateFinancialItemPort = {
  execute(command: ConfirmedSuggestionCommand): Promise<unknown>;
};

type ConfirmSuggestionInput = {
  familyId: FamilyId;
  requestedBy: UserId;
  suggestionId: SuggestionId;
  edits: SuggestionEdits;
};

class ConfirmSuggestionUseCase {
  constructor(
    private readonly suggestionRepository: SuggestionRepository,
    private readonly createFinancialItem: CreateFinancialItemPort,
    private readonly merchantHistoryRepository: MerchantCategoryHistoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ConfirmSuggestionInput): Promise<void> {
    const suggestion = await this.suggestionRepository.findById(input.suggestionId);
    if (!suggestion || suggestion.familyId !== input.familyId.toString()) {
      throw new SuggestionNotFoundError(input.suggestionId.toString());
    }

    const confirmed = suggestion.confirm(input.edits);
    const categoryId = CategoryId.of(confirmed.categoryId ?? "");
    const tagId = confirmed.tagId === null ? null : TagId.of(confirmed.tagId);
    const title = Title.of(confirmed.title ?? "");

    await this.createFinancialItem.execute({
      familyId: FamilyId.of(confirmed.familyId),
      recordedBy: UserId.of(confirmed.requestedBy),
      amount: confirmed.amount,
      categoryId,
      tagId,
      title,
      occurredOn: confirmed.occurredOn,
    });

    await this.suggestionRepository.save(suggestion);

    if (confirmed.source === "RECEIPT" && confirmed.merchantName && "merchantName" in suggestion) {
      const merchantName = suggestion.merchantName;
      const history = await this.merchantHistoryRepository.findByMerchant(
        confirmed.familyId,
        merchantName,
      );
      if (history) {
        history.reinforce(confirmed.categoryId ?? "", confirmed.tagId);
        await this.merchantHistoryRepository.save(history);
      } else {
        const newHistory = MerchantCategoryHistory.create({
          familyId: confirmed.familyId,
          merchantName,
          categoryId: confirmed.categoryId ?? "",
          tagId: confirmed.tagId,
        });
        await this.merchantHistoryRepository.save(newHistory);
      }
      await this.eventBus.publish(
        new MerchantCategoryLearned(
          confirmed.familyId,
          merchantName,
          confirmed.categoryId ?? "",
          confirmed.tagId,
        ),
      );
    }

    for (const event of suggestion.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}

export type { ConfirmedSuggestionCommand, ConfirmSuggestionInput };
export { ConfirmSuggestionUseCase };
