// tests/contexts/financial-tracking/http/get-financial-items.route.test.ts
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
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { TagId } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
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

describe("GET /families/:familyId/items", () => {
  let app: FastifyInstance;
  let familyId: string;
  let memberAuthorization: string;
  let expenseCategoryId: CategoryId;
  let expenseTagId: TagId;

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

    expenseCategoryId = CategoryId.generate();
    expenseTagId = TagId.generate();
    await financialItemRepository.save(
      FinancialItem.create({
        familyId: family.id,
        recordedBy: memberId,
        type: FinancialItemType.Expense,
        amount: Money.of(5000, Currency.default()),
        category: CategoryAssignment.of(expenseCategoryId, expenseTagId),
        title: Title.of("Supermercado"),
        occurredOn: TransactionDate.of(new Date("2026-08-01T12:00:00.000Z")),
      }),
    );
    await financialItemRepository.save(
      FinancialItem.create({
        familyId: family.id,
        recordedBy: ownerId,
        type: FinancialItemType.Income,
        amount: Money.of(500000, Currency.default()),
        category: CategoryAssignment.of(CategoryId.generate()),
        title: Title.of("Sueldo"),
        occurredOn: TransactionDate.of(new Date("2026-08-15T12:00:00.000Z")),
      }),
    );

    familyId = family.id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ financialItemRepository }),
    });
  });

  test("lista los movimientos de la familia para uno de sus miembros", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/items`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.length, 2);
    assert.equal(body[0].amount, 5000);
    assert.equal(body[0].currency, "CLP");
    assert.equal(body[0].categoryId, expenseCategoryId.toString());
    assert.equal(body[0].tagId, expenseTagId.toString());
    assert.equal(body[0].title, "Supermercado");
  });

  test("filtra por categoría, tag, tipo y período", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/items?categoryId=${expenseCategoryId.toString()}&tagId=${expenseTagId.toString()}&type=EXPENSE&from=2026-08-01T00:00:00.000Z&to=2026-08-10T00:00:00.000Z`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.length, 1);
    assert.equal(body[0].title, "Supermercado");
  });

  test("rechaza a quien no pertenece a la familia", async () => {
    const jwtService = new FakeJwtService();
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/items`,
      headers: { authorization: `Bearer ${await jwtService.sign(UserId.generate())}` },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza filtros de tipo inválidos", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/items?type=TRANSFER`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
