// tests/contexts/family-access/build-test-family-access-dependencies.ts
import type { FamilyAccessModuleDependencies } from "../../../src/contexts/family-access/family-access.module.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { FakeUserDirectory } from "./doubles/fake-user-directory.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "./doubles/in-memory-invitation.repository.js";

// dependencias in-memory por defecto para tests de rutas — pasa overrides para conservar
// la referencia a un repositorio/doble puntual que el test necesite inspeccionar después
function buildTestFamilyAccessDependencies(
  overrides: Partial<FamilyAccessModuleDependencies> = {},
): FamilyAccessModuleDependencies {
  return {
    familyRepository: overrides.familyRepository ?? new InMemoryFamilyRepository(),
    invitationRepository: overrides.invitationRepository ?? new InMemoryInvitationRepository(),
    userDirectory: overrides.userDirectory ?? new FakeUserDirectory(),
    eventBus: overrides.eventBus ?? new FakeEventBus(),
  };
}

export { buildTestFamilyAccessDependencies };
