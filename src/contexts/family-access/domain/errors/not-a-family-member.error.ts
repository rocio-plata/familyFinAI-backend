// src/contexts/family-access/domain/errors/not-a-family-member.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class NotAFamilyMemberError extends DomainError {
  readonly code = "FAMILY.NOT_A_MEMBER";

  constructor() {
    super("No perteneces a esta familia");
  }
}

export { NotAFamilyMemberError };
