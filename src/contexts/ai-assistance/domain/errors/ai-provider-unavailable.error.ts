// src/contexts/ai-assistance/domain/errors/ai-provider-unavailable.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class AIProviderUnavailableError extends DomainError {
  readonly code = "AI_ASSISTANCE.PROVIDER_UNAVAILABLE";

  constructor() {
    super("El proveedor de IA no esta disponible");
  }
}

export { AIProviderUnavailableError };
