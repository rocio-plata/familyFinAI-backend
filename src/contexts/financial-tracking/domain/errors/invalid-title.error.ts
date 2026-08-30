// contexts/financial-tracking/domain/errors/invalid-title.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidTitleError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_TITLE";

  constructor(reason: string) {
    super(reason);
  }
}

export { InvalidTitleError };