// contexts/financial-tracking/domain/errors/invalid-id.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidFinancialItemIdError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_FINANCIAL_ITEM_ID";

  constructor(value: string) {
    super(`'${value}' no es un FinancialItemId válido`);
  }
}

class InvalidCategoryIdError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_ID";

  constructor(value: string) {
    super(`'${value}' no es un CategoryId válido`);
  }
}

class InvalidTagIdError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_TAG_ID";

  constructor(value: string) {
    super(`'${value}' no es un TagId válido`);
  }
}

export { InvalidFinancialItemIdError, InvalidCategoryIdError, InvalidTagIdError };
