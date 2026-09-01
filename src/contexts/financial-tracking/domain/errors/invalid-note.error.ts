// contexts/financial-tracking/domain/errors/invalid-note.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidNoteError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_NOTE";
}

export { InvalidNoteError };
