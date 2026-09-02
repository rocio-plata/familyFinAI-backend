// src/contexts/financial-tracking/domain/errors/insufficient-role.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InsufficientRoleError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INSUFFICIENT_ROLE";

  constructor() {
    super("El rol del usuario no tiene permisos suficientes para esta acción");
  }
}

export { InsufficientRoleError };
