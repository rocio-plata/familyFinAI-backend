// tests/contexts/financial-tracking/http/create-financial-item.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { TagName } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { buildApp } from "../../../../src/platform/app.js";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("POST /families/:familyId/items", () => {
  let app: FastifyInstance;
  let familyId: string;
  let categoryId: string;
  let tagId: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.changeDefaultCurrency(Currency.of("USD"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const category = Category.create(family.id, CategoryName.of("Alimentación"));
    category.addTag(TagName.of("Supermercado"));
    category.pullDomainEvents();
    categoryRepository.add(category);

    familyId = family.id.toString();
    categoryId = category.id.toString();
    tagId = category.tags[0].id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ categoryRepository }),
    });
  });

  test("registra un gasto con la moneda predeterminada de la familia", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/items`,
      headers: { authorization: memberAuthorization },
      payload: {
        amount: 25.5,
        categoryId,
        tagId,
        title: "Compra semanal",
        note: "Oferta",
        occurredOn: "2026-08-01T12:00:00.000Z",
      },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.ok(body.id);
    assert.equal(body.type, "EXPENSE");
    assert.equal(body.amount, 25.5);
    assert.equal(body.currency, "USD");
    assert.equal(body.categoryId, categoryId);
    assert.equal(body.tagId, tagId);
    assert.equal(body.title, "Compra semanal");
    assert.equal(body.note, "Oferta");
    assert.equal(body.occurredOn, "2026-08-01T12:00:00.000Z");
  });

  test("permite indicar una moneda y tipo de movimiento explícitos", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/items`,
      headers: { authorization: memberAuthorization },
      payload: {
        type: "INCOME",
        amount: 1000,
        currency: "CLP",
        categoryId,
        title: "Pago recibido",
        occurredOn: "2026-08-02T12:00:00.000Z",
      },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.equal(body.type, "INCOME");
    assert.equal(body.currency, "CLP");
    assert.equal(body.tagId, null);
  });

  test("rechaza a quien no pertenece a la familia", async () => {
    const jwtService = new FakeJwtService();
    const outsiderAuthorization = `Bearer ${await jwtService.sign(UserId.generate())}`;
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/items`,
      headers: { authorization: outsiderAuthorization },
      payload: {
        amount: 25.5,
        categoryId,
        title: "Compra semanal",
        occurredOn: "2026-08-01T12:00:00.000Z",
      },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza un body sin monto", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/items`,
      headers: { authorization: memberAuthorization },
      payload: {
        categoryId,
        title: "Compra semanal",
        occurredOn: "2026-08-01T12:00:00.000Z",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
