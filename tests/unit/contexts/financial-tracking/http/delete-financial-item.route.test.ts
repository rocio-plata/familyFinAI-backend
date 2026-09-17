// tests/contexts/financial-tracking/http/delete-financial-item.route.test.ts
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

describe("DELETE /families/:familyId/items/:itemId", () => {
  let app: FastifyInstance;
  let familyId: string;
  let itemId: string;
  let memberAuthorization: string;
  let familyRepository: InMemoryFamilyRepository;
  let financialItemRepository: InMemoryFinancialItemRepository;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    familyRepository = new InMemoryFamilyRepository();
    financialItemRepository = new InMemoryFinancialItemRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const item = FinancialItem.create({
      familyId: family.id,
      recordedBy: ownerId,
      amount: Money.of(5000, Currency.default()),
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

  test("elimina un movimiento para cualquier Member de la familia", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/items/${itemId}`,
      headers: { authorization: memberAuthorization },
    });
    assert.equal(response.statusCode, 204);

    const listResponse = await app.inject({
      method: "GET",
      url: `/families/${familyId}/items`,
      headers: { authorization: memberAuthorization },
    });
    assert.deepEqual(JSON.parse(listResponse.body), []);
  });

  test("oculta la existencia de un movimiento de otra familia", async () => {
    const jwtService = new FakeJwtService();
    const otherOwnerId = UserId.generate();
    const otherFamily = Family.create(FamilyName.of("Otra familia"), otherOwnerId);
    await familyRepository.save(otherFamily);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${otherFamily.id.toString()}/items/${itemId}`,
      headers: { authorization: `Bearer ${await jwtService.sign(otherOwnerId)}` },
    });

    assert.equal(response.statusCode, 404);
  });

  test("rechaza la eliminación sin token", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/items/${itemId}`,
    });

    assert.equal(response.statusCode, 401);
  });
});
