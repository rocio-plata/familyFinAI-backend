// /src/contexts/identity/domain/errors/user-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class UserNotFoundError extends DomainError {
  readonly code = "IDENTITY.USER_NOT_FOUND";

  constructor(userId: string) {
    super(`El usuario con id '${userId}' no existe`);
  }
}

export { UserNotFoundError };
