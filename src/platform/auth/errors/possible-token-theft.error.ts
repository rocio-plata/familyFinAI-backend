// platform/auth/errors/possible-token-theft.error.ts
import { DomainError } from "../../../shared-kernel/errors/domain-error.js";
class PossibleTokenTheftError extends DomainError {
  readonly code = "AUTH.POSSIBLE_TOKEN_THEFT";

  constructor() {
    super("Se detectó el reuso de un refresh token ya rotado; todas las sesiones fueron revocadas");
  }
}

export { PossibleTokenTheftError };