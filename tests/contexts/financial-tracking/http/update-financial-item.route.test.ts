// tests/contexts/financial-tracking/http/update-financial-item.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FinancialItem } from "../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Title } from "../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { buildApp } from "../../../../src/platform/app.js";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryFinancialItemRepository } from "../doubles/in-memory-financial-item.repository.js";

describe("PATCH /families/:familyId/items/:itemId", () => {
  let app: FastifyInstance;
  let familyId: string;
  let itemId: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const financialItemRepository = new InMemoryFinancialItemRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const item = FinancialItem.create({
      familyId: family.id,
      recordedBy: ownerId,
      amount: Money.of(5000, Currency.of("USD")),
      category: CategoryAssignment.of(CategoryId.generate()),
      title: Title.of("Compra semanal"),
      occurredOn: TransactionDate.of(new Date("2026-08-01T12:00:00.000Z")),
    });
    item.pullDomainEvents();
    await financialItemRepository.save(item);

    familyId = family.id.toString();
    itemId = item.id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ financialItemRepository }),
    });
  });

  test("actualiza los campos editables de un movimiento", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}`,
      headers: { authorization: memberAuthorization },
      payload: {
        amount: 7500,
        currency: "USD",
        title: "Compra en farmacia",
        note: "Con receta",
        occurredOn: "2026-08-02T12:00:00.000Z",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.amount, 7500);
    assert.equal(body.currency, "USD");
    assert.equal(body.title, "Compra en farmacia");
    assert.equal(body.note, "Con receta");
    assert.equal(body.occurredOn, "2026-08-02T12:00:00.000Z");
  });

  test("permite eliminar la nota con null", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}`,
      headers: { authorization: memberAuthorization },
      payload: { note: null },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).note, null);
  });

  test("rechaza cambios de categoría por esta ruta", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}`,
      headers: { authorization: memberAuthorization },
      payload: { categoryId: CategoryId.generate().toString() },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza la actualización sin token", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}`,
      payload: { title: "Compra en farmacia" },
    });

    assert.equal(response.statusCode, 401);
  });
});
