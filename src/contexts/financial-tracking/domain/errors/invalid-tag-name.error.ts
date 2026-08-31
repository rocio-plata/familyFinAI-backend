// contexts/financial-tracking/domain/errors/invalid-tag-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidTagNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_TAG_NAME";
}

export { InvalidTagNameError };
