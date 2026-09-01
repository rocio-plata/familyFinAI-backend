// platform/auth/errors/invalid-refresh-token.error.ts
import { DomainError } from "../../../shared-kernel/errors/domain-error.js";

class InvalidRefreshTokenError extends DomainError {
  readonly code = "AUTH.INVALID_REFRESH_TOKEN";

  constructor() {
    super("El refresh token es inválido, expiró o ya fue revocado");
  }
}

export { InvalidRefreshTokenError };
