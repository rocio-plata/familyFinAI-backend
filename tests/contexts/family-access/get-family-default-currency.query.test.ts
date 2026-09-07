// tests/contexts/family-access/get-family-default-currency.query.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyDefaultCurrencyQuery } from "../../../src/contexts/family-access/application/queries/get-family-default-currency.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("GetFamilyDefaultCurrencyQuery", () => {
  test("devuelve la moneda configurada para la familia", async () => {
    const repository = new InMemoryFamilyRepository();
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.changeDefaultCurrency(Currency.of("USD"), ownerId);
    await repository.save(family);

    const query = new GetFamilyDefaultCurrencyQuery(repository);

    const currency = await query.execute({ familyId: family.id });

    assert.equal(currency.toString(), "USD");
  });

  test("rechaza si la familia no existe", async () => {
    const query = new GetFamilyDefaultCurrencyQuery(new InMemoryFamilyRepository());

    await assert.rejects(() => query.execute({ familyId: FamilyId.generate() }));
  });
});
