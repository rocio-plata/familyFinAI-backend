// tests/e2e/reporting-dashboard.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { families } from "../../src/contexts/family-access/infrastructure/persistence/schema.js";
import {
  categories,
  financialItems,
  paymentMethods,
  userPaymentMethodPreferences,
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

describe("Flujo E2E: dashboard, tendencia y comparación de períodos", () => {
  test("movimientos en dos períodos distintos se reflejan en trend, comparison y dashboard", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const email = `e2e-report-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "Sup3rSecreta!", displayName: "Persona Report E2E" },
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
        payload: { type: "EXPENSE", name: "Comida Report" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const categoryId = categoryResponse.json().id;

      const createItem = async (amount: number, occurredOn: string) => {
        const response = await app.inject({
          method: "POST",
          url: `/families/${defaultFamilyId}/items`,
          headers: authHeader,
          payload: { amount, categoryId, title: "Gasto", occurredOn },
        });
        assert.equal(response.statusCode, 201);
      };

      await createItem(10000, "2026-01-15T12:00:00.000Z");
      await createItem(25000, "2026-02-15T12:00:00.000Z");

      const trendResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/reports/trend?fromPeriod=2026-01&toPeriod=2026-02`,
        headers: authHeader,
      });
      assert.equal(trendResponse.statusCode, 200);
      const trend = trendResponse.json() as {
        period: string;
        totalExpenses: { amount: number };
      }[];
      assert.equal(trend.find((point) => point.period === "2026-01")?.totalExpenses.amount, 10000);
      assert.equal(trend.find((point) => point.period === "2026-02")?.totalExpenses.amount, 25000);

      const comparisonResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/reports/comparison?periodA=2026-01&periodB=2026-02&categoryId=${categoryId}`,
        headers: authHeader,
      });
      assert.equal(comparisonResponse.statusCode, 200);
      const comparison = comparisonResponse.json();
      assert.equal(comparison.periodA.totalExpenses.amount, 10000);
      assert.equal(comparison.periodB.totalExpenses.amount, 25000);
      assert.equal(comparison.expenseVariation.absolute, 15000);
      assert.equal(comparison.expenseVariation.percentage, 150);

      const dashboardResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/dashboard?period=2026-02`,
        headers: authHeader,
      });
      assert.equal(dashboardResponse.statusCode, 200);
      const dashboard = dashboardResponse.json();
      assert.equal(dashboard.totalExpenses.amount, 25000);
      const categoryEntry = dashboard.categoryBreakdown.find(
        (entry: { categoryId: string }) => entry.categoryId === categoryId,
      );
      assert.equal(categoryEntry?.totalExpense.amount, 25000);
      assert.equal(categoryEntry?.percentage, 100);
    } finally {
      for (const familyId of createdFamilyIds) {
        await db.delete(financialItems).where(eq(financialItems.familyId, familyId));
        await db
          .delete(categoryPeriodAggregates)
          .where(eq(categoryPeriodAggregates.familyId, familyId));
        await db
          .delete(paymentMethodPeriodAggregates)
          .where(eq(paymentMethodPeriodAggregates.familyId, familyId));
        await db.delete(categories).where(eq(categories.familyId, familyId));
        await db
          .delete(userPaymentMethodPreferences)
          .where(eq(userPaymentMethodPreferences.familyId, familyId));
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
