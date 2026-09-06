// tests/contexts/family-access/family-access.module.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { buildFamilyAccessModule } from "../../../src/contexts/family-access/family-access.module.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "./doubles/in-memory-invitation.repository.js";
import { FakeUserDirectory } from "./doubles/fake-user-directory.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { FakeJwtService } from "../../platform/auth/doubles/fake-jwt-service.js";
import { authenticate } from "../../../src/platform/auth/authenticate.middleware.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";

describe("buildFamilyAccessModule", () => {
  test("registra las rutas del contexto y quedan operativas end-to-end", async () => {
    const jwtService = new FakeJwtService();
    const userId = UserId.generate();
    const token = await jwtService.sign(userId);

    const app = Fastify();
    const module = buildFamilyAccessModule({
      familyRepository: new InMemoryFamilyRepository(),
      invitationRepository: new InMemoryInvitationRepository(),
      userDirectory: new FakeUserDirectory(),
      eventBus: new FakeEventBus(),
    });

    module.registerRoutes(app, authenticate(jwtService));

    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Familia Pérez" },
    });

    assert.equal(response.statusCode, 201);
  });

  test("expone los casos de uso construidos, listos para usar desde otros módulos", () => {
    const module = buildFamilyAccessModule({
      familyRepository: new InMemoryFamilyRepository(),
      invitationRepository: new InMemoryInvitationRepository(),
      userDirectory: new FakeUserDirectory(),
      eventBus: new FakeEventBus(),
    });

    assert.ok(module.useCases.createFamily);
    assert.ok(module.useCases.getFamilyMembership); // el que necesita requireFamilyMembership
  });
});