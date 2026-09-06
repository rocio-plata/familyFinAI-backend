// /src/contexts/family-access/domain/errors/invalid-family-order.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidFamilyOrderError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_FAMILY_ORDER";

  constructor() {
    super("El array de familias recibido no coincide con las familias actuales del usuario");
  }
}

export { InvalidFamilyOrderError };
