// /src/contexts/identity/domain/errors/email-already-registered.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class EmailAlreadyRegisteredError extends DomainError {
  readonly code = "IDENTITY.EMAIL_ALREADY_REGISTERED";

  constructor(email: string) {
    super(`Ya existe una cuenta registrada con el correo '${email}'`);
  }
}

export { EmailAlreadyRegisteredError };
