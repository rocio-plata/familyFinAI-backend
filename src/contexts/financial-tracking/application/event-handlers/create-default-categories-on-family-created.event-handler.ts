// src/contexts/financial-tracking/application/event-handlers/create-default-categories-on-family-created.event-handler.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyCreated } from "../../../family-access/domain/events/family-created.event.js";
import { Category } from "../../domain/entities/category.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";

class CreateDefaultCategoriesOnFamilyCreatedEventHandler {
  private static readonly DEFAULT_EXPENSE_CATEGORY_NAMES = [
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

  private static readonly DEFAULT_INCOME_CATEGORY_NAMES = ["Salario", "Ventas", "Otros"];

  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async handle(event: FamilyCreated): Promise<void> {
    const familyCategories = await this.categoryRepository.findByFamilyId(event.familyId);

    const defaults = [
      ...CreateDefaultCategoriesOnFamilyCreatedEventHandler.DEFAULT_EXPENSE_CATEGORY_NAMES.map(
        (name) => ({ name, type: FinancialItemType.Expense }),
      ),
      ...CreateDefaultCategoriesOnFamilyCreatedEventHandler.DEFAULT_INCOME_CATEGORY_NAMES.map(
        (name) => ({ name, type: FinancialItemType.Income }),
      ),
    ];

    const nextOrder = new Map<FinancialItemType, number>(
      [FinancialItemType.Expense, FinancialItemType.Income].map((type) => [
        type,
        familyCategories.filter((cat) => cat.type === type).length,
      ]),
    );

    for (const { name: nameStr, type } of defaults) {
      const categoryName = CategoryName.of(nameStr);
      const exists = familyCategories.some(
        (cat) => cat.type === type && cat.name.equals(categoryName),
      );

      if (!exists) {
        const displayOrder = nextOrder.get(type) ?? 0;
        nextOrder.set(type, displayOrder + 1);
        const category = Category.create(
          event.familyId,
          type,
          categoryName,
          undefined,
          undefined,
          displayOrder,
        );
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
