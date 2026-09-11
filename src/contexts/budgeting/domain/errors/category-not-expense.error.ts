// src/contexts/budgeting/domain/errors/category-not-expense.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CategoryNotExpenseError extends DomainError {
  readonly code = "BUDGETING.CATEGORY_NOT_EXPENSE";

  constructor(categoryId: string) {
    super(`La categoría ${categoryId} no es una categoría de gasto`);
  }
}

export { CategoryNotExpenseError };
