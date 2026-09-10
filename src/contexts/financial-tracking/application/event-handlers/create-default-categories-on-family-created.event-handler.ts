// src/contexts/financial-tracking/application/event-handlers/create-default-categories-on-family-created.event-handler.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyCreated } from "../../../family-access/domain/events/family-created.event.js";
import { Category } from "../../domain/entities/category.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";

class CreateDefaultCategoriesOnFamilyCreatedEventHandler {
  private static readonly DEFAULT_CATEGORY_NAMES = [
    "Comestibles",
    "Salud",
    "Restaurantes",
    "Servicios",
    "Compras",
    "Regalos",
    "Familia",
    "Tiempo Libre",
    "Transporte",
  ];

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async handle(event: FamilyCreated): Promise<void> {
    const familyCategories = await this.categoryRepository.findByFamilyId(event.familyId);

    for (const nameStr of CreateDefaultCategoriesOnFamilyCreatedEventHandler.DEFAULT_CATEGORY_NAMES) {
      const categoryName = CategoryName.of(nameStr);
      const exists = familyCategories.some((cat) => cat.name.equals(categoryName));

      if (!exists) {
        const category = Category.create(event.familyId, FinancialItemType.Expense, categoryName);
        await this.categoryRepository.save(category);

        if (this.eventBus) {
          const events = category.pullDomainEvents();
          for (const domainEvent of events) {
            await this.eventBus.publish(domainEvent);
          }
        }
      }
    }
  }
}

export { CreateDefaultCategoriesOnFamilyCreatedEventHandler };
