// tests/e2e/budgeting-lifecycle.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  budgetConfigurations,
  budgetPeriodStatuses,
} from "../../src/contexts/budgeting/infrastructure/persistence/schema.js";
import { families } from "../../src/contexts/family-access/infrastructure/persistence/schema.js";
import {
  categories,
  financialItems,
  paymentMethods,
} from "../../src/contexts/financial-tracking/infrastructure/persistence/schema.js";
import { users } from "../../src/contexts/identity/infrastructure/persistence/schema.js";
import {
  categoryPeriodAggregates,
  paymentMethodPeriodAggregates,
} from "../../src/contexts/reporting/infrastructure/persistence/schema.js";
import { refreshTokens } from "../../src/platform/auth/schema.js";
import { db, pool } from "../../src/platform/db/connection.js";
import { buildE2eApp } from "./build-e2e-app.js";

// Requiere DATABASE_URL apuntando a un Postgres real con la migración aplicada
// (ver `npm run db:reset`). Se salta automáticamente si no está configurada.
const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

describe("Flujo E2E: presupuesto reacciona a movimientos vía EventBus", () => {
  test("crear, actualizar y borrar un movimiento actualiza BudgetPeriodStatus", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const email = `e2e-budget-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "Sup3rSecreta!", displayName: "Persona Budget E2E" },
      });
      assert.equal(registerResponse.statusCode, 201);
      const { accessToken, defaultFamilyId, userId } = registerResponse.json();
      createdUserIds.push(userId);
      createdFamilyIds.push(defaultFamilyId);
      const authHeader = { authorization: `Bearer ${accessToken}` };

      const categoryResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/categories`,
        headers: authHeader,
        payload: { type: "EXPENSE", name: "Comida Budget" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const categoryId = categoryResponse.json().id;

      const paymentMethodResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/payment-methods`,
        headers: authHeader,
        payload: { name: "Débito Budget" },
      });
      assert.equal(paymentMethodResponse.statusCode, 201);
      const paymentMethodId = paymentMethodResponse.json().id;

      const budgetResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/budgets`,
        headers: authHeader,
        payload: { categoryId, amount: 100000 },
      });
      assert.equal(budgetResponse.statusCode, 201);

      const period = "2026-05";
      const occurredOn = "2026-05-10T12:00:00.000Z";

      const createItemResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/items`,
        headers: authHeader,
        payload: { amount: 30000, categoryId, paymentMethodId, title: "Supermercado", occurredOn },
      });
      assert.equal(createItemResponse.statusCode, 201);
      const itemId = createItemResponse.json().id;

      const budgetsAfterCreate = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/budgets?period=${period}`,
        headers: authHeader,
      });
      const entryAfterCreate = budgetsAfterCreate
        .json()
        .find((entry: { categoryId: string }) => entry.categoryId === categoryId);
      assert.equal(entryAfterCreate?.spent.amount, 30000);
      assert.equal(entryAfterCreate?.remaining.amount, 70000);
      assert.equal(entryAfterCreate?.isOverspent, false);

      const updateItemResponse = await app.inject({
        method: "PATCH",
        url: `/families/${defaultFamilyId}/items/${itemId}`,
        headers: authHeader,
        payload: { amount: 150000, currency: "CLP" },
      });
      assert.equal(updateItemResponse.statusCode, 200);

      const budgetsAfterUpdate = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/budgets?period=${period}`,
        headers: authHeader,
      });
      const entryAfterUpdate = budgetsAfterUpdate
        .json()
        .find((entry: { categoryId: string }) => entry.categoryId === categoryId);
      assert.equal(entryAfterUpdate?.spent.amount, 150000);
      assert.equal(entryAfterUpdate?.isOverspent, true);

      const deleteItemResponse = await app.inject({
        method: "DELETE",
        url: `/families/${defaultFamilyId}/items/${itemId}`,
        headers: authHeader,
      });
      assert.equal(deleteItemResponse.statusCode, 204);

      const budgetsAfterDelete = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/budgets?period=${period}`,
        headers: authHeader,
      });
      const entryAfterDelete = budgetsAfterDelete
        .json()
        .find((entry: { categoryId: string }) => entry.categoryId === categoryId);
      assert.equal(entryAfterDelete?.spent.amount ?? 0, 0);
      assert.equal(entryAfterDelete?.isOverspent ?? false, false);
    } finally {
      for (const familyId of createdFamilyIds) {
        await db.delete(financialItems).where(eq(financialItems.familyId, familyId));
        await db.delete(budgetPeriodStatuses).where(eq(budgetPeriodStatuses.familyId, familyId));
        await db.delete(budgetConfigurations).where(eq(budgetConfigurations.familyId, familyId));
        await db
          .delete(categoryPeriodAggregates)
          .where(eq(categoryPeriodAggregates.familyId, familyId));
        await db
          .delete(paymentMethodPeriodAggregates)
          .where(eq(paymentMethodPeriodAggregates.familyId, familyId));
        await db.delete(categories).where(eq(categories.familyId, familyId));
        await db.delete(paymentMethods).where(eq(paymentMethods.familyId, familyId));
        await db.delete(families).where(eq(families.id, familyId));
      }
      for (const userId of createdUserIds) {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
      }
    }
  });
});

after(async () => {
  if (!hasDatabase) return;
  await pool.end();
});
